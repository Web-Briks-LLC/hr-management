import { type Request, type Response } from "express";
import Stripe from "stripe";
import { render } from "@react-email/render";
import { sendMail } from "../lib/nodemailer.js";
import PaymentReceiptEmail from "../emails/PaymentReceipt.js";
import { InvoiceRecord } from "../models/invoice-record.model.js";
import EarningModel from "../models/earning.model.js";
import ClientModel from "../models/client.model.js";
import UserModel from "../models/user.model.js";
import notificationService from "../services/notification.service.js";

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
                    const conversionRate = 0;
                    const amountInBDT = 0;

                    const statusNotes =
                        `Paid via Invoice #${invoiceNumber}` +
                        (paymentIntentId
                            ? ` | Stripe: ${paymentIntentId}`
                            : "") +
                        (paypalOrderId ? ` | PayPal: ${paypalOrderId}` : "");

                    const client = await ClientModel.findOne({
                        clientId: invoice.clientId,
                    });

                    if (!client) {
                        console.error(
                            `[Payment] Client not found with clientId: ${invoice.clientId}`,
                        );
                        return res
                            .status(404)
                            .json({ error: "Client not found" });
                    }

                    const updatedEarning = await EarningModel.findOneAndUpdate(
                        {
                            clientId: client._id,
                            month: invoice.month,
                            year: invoice.year,
                        },
                        {
                            $set: {
                                status: "paid",
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
                            `[Payment] No matching Earning record found for Invoice ${invoiceNumber}. Creating a new record recursively.`,
                        );
                        // If no earning record exists, let's auto-generate one to ensure we don't lose track
                        // of this payment.
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
                            status: "paid",
                            paidAt: new Date(),
                            notes:
                                statusNotes + " (Auto-generated from Payment)",
                            isLegacy: false,
                            createdBy: client.createdBy, // We can attribute the creation to the user who created the client
                        });

                        await newEarning.save();
                        console.log(
                            `[Payment] Created missing Earning for client ${invoice.clientName} (${invoice.month}/${invoice.year}) with BDT ${amountInBDT}`,
                        );
                    }
                } catch (err) {
                    console.error(
                        "[Payment] Error updating Earning record:",
                        err,
                    );
                }
            }

            // 5. Send Payment Receipt Email via React Email to the Client
            if (invoice.clientId) {
                try {
                    const client = await ClientModel.findOne({
                        clientId: invoice.clientId,
                    });
                    if (client && client.email) {
                        const amountInBDT = invoice.totalAmount * 120; // Fallback to 120 just locally scope
                        const paymentGateway = paymentIntentId
                            ? "Stripe"
                            : paypalOrderId
                              ? "PayPal"
                              : "Other";
                        const referenceId =
                            paymentIntentId ||
                            paypalOrderId ||
                            "WB-PAY-SUCCESS";

                        let earning = null;
                        if (invoice.month && invoice.year) {
                            earning = await EarningModel.findOne({
                                clientId: client._id,
                                month: invoice.month as number,
                                year: invoice.year as number,
                            });
                        }

                        const finalAmountBDT =
                            earning?.amountInBDT || amountInBDT;

                        console.log(
                            `[Payment] Rendering Receipt Email for ${client.email}`,
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

                        await sendMail({
                            to: client.email,
                            subject: `Receipt for Invoice #${invoice.invoiceNumber} - Web Briks LLC`,
                            body: emailHtml,
                        });
                        console.log(
                            `[Payment] Receipt emailed to ${client.email}`,
                        );
                    } else {
                        console.warn(
                            `[Payment] Client ${invoice.clientId} has no email address. Skipping receipt.`,
                        );
                    }
                } catch (emailErr) {
                    console.error(
                        "[Payment] Failed to send receipt email:",
                        emailErr,
                    );
                }
            }

            // 6. Notify Admins via In-App and Email
            try {
                const client = await ClientModel.findOne({
                    clientId: invoice.clientId,
                });

                if (client) {
                    await notificationService.notifyAdminsPaymentReceived({
                        clientName: invoice.clientName,
                        invoiceNumber: invoice.invoiceNumber,
                        amount: invoice.totalAmount,
                        currency: invoice.currency,
                        clientUserId: client._id,
                    });

                    const admins = await UserModel.find({
                        role: {
                            $in: [
                                "super_admin",
                                "admin",
                                "hr_manager",
                                "owner",
                            ],
                        },
                    }).toArray();

                    const adminEmails = admins
                        .map((a: any) => a.email)
                        .filter(Boolean);

                    if (adminEmails.length > 0) {
                        const adminEmailHtml = `
                            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                                <h2>Payment Received</h2>
                                <p>Client <strong>${invoice.clientName}</strong> has successfully paid <strong>${invoice.totalAmount} ${invoice.currency}</strong> for Invoice #${invoice.invoiceNumber}.</p>
                                <p>This earning is now marked as "Paid" but unconverted. Please log in to the admin dashboard, navigate to the Earnings section, and use the "Convert" action to apply the correct BDT exchange rate.</p>
                                <br/>
                                <a href="${process.env.CLIENT_URL || "http://localhost:3000"}/earnings" style="display:inline-block; padding: 10px 20px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px;">Go to Earnings</a>
                            </div>
                        `;

                        await sendMail({
                            to: adminEmails.join(", "),
                            subject: `Action Required: Payment Received from ${invoice.clientName}`,
                            body: adminEmailHtml,
                        });
                        console.log(
                            `[Payment] Admin notification email sent to ${adminEmails.length} admins.`,
                        );
                    }
                }
            } catch (adminNotifyErr) {
                console.error(
                    "[Payment] Failed to notify admins:",
                    adminNotifyErr,
                );
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
