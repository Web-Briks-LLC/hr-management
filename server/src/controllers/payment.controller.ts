import { type Request, type Response } from "express";
import Stripe from "stripe";
import { InvoiceRecord } from "../models/invoice-record.model.js";
import EarningModel from "../models/earning.model.js";

// Initialize Stripe gracefully, so the server doesn't crash if the key is missing in some environments
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2026-01-28.clover", // Use the latest compatible API version
});

export const createPaymentIntent = async (
    req: Request,
    res: Response,
): Promise<any> => {
    try {
        const { amount, currency, invoiceNumber, clientName } = req.body;

        if (!amount || !currency) {
            return res
                .status(400)
                .json({ error: "Amount and currency are required" });
        }

        if (!process.env.STRIPE_SECRET_KEY) {
            console.error("Stripe Secret Key is missing in server/.env");
            return res
                .status(500)
                .json({ error: "Payment gateway is not configured properly" });
        }

        // Create a PaymentIntent with the order amount and currency
        // Stripe requires the amount to be in the smallest currency unit (e.g., cents)
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert standard amount (e.g., 50.50) to integer cents (5050)
            currency: currency.toLowerCase(),
            // In the latest API, automatic_payment_methods is enabled by default.
            // It allows Stripe to offer Apple Pay, Google Pay, etc., automatically based on browser support.
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                invoiceNumber: invoiceNumber || "N/A",
                clientName: clientName || "N/A",
            },
        });

        res.status(200).json({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (error: any) {
        console.error("Stripe Payment Intent Error:", error);
        res.status(500).json({
            error: error.message || "Failed to create payment intent",
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
                .json({ error: "Invoice number is required" });
        }

        console.log(
            `[Payment] Confirming payment for Invoice: ${invoiceNumber}`,
        );

        // 1. Find the invoice record
        const invoice = await InvoiceRecord.findOne({ invoiceNumber });

        if (!invoice) {
            return res.status(404).json({ error: "Invoice record not found" });
        }

        // 2. Perform validation if gateway IDs are provided
        let verified = true;

        if (paymentIntentId && process.env.STRIPE_SECRET_KEY) {
            try {
                const intent =
                    await stripe.paymentIntents.retrieve(paymentIntentId);
                if (intent.status !== "succeeded") {
                    verified = false;
                    console.warn(
                        `[Payment] Stripe Intent ${paymentIntentId} not succeeded: ${intent.status}`,
                    );
                }
            } catch (err) {
                console.error("[Payment] Error retrieving Stripe intent:", err);
            }
        }

        // 3. Update the database status
        if (verified) {
            invoice.paymentStatus = "paid";
            await invoice.save();
            console.log(`[Payment] Invoice ${invoiceNumber} marked as PAID`);

            // 4. Update corresponding Earning record if billing period info exists
            if (invoice.clientId && invoice.month && invoice.year) {
                try {
                    const statusNotes =
                        `Paid via Invoice #${invoiceNumber}` +
                        (paymentIntentId
                            ? ` | Stripe: ${paymentIntentId}`
                            : "") +
                        (paypalOrderId ? ` | PayPal: ${paypalOrderId}` : "");

                    const updatedEarning = await EarningModel.findOneAndUpdate(
                        {
                            clientId: invoice.clientId,
                            month: invoice.month,
                            year: invoice.year,
                        },
                        {
                            $set: {
                                status: "paid",
                                paidAt: new Date(),
                                notes: statusNotes,
                            },
                        },
                        { new: true },
                    );

                    if (updatedEarning) {
                        console.log(
                            `[Payment] Earning for client ${invoice.clientName} (${invoice.month}/${invoice.year}) marked as PAID`,
                        );
                    } else {
                        console.warn(
                            `[Payment] No matching Earning record found for Invoice ${invoiceNumber} (Client: ${invoice.clientId}, Period: ${invoice.month}/${invoice.year})`,
                        );
                    }
                } catch (err) {
                    console.error(
                        "[Payment] Error updating Earning record:",
                        err,
                    );
                }
            }

            return res.status(200).json({
                success: true,
                message: "Payment confirmed and records updated",
            });
        } else {
            return res.status(400).json({
                error: "Payment verification failed",
            });
        }
    } catch (error: any) {
        console.error("Payment Confirmation Error:", error);
        res.status(500).json({
            error: error.message || "Failed to confirm payment",
        });
    }
};
