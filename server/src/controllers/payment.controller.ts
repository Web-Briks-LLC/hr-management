import { type Request, type Response } from 'express';
import Stripe from 'stripe';
import { render } from '@react-email/render';
import { sendMail } from '../lib/nodemailer.js';
import emailService from '../services/email.service.js';
import PaymentReceiptEmail from '../emails/PaymentReceipt.js';
import { InvoiceRecord } from '../models/invoice-record.model.js';
import EarningModel from '../models/earning.model.js';
import ClientModel from '../models/client.model.js';
import notificationService from '../services/notification.service.js';

// Initialize Stripe gracefully, so the server doesn't crash if the key is missing in some environments
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2026-01-28.clover', // Use the latest compatible API version
});

/**
 * Get a PayPal access token using client credentials.
 * Used for server-side order verification.
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
 * Helper: Get the PayPal API base URL based on mode.
 */
const getPayPalBaseUrl = (): string =>
    process.env.PAYPAL_MODE === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

/**
 * SECURITY FIX: createPaymentIntent now looks up the invoice amount from the database
 * instead of trusting the client-supplied amount.
 */
export const createPaymentIntent = async (
    req: Request,
    res: Response,
): Promise<any> => {
    try {
        const { invoiceNumber, currency } = req.body;

        if (!invoiceNumber) {
            return res
                .status(400)
                .json({ error: 'Invoice number is required' });
        }

        if (!process.env.STRIPE_SECRET_KEY) {
            console.error('Stripe Secret Key is missing in server/.env');
            return res
                .status(500)
                .json({ error: 'Payment gateway is not configured properly' });
        }

        // SECURITY: Look up the actual invoice amount from the database
        const invoice = await InvoiceRecord.findOne({
            invoiceNumber: String(invoiceNumber),
        });

        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        if (invoice.paymentStatus === 'paid') {
            return res.status(400).json({
                error: 'This invoice has already been paid',
                alreadyPaid: true,
            });
        }

        const amount = invoice.totalAmount;
        const invoiceCurrency = currency || invoice.currency || 'USD';

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid invoice amount' });
        }

        // Create a PaymentIntent with the VERIFIED amount from the database
        // Stripe requires the amount to be in the smallest currency unit (e.g., cents)
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert standard amount (e.g., 50.50) to integer cents (5050)
            currency: invoiceCurrency.toLowerCase(),
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                invoiceNumber: invoiceNumber,
                clientName: invoice.clientName || 'N/A',
                expectedAmount: String(amount), // Store expected amount for verification
            },
        });

        // SECURITY: Store the payment intent ID on the invoice for later verification
        await InvoiceRecord.findOneAndUpdate(
            { invoiceNumber: String(invoiceNumber) },
            { $set: { pendingPaymentIntentId: paymentIntent.id } },
        );

        res.status(200).json({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (error: any) {
        console.error('Stripe Payment Intent Error:', error);
        res.status(500).json({
            error: error.message || 'Failed to create payment intent',
        });
    }
};

export const confirmPayment = async (
    req: Request,
    res: Response,
): Promise<any> => {
    try {
        const { invoiceNumber, paymentIntentId, paypalOrderId } = req.body;

        if (!invoiceNumber) {
            return res
                .status(400)
                .json({ error: 'Invoice number is required' });
        }

        // Require at least one gateway reference
        if (!paymentIntentId && !paypalOrderId) {
            return res
                .status(400)
                .json({ error: 'Payment gateway reference is required' });
        }

        console.log(
            `[Payment] Confirming payment for Invoice: ${invoiceNumber}`,
        );

        // 1. Find the invoice record
        const invoice = await InvoiceRecord.findOne({ invoiceNumber });

        if (!invoice) {
            return res.status(404).json({ error: 'Invoice record not found' });
        }

        // 1b. DUPLICATE PAYMENT GUARD — prevent re-processing already-paid invoices
        if (invoice.paymentStatus === 'paid') {
            console.log(
                `[Payment] Invoice ${invoiceNumber} is already paid. Skipping.`,
            );
            return res.status(200).json({
                success: true,
                message: 'Invoice has already been paid',
                alreadyPaid: true,
            });
        }

        // 2. Perform server-side verification with the payment gateway
        let verified = false;

        if (paymentIntentId && process.env.STRIPE_SECRET_KEY) {
            try {
                const intent =
                    await stripe.paymentIntents.retrieve(paymentIntentId);

                if (intent.status === 'succeeded') {
                    // SECURITY: Verify the paid amount matches the invoice amount
                    const paidAmountCents = intent.amount;
                    const expectedAmountCents = Math.round(
                        invoice.totalAmount * 100,
                    );

                    if (paidAmountCents < expectedAmountCents) {
                        console.error(
                            `[Payment] AMOUNT MISMATCH for Invoice ${invoiceNumber}: ` +
                                `Paid ${paidAmountCents} cents but expected ${expectedAmountCents} cents`,
                        );
                        return res.status(400).json({
                            error: 'Payment amount does not match invoice amount',
                        });
                    }

                    // SECURITY: Verify the payment intent was created for THIS invoice
                    // Must strictly match, do not allow bypass if metadata is missing
                    const intentInvoiceStr = String(
                        intent.metadata?.invoiceNumber || '',
                    );
                    const reqInvoiceStr = String(invoiceNumber);

                    if (intentInvoiceStr !== reqInvoiceStr) {
                        console.error(
                            `[Payment] INVOICE MISMATCH: Intent ${paymentIntentId} was created for ` +
                                `invoice '${intentInvoiceStr}' but confirm was called for '${reqInvoiceStr}'`,
                        );
                        return res.status(400).json({
                            error: 'Payment reference does not match this invoice',
                        });
                    }

                    verified = true;
                } else {
                    console.warn(
                        `[Payment] Stripe Intent ${paymentIntentId} not succeeded: ${intent.status}`,
                    );
                }
            } catch (err) {
                console.error('[Payment] Error retrieving Stripe intent:', err);
            }
        } else if (paypalOrderId) {
            // SERVER-SIDE PAYPAL VERIFICATION
            try {
                const accessToken = await getPayPalAccessToken();
                const baseUrl = getPayPalBaseUrl();

                const orderRes = await fetch(
                    `${baseUrl}/v2/checkout/orders/${paypalOrderId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                    },
                );

                const order: any = await orderRes.json();
                console.log(`[Payment] PayPal Order Status: ${order.status}`);
                if (order.status === 'COMPLETED') {
                    // SECURITY: Verify PayPal paid amount matches invoice amount
                    const purchaseUnit = order.purchase_units?.[0];
                    const paidAmount = purchaseUnit?.amount?.value
                        ? parseFloat(purchaseUnit.amount.value)
                        : 0;

                    console.log(`[Payment] Paid: ${paidAmount}, Expected: ${invoice.totalAmount}`);

                    if (paidAmount < invoice.totalAmount) {
                        console.error(
                            `[Payment] PAYPAL AMOUNT MISMATCH for Invoice ${invoiceNumber}: ` +
                                `Paid ${paidAmount} but expected ${invoice.totalAmount}`,
                        );
                        return res.status(400).json({
                            error: 'Payment amount does not match invoice amount',
                        });
                    }

                    // SECURITY: Verify the PayPal order was for THIS invoice
                    // Must strictly match, do not allow bypass if reference_id is missing
                    const referenceIdStr = String(
                        purchaseUnit?.reference_id || '',
                    );
                    const reqInvoiceStr = String(invoiceNumber);

                    console.log(`[Payment] RefID: ${referenceIdStr}, ReqInvoice: ${reqInvoiceStr}`);

                    if (referenceIdStr !== reqInvoiceStr) {
                        console.error(
                            `[Payment] PAYPAL INVOICE MISMATCH: Order ${paypalOrderId} ` +
                                `reference_id is '${referenceIdStr}' but expected '${reqInvoiceStr}'`,
                        );
                        return res.status(400).json({
                            error: 'Payment reference does not match this invoice',
                        });
                    }

                    verified = true;
                } else {
                    console.warn(
                        `[Payment] PayPal Order ${paypalOrderId} not completed: ${order.status}. Order data:`, JSON.stringify(order, null, 2)
                    );
                }
            } catch (err) {
                console.error('[Payment] Error verifying PayPal order:', err);
                return res.status(500).json({ error: 'Internal server error during verification' });
            }
        }

        // 3. Update the database status
        if (verified) {
            invoice.paymentStatus = 'paid';
            // Store gateway reference for audit trail
            invoice.paymentToken = paymentIntentId || paypalOrderId;
            await invoice.save();
            console.log(`[Payment] Invoice ${invoiceNumber} marked as PAID`);

            // Look up the client once and reuse across steps 4, 5, and 6
            const client = invoice.clientId
                ? await ClientModel.findOne({ clientId: invoice.clientId })
                : null;

            // 4. Update corresponding Earning record if billing period info exists
            if (client && invoice.month && invoice.year) {
                try {
                    const conversionRate = 0;
                    const amountInBDT = 0;

                    const statusNotes =
                        `Paid via Invoice #${invoiceNumber}` +
                        (paymentIntentId
                            ? ` | Stripe: ${paymentIntentId}`
                            : '') +
                        (paypalOrderId ? ` | PayPal: ${paypalOrderId}` : '');

                    const updatedEarning = await EarningModel.findOneAndUpdate(
                        {
                            clientId: client._id,
                            month: invoice.month,
                            year: invoice.year,
                        },
                        {
                            $set: {
                                status: 'paid',
                                paidAt: new Date(),
                                notes: statusNotes,
                                conversionRate: conversionRate,
                                amountInBDT: amountInBDT,
                            },
                        },
                        { new: true },
                    );

                    if (updatedEarning) {
                        console.log(
                            `[Payment] Earning for client ${invoice.clientName} (${invoice.month}/${invoice.year}) updated with BDT ${amountInBDT}`,
                        );
                    } else {
                        console.warn(
                            `[Payment] No matching Earning record found for Invoice ${invoiceNumber}. Creating a new record.`,
                        );
                        const newEarning = new EarningModel({
                            clientId: client._id,
                            month: invoice.month,
                            year: invoice.year,
                            imageQty: invoice.totalImages || 0,
                            totalAmount: invoice.totalAmount,
                            currency: invoice.currency,
                            fees: 0,
                            tax: 0,
                            conversionRate: conversionRate,
                            netAmount: invoice.totalAmount,
                            amountInBDT: amountInBDT,
                            status: 'paid',
                            paidAt: new Date(),
                            notes:
                                statusNotes + ' (Auto-generated from Payment)',
                            isLegacy: false,
                            createdBy: client.createdBy,
                        });

                        await newEarning.save();
                        console.log(
                            `[Payment] Created missing Earning for client ${invoice.clientName} (${invoice.month}/${invoice.year}) with BDT ${amountInBDT}`,
                        );
                    }
                } catch (err) {
                    console.error(
                        '[Payment] Error updating Earning record:',
                        err,
                    );
                }
            }

            // 5. Send Payment Receipt Email via React Email to the Client
            if (client && client.emails?.length > 0) {
                try {
                    const amountInBDT = invoice.totalAmount * 120; // Fallback estimate
                    const paymentGateway = paymentIntentId
                        ? 'Stripe'
                        : paypalOrderId
                          ? 'PayPal'
                          : 'Other';
                    const referenceId =
                        paymentIntentId || paypalOrderId || 'WB-PAY-SUCCESS';

                    let earning = null;
                    if (invoice.month && invoice.year) {
                        earning = await EarningModel.findOne({
                            clientId: client._id,
                            month: invoice.month as number,
                            year: invoice.year as number,
                        });
                    }

                    const finalAmountBDT = earning?.amountInBDT || amountInBDT;

                    console.log(
                        `[Payment] Rendering Receipt Email for ${client.emails[0]}`,
                    );

                    const emailHtml = await render(
                        PaymentReceiptEmail({
                            clientName: client.name || invoice.clientName,
                            invoiceNumber: invoice.invoiceNumber,
                            amountPaidCurrency: invoice.currency,
                            amountPaidValue: invoice.totalAmount,
                            amountPaidBDT: finalAmountBDT,
                            referenceId: referenceId,
                            paymentGateway: paymentGateway,
                            date: new Date(),
                        }),
                    );

                    const recipientEmail = (invoice.clientEmail || (client.emails[0] as string));

                    await sendMail({
                        to: recipientEmail,
                        subject: `Receipt for Invoice #${invoice.invoiceNumber} - Web Briks`,
                        body: emailHtml,
                        fromName: 'Payment - Web Briks',
                    });
                    console.log(
                        `[Payment] Receipt emailed to ${recipientEmail}`,
                    );
                } catch (emailErr) {
                    console.error(
                        '[Payment] Failed to send receipt email:',
                        emailErr,
                    );
                }
            } else if (invoice.clientId) {
                console.warn(
                    `[Payment] Client ${invoice.clientId} has no email address. Skipping receipt.`,
                );
            }

            // 6. Notify Admins via In-App and Email
            try {
                if (client) {
                    await notificationService.notifyAdminsPaymentReceived({
                        clientName: invoice.clientName,
                        invoiceNumber: invoice.invoiceNumber,
                        amount: invoice.totalAmount,
                        currency: invoice.currency,
                        clientUserId: client._id,
                    });
                }

                const adminEmail = process.env.SMTP_USER;

                if (adminEmail) {
                    await emailService.sendAdminPaymentEmail({
                        to: adminEmail,
                        clientName: invoice.clientName,
                        invoiceNumber: invoice.invoiceNumber,
                        amount: invoice.totalAmount,
                        currency: invoice.currency,
                        earningsUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/earnings`,
                    });
                    console.log(
                        `[Payment] Admin notification email sent to ${adminEmail}.`,
                    );
                }
            } catch (adminNotifyErr) {
                console.error(
                    '[Payment] Failed to notify admins:',
                    adminNotifyErr,
                );
            }

            return res.status(200).json({
                success: true,
                message: 'Payment confirmed and records updated',
            });
        } else {
            return res.status(400).json({
                error: 'Payment verification failed',
            });
        }
    } catch (error: any) {
        console.error('Payment Confirmation Error:', error);
        res.status(500).json({
            error: error.message || 'Failed to confirm payment',
        });
    }
};
