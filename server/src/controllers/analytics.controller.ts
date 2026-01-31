import type { Request, Response } from 'express';
import analyticsService from '../services/analytics.service.js';

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

export default {
    getFinanceAnalytics,
    getAnalyticsYears,
};
