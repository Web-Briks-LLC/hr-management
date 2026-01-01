import type { Request, Response } from 'express';
import { InvoiceCounter } from '../models/invoice-counter.model.js';

export const getNextInvoiceNumber = async (_req: Request, res: Response) => {
    try {
        const counter = await InvoiceCounter.findByIdAndUpdate(
            { _id: 'invoice_id' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );

        if (!counter) {
            res.status(500).json({
                message: 'Failed to generate invoice number',
            });
            return;
        }

        res.status(200).json({
            success: true,
            invoiceNumber: counter.seq,
            formattedInvoiceNumber: counter.seq.toString().padStart(2, '0'), // minimal formatting, can be enhanced
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getCurrentInvoiceNumber = async (_req: Request, res: Response) => {
    try {
        const counter = await InvoiceCounter.findById('invoice_id');
        const currentSeq = counter ? counter.seq : 0;

        res.status(200).json({
            success: true,
            invoiceNumber: currentSeq,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
