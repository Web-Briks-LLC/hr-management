import type { Request, Response } from 'express';
import analyticsService from '../services/analytics.service.js';
import analyticsExportService from '../services/analytics-export.service.js';

async function getFinanceAnalytics(req: Request, res: Response) {
    try {
        const year = req.query.year
            ? parseInt(req.query.year as string)
            : undefined;
        const months = req.query.months
            ? parseInt(req.query.months as string)
            : 12;
        const month = req.query.month
            ? parseInt(req.query.month as string)
            : undefined;

        const analytics = await analyticsService.getFinanceAnalytics({
            year,
            months, // still passed but service prioritizes date logic
            month,
        });

        res.status(200).json({
            success: true,
            data: analytics,
        });
    } catch (error) {
        console.error('Error getting finance analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch finance analytics',
        });
    }
}

async function getAnalyticsYears(_req: Request, res: Response) {
    try {
        const years = await analyticsService.getAvailableAnalyticsYears();
        res.status(200).json({
            success: true,
            data: years,
        });
    } catch (error) {
        console.error('Error getting analytics years:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch analytics years',
        });
    }
}

async function exportFinancePDF(req: Request, res: Response) {
    try {
        const year = req.query.year ? parseInt(req.query.year as string) : undefined;
        const month = req.query.month ? parseInt(req.query.month as string) : undefined;

        const pdfBuffer = await analyticsExportService.generatePDF({ year, month });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Finance_Report_${year}_${month || 'all'}.pdf`);
        res.send(pdfBuffer);
    } catch (error: any) {
        console.error('Error generating finance PDF:', error);
        res.status(500).json({ success: false, message: 'Failed to generate PDF', error: error.message, stack: error.stack });
    }
}

async function exportFinanceExcel(req: Request, res: Response) {
    try {
        const year = req.query.year ? parseInt(req.query.year as string) : undefined;
        const month = req.query.month ? parseInt(req.query.month as string) : undefined;

        const excelBuffer = await analyticsExportService.generateExcel({ year, month });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Finance_Report_${year}_${month || 'all'}.xlsx`);
        res.send(excelBuffer);
    } catch (error: any) {
        console.error('Error generating finance Excel:', error);
        res.status(500).json({ success: false, message: 'Failed to generate Excel', error: error.message, stack: error.stack });
    }
}

export default {
    getFinanceAnalytics,
    getAnalyticsYears,
    exportFinancePDF,
    exportFinanceExcel,
};
