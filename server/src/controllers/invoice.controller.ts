import type { Request, Response } from "express";
import { encryptPayload } from "../utils/crypto.js";
import { InvoiceCounter } from "../models/invoice-counter.model.js";
import { InvoiceRecord } from "../models/invoice-record.model.js";

export const getNextInvoiceNumber = async (_req: Request, res: Response) => {
    try {
        const counter = await InvoiceCounter.findByIdAndUpdate(
            { _id: "invoice_id" },
            { $inc: { seq: 1 } },
            { new: true, upsert: true },
        );

        if (!counter) {
            res.status(500).json({
                success: false, 
                message: "Failed to generate invoice number",
            });
            return;
        }

        res.status(200).json({
            success: true,
            invoiceNumber: counter.seq,
            formattedInvoiceNumber: counter.seq.toString().padStart(2, "0"), // minimal formatting, can be enhanced
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getCurrentInvoiceNumber = async (_req: Request, res: Response) => {
    try {
        const counter = await InvoiceCounter.findById("invoice_id");
        const currentSeq = counter ? counter.seq : 0;

        res.status(200).json({
            success: true,
            invoiceNumber: currentSeq,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const sendInvoiceEmailHandler = async (req: Request, res: Response) => {
    try {
        const { to, clientName, month, year } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: "PDF file is required" });
        }

        if (!to || !clientName || !month || !year) {
            return res.status(400).json({
                message: "Missing required fields: to, clientName, month, year",
            });
        }

        // Upload to Cloudinary
        const { default: cloudinary } = await import("../lib/cloudinary.js");
        const { Readable } = await import("stream");

        const uploadPromise = new Promise<string>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: "invoices",
                    resource_type: "raw", // Use 'raw' for PDFs to avoid conversion issues or 'auto'
                    format: "pdf",
                    public_id: `invoice_${Date.now()}_${clientName.replace(/\s+/g, "_")}`,
                },
                (error, result) => {
                    if (error) return reject(error);
                    if (!result)
                        return reject(new Error("Cloudinary upload failed"));
                    resolve(result.secure_url);
                },
            );

            const stream = Readable.from(file.buffer);
            stream.pipe(uploadStream);
        });

        const invoiceUrl = await uploadPromise;

        // Dynamically import email service to avoid circular dependencies if any
        const { default: emailService } =
            await import("../services/email.service.js");

        await emailService.sendInvoiceEmail({
            to,
            clientName,
            month,
            year,
            invoiceUrl,
            attachment: {
                filename: file.originalname,
                content: file.buffer,
                contentType: file.mimetype,
            },
        });

        return res.status(200).json({
            message: "Invoice sent successfully",
        });
    } catch (error) {
        console.error("Error sending invoice:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const recordInvoice = async (req: Request, res: Response) => {
    try {
        const {
            invoiceNumber,
            clientName,
            clientId,
            clientAddress,
            companyName,
            totalOrders,
            totalImages,
            dateFrom,
            dateTo,
            totalAmount,
            currency,
            dueDate,
            month,
            year,
            items,
        } = req.body;

        if (
            !invoiceNumber ||
            !clientName ||
            !clientId ||
            totalAmount === undefined ||
            !dueDate ||
            !items
        ) {
            return res
                .status(400)
                .json({ message: "Missing required invoice fields" });
        }

        const existingInvoice = await InvoiceRecord.findOne({
            invoiceNumber: String(invoiceNumber),
        });

        let paymentToken = existingInvoice?.paymentToken;
        if (!paymentToken) {
            const payloadInfo = {
                invoiceNumber,
                totalPrice: totalAmount,
                currency: currency || "USD",
                totalImages,
                dateFrom,
                dateTo,
                totalOrders,
                clientName,
                address: clientAddress || "N/A",
                companyName: companyName || "N/A",
            };
            paymentToken = encryptPayload(payloadInfo);
        }

        const invoice = await InvoiceRecord.findOneAndUpdate(
            { invoiceNumber: String(invoiceNumber) },
            {
                invoiceNumber: String(invoiceNumber),
                clientName,
                clientId,
                clientAddress: clientAddress || "N/A",
                totalAmount,
                currency: currency || "USD",
                dueDate,
                month: month ? Number(month) : undefined,
                year: year ? Number(year) : undefined,
                totalImages: totalImages ? Number(totalImages) : undefined,
                dateFrom,
                dateTo,
                totalOrders: totalOrders ? Number(totalOrders) : undefined,
                companyName: companyName || "N/A",
                paymentStatus: "pending",
                paymentToken: paymentToken,
                items,
            },
            { new: true, upsert: true },
        );

        console.log(`[Invoice Saved]: ${invoiceNumber}`);
        return res.status(200).json({ success: true, invoice });
    } catch (error: any) {
        console.error("[Record Invoice Error]:", error);
        return res.status(500).json({ message: error.message });
    }
};

export const getInvoiceByNumber = async (req: Request, res: Response) => {
    try {
        const { invoiceNumber } = req.params;

        if (!invoiceNumber) {
            return res
                .status(400)
                .json({ message: "Invoice number is required" });
        }

        const invoice = await InvoiceRecord.findOne({
            invoiceNumber: invoiceNumber as string,
        });

        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }

        return res.status(200).json({ success: true, invoice });
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
};
