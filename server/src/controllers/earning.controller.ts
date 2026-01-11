import type { Request, Response } from 'express';
import earningService from '../services/earning.service.js';
import type { EarningQueryParams } from '../types/earning.type.js';

async function createEarning(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const {
            clientId,
            orderIds,
            month,
            year,
            totalOrderAmount,
            fees,
            tax,
            currency,
            conversionRate,
            notes,
        } = req.body;

        if (!clientId || !month || !year || !currency || !conversionRate) {
            return res.status(400).json({
                message:
                    'Client ID, month, year, currency, and conversion rate are required',
            });
        }

        const earning = await earningService.createEarningInDB(
            {
                clientId,
                orderIds: orderIds || [],
                month,
                year,
                totalOrderAmount: totalOrderAmount || 0,
                fees: fees || 0,
                tax: tax || 0,
                currency,
                conversionRate,
                notes,
            },
            userId
        );

        return res.status(201).json({
            message: 'Earning created successfully',
            data: earning,
        });
    } catch (error) {
        console.error('Error creating earning:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function getAllEarnings(req: Request, res: Response) {
    try {
        const params: EarningQueryParams = {
            page: parseInt(req.query.page as string) || 1,
            limit: parseInt(req.query.limit as string) || 10,
        };

        if (req.query.clientId) {
            params.clientId = req.query.clientId as string;
        }
        if (req.query.month) {
            params.month = parseInt(req.query.month as string);
        }
        if (req.query.year) {
            params.year = parseInt(req.query.year as string);
        }
        if (req.query.status) {
            params.status = req.query.status as 'pending' | 'completed';
        }

        const result = await earningService.getAllEarningsFromDB(params);

        return res.status(200).json({
            message: 'Earnings fetched successfully',
            data: result.earnings,
            meta: {
                total: result.total,
                page: result.page,
                totalPages: result.totalPages,
            },
        });
    } catch (error) {
        console.error('Error fetching earnings:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function getEarningById(req: Request, res: Response) {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ message: 'Earning ID is required' });
        }

        const earning = await earningService.getEarningByIdFromDB(id);

        if (!earning) {
            return res.status(404).json({ message: 'Earning not found' });
        }

        return res.status(200).json({
            message: 'Earning fetched successfully',
            data: earning,
        });
    } catch (error) {
        console.error('Error fetching earning:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function getOrdersForWithdrawal(req: Request, res: Response) {
    try {
        const { clientId, month, year } = req.query;

        if (!clientId || !month || !year) {
            return res.status(400).json({
                message: 'Client ID, month, and year are required',
            });
        }

        const result = await earningService.getOrdersForWithdrawal(
            clientId as string,
            parseInt(month as string),
            parseInt(year as string)
        );

        return res.status(200).json({
            message: 'Orders fetched successfully',
            data: result.orders,
            totalAmount: result.totalAmount,
        });
    } catch (error) {
        console.error('Error fetching orders for withdrawal:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function getEarningStats(_req: Request, res: Response) {
    try {
        const stats = await earningService.getEarningStatsFromDB();

        return res.status(200).json({
            message: 'Earning stats fetched successfully',
            data: stats,
        });
    } catch (error) {
        console.error('Error fetching earning stats:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function updateEarning(req: Request, res: Response) {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ message: 'Earning ID is required' });
        }

        const { totalOrderAmount, fees, tax, currency, conversionRate, notes } =
            req.body;

        const earning = await earningService.updateEarningInDB(id, {
            totalOrderAmount,
            fees,
            tax,
            currency,
            conversionRate,
            notes,
        });

        if (!earning) {
            return res.status(404).json({ message: 'Earning not found' });
        }

        return res.status(200).json({
            message: 'Earning updated successfully',
            data: earning,
        });
    } catch (error) {
        console.error('Error updating earning:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function deleteEarning(req: Request, res: Response) {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ message: 'Earning ID is required' });
        }

        const earning = await earningService.deleteEarningFromDB(id);

        if (!earning) {
            return res.status(404).json({ message: 'Earning not found' });
        }

        return res.status(200).json({
            message: 'Earning deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting earning:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function getMonthlySummary(req: Request, res: Response) {
    try {
        const month = parseInt(req.query.month as string || '');
        const year = parseInt(req.query.year as string || '');

        if (!month || !year || month < 1 || month > 12) {
            return res.status(400).json({
                message: 'Valid month (1-12) and year are required',
            });
        }

        const result = await earningService.getMonthlySummaryByClient(month, year);

        return res.status(200).json({
            message: 'Monthly summary fetched successfully',
            data: result.clients,
            currencies: result.currencies,
        });
    } catch (error) {
        console.error('Error fetching monthly summary:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export {
    createEarning,
    getAllEarnings,
    getEarningById,
    getOrdersForWithdrawal,
    getEarningStats,
    updateEarning,
    deleteEarning,
    getMonthlySummary,
};
