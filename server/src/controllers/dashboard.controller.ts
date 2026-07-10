import type { Request, Response } from 'express';
import DashboardService from '../services/dashboard.service.js';

const getAdminDashboard = async (_req: Request, res: Response) => {
    try {
        const dashboardStats = await DashboardService.getAdminDashboardStats();

        return res.status(200).json({
            success: true,
            data: dashboardStats,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message:
                (error as Error).message ||
                'Failed to fetch dashboard statistics',
        });
    }
};

const DashboardController = {
    getAdminDashboard,
};

export default DashboardController;
