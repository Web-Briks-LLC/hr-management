import mongoose from 'mongoose';
import { type Request, type Response } from 'express';
import Stripe from 'stripe';
import { render } from '@react-email/render';
import { sendMail } from '../lib/nodemailer.js';
import PaymentReceiptEmail from '../emails/PaymentReceipt.js';
import { InvoiceRecord } from '../models/invoice-record.model.js';
import EarningModel from '../models/earning.model.js';
import ClientModel from '../models/client.model.js';
import notificationService from '../services/notification.service.js';

// Initialize Stripe gracefully
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2026-01-28.clover' as any,
});

/**
 * Get a PayPal access token
 */
const getPayPalAccessToken = async (): Promise<string> => {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        throw new Error('PayPal credentials are not configured');
    }

    const baseUrl =
        process.env.PAYPAL_MODE === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';

    const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    });

    const data: any = await res.json();
    if (!res.ok) {
        throw new Error(
            `PayPal auth failed: ${data.error_description || 'Unknown error'}`,
        );
    }
    return data.access_token;
};

/**
 * Confirm Payment Controller with Atomic Transactions
 */
export const confirmPayment = async (
    req: Request,
    res: Response,
): Promise<any> => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { invoiceNumber, paymentIntentId, paypalOrderId } = req.body;

        if (!invoiceNumber) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ error: 'Invoice number is required' });
        }

        if (!paymentIntentId && !paypalOrderId) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ error: 'Payment gateway reference is required' });
        }

        console.log(`[Payment] Confirming payment for Invoice: ${invoiceNumber}`);

        // 1. Find the invoice with session
        const invoice = await InvoiceRecord.findOne({ invoiceNumber }).session(session);

        if (!invoice) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Invoice not found' });
        }

        if (invoice.paymentStatus === 'paid') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ error: 'Invoice is already paid' });
        }

        let verified = false;

        // 2. Verify with gateway
        if (paymentIntentId) {
            try {
                const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
                if (paymentIntent.status === 'succeeded') {
                    // Check if intent belongs to this invoice
                    if (paymentIntent.metadata.invoiceNumber !== invoiceNumber) {
                        console.error(`[Payment] STRIPE INVOICE MISMATCH: ${paymentIntentId}`);
                        await session.abortTransaction();
                        session.endSession();
                        return res.status(400).json({ error: 'Payment reference does not match this invoice' });
                    }
                    verified = true;
                }
            } catch (err) {
                console.error('[Payment] Stripe verification error:', err);
                await session.abortTransaction();
                session.endSession();
                return res.status(500).json({ error: 'Stripe verification failed' });
            }
        } else if (paypalOrderId) {
            try {
                const accessToken = await getPayPalAccessToken();
                const baseUrl = process.env.PAYPAL_MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
                
                const orderRes = await fetch(`${baseUrl}/v2/checkout/orders/${paypalOrderId}`, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                const order: any = await orderRes.json();
                
                if (order.status === 'COMPLETED') {
                    const purchaseUnit = order.purchase_units?.[0];
                    const paidAmount = purchaseUnit?.amount?.value ? parseFloat(purchaseUnit.amount.value) : 0;
                    
                    if (paidAmount < invoice.totalAmount - 0.01) {
                        console.error(`[Payment] PAYPAL AMOUNT MISMATCH: Expected ${invoice.totalAmount}, got ${paidAmount}`);
                        await session.abortTransaction();
                        session.endSession();
                        return res.status(400).json({ error: 'Payment amount mismatch' });
                    }
                    
                    if (String(purchaseUnit?.reference_id) !== String(invoiceNumber)) {
                        console.error(`[Payment] PAYPAL INVOICE MISMATCH: ${paypalOrderId}`);
                        await session.abortTransaction();
                        session.endSession();
                        return res.status(400).json({ error: 'Payment reference mismatch' });
                    }
                    verified = true;
                }
            } catch (err) {
                console.error('[Payment] PayPal verification error:', err);
                await session.abortTransaction();
                session.endSession();
                return res.status(500).json({ error: 'PayPal verification failed' });
            }
        }

        if (verified) {
            // 3. Mark Invoice as Paid
            invoice.paymentStatus = 'paid';
            invoice.paymentToken = paymentIntentId || paypalOrderId;
            await invoice.save({ session });

            // 4. Update Earning Record
            const client = invoice.clientId ? await ClientModel.findOne({ clientId: invoice.clientId }).session(session) : null;
            
            if (client && invoice.month && invoice.year) {
                // Find or Create earning for that specific month/year (Strict Monthly Isolation)
                let earning = await EarningModel.findOne({
                    clientId: client._id,
                    month: invoice.month,
                    year: invoice.year,
                }).session(session);

                if (!earning) {
                    earning = new EarningModel({
                        clientId: client._id,
                        month: invoice.month,
                        year: invoice.year,
                        totalAmount: invoice.totalAmount,
                        currency: invoice.currency,
                        status: 'unpaid',
                        isLegacy: false,
                        createdBy: client.createdBy || '659696956565656565656565',
                    });
                    await (earning as any).save({ session });
                }

                const conversionRate = (earning as any).conversionRate || 120;
                const { default: earningService } = await import("../services/earning.service.js");

                await earningService.withdrawEarning((earning as any)._id.toString(), {
                    amount: invoice.totalAmount,
                    method: paymentIntentId ? 'Stripe' : 'PayPal',
                    invoiceNumber: invoice.invoiceNumber,
                    transactionId: paymentIntentId || paypalOrderId || `WB-PAY-${Date.now()}`,
                    conversionRate: conversionRate,
                    notes: `Automated payment for Invoice ${invoice.invoiceNumber}`,
                    paidBy: (client.createdBy || '659696956565656565656565').toString(),
                }, session);
            }

            await session.commitTransaction();
            session.endSession();

            // 5. Async Post-payment actions (Email/Notifications)
            // Done outside of transaction since they are not reversible and shouldn't block DB success
            (async () => {
                try {
                    if (client && (invoice.clientEmail || client.emails?.length > 0)) {
                        const recipient = invoice.clientEmail || client.emails[0];
                        const emailHtml = await render(PaymentReceiptEmail({
                            clientName: client.name || invoice.clientName,
                            invoiceNumber: invoice.invoiceNumber,
                            amountPaidCurrency: invoice.currency,
                            amountPaidValue: invoice.totalAmount,
                            amountPaidBDT: invoice.totalAmount * (invoice.currency === 'BDT' ? 1 : 120),
                            referenceId: paymentIntentId || paypalOrderId || 'SUCCESS',
                            paymentGateway: paymentIntentId ? 'Stripe' : 'PayPal',
                            date: new Date(),
                        }));
                        
                        await sendMail({
                            to: recipient as string,
                            subject: `Receipt for Invoice #${invoice.invoiceNumber} - Web Briks`,
                            body: emailHtml,
                            fromName: 'Payment - Web Briks',
                        });
                    }
                    
                    if (client) {
                        await notificationService.notifyAdminsPaymentReceived({
                            clientName: invoice.clientName,
                            invoiceNumber: invoice.invoiceNumber,
                            amount: invoice.totalAmount,
                            currency: invoice.currency,
                            clientUserId: client._id,
                        });
                    }
                } catch (err) {
                    console.error('[Payment] Background tasks error:', err);
                }
            })();

            return res.status(200).json({ success: true, message: 'Payment confirmed' });
        } else {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ error: 'Payment verification failed' });
        }
    } catch (error: any) {
        if (session.inTransaction()) await session.abortTransaction();
        session.endSession();
        console.error('[Payment] Fatal Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
