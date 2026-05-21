import type { Request, Response } from "express";
import transactionService from "../services/transaction.service.js";

// Retrieve unified transactions in JSON format
async function getUnifiedTransactions(req: Request, res: Response): Promise<void> {
    try {
        const { startDate, endDate, type, search, branchId } = req.query;

        const transactionsData = await transactionService.getUnifiedTransactions({
            startDate: startDate as string,
            endDate: endDate as string,
            type: type as string,
            search: search as string,
            branchId: branchId as string,
        });

        res.status(200).json({
            success: true,
            data: transactionsData,
        });
    } catch (error: any) {
        console.error("Error fetching unified transactions:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch unified transactions",
        });
    }
}

// Generate and stream PDF report using Puppeteer
async function exportTransactionsPDF(req: Request, res: Response): Promise<void> {
    try {
        const { startDate, endDate, type, search, branchId } = req.query;

        const startStr = startDate ? (startDate as string) : "Beginning";
        const endStr = endDate ? (endDate as string) : new Date().toLocaleDateString();

        // 1. Fetch range data
        const transactionsData = await transactionService.getUnifiedTransactions({
            startDate: startDate as string,
            endDate: endDate as string,
            type: type as string,
            search: search as string,
            branchId: branchId as string,
        });

        // 2. Generate PDF binary buffer
        const pdfBuffer = await transactionService.generatePDFBuffer(
            transactionsData,
            startStr,
            endStr
        );

        // 3. Set headers for standard PDF download/attachment
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="Ledger_Report_${startStr}_to_${endStr}.pdf"`
        );
        res.setHeader("Content-Length", pdfBuffer.length);

        // 4. Send buffer
        res.send(pdfBuffer);
    } catch (error: any) {
        console.error("Error exporting ledger PDF:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to export transactions PDF report",
        });
    }
}

export default {
    getUnifiedTransactions,
    exportTransactionsPDF,
};
