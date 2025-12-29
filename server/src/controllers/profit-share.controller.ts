import type { Request, Response } from 'express';
import profitShareService from '../services/profit-share.service.js';
import {
    createShareholderSchema,
    updateShareholderSchema,
    distributeProfitSchema,
    profitSummaryQuerySchema,
} from '../validators/profit-share.validation.js';
import type {
    ShareholderQueryParams,
    DistributionQueryParams,
} from '../types/shareholder.type.js';

// ============ Shareholder Endpoints ============

async function createShareholder(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const validationResult = createShareholderSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: validationResult.error.flatten().fieldErrors,
            });
        }

        const shareholder = await profitShareService.createShareholderInDB(
            validationResult.data,
            userId
        );

        return res.status(201).json({
            message: 'Shareholder added successfully',
            data: shareholder,
        });
    } catch (error: any) {
        console.error('Error creating shareholder:', error);
        if (
            error.message?.includes('percentage') ||
            error.message?.includes('Cannot add')
        ) {
            return res.status(400).json({ message: error.message });
        }
        if (error.code === 11000) {
            return res
                .status(400)
                .json({
                    message: 'A shareholder with this email already exists',
                });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function getAllShareholders(req: Request, res: Response) {
    try {
        const params: ShareholderQueryParams = {
            page: parseInt(req.query.page as string) || 1,
            limit: parseInt(req.query.limit as string) || 50,
        };

        if (req.query.isActive !== undefined) {
            params.isActive = req.query.isActive === 'true';
        }

        const result = await profitShareService.getAllShareholdersFromDB(
            params
        );

        return res.status(200).json({
            message: 'Shareholders fetched successfully',
            data: result.shareholders,
            meta: {
                total: result.total,
                totalPercentage: result.totalPercentage,
                remainingPercentage: 100 - result.totalPercentage,
            },
        });
    } catch (error) {
        console.error('Error fetching shareholders:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function getShareholderById(req: Request, res: Response) {
    try {
        const id = req.params.id;
        if (!id) {
            return res
                .status(400)
                .json({ message: 'Shareholder ID is required' });
        }

        const shareholder = await profitShareService.getShareholderByIdFromDB(
            id
        );

        if (!shareholder) {
            return res.status(404).json({ message: 'Shareholder not found' });
        }

        return res.status(200).json({
            message: 'Shareholder fetched successfully',
            data: shareholder,
        });
    } catch (error) {
        console.error('Error fetching shareholder:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function updateShareholder(req: Request, res: Response) {
    try {
        const id = req.params.id;
        if (!id) {
            return res
                .status(400)
                .json({ message: 'Shareholder ID is required' });
        }

        const validationResult = updateShareholderSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: validationResult.error.flatten().fieldErrors,
            });
        }

        const shareholder = await profitShareService.updateShareholderInDB(
            id,
            validationResult.data
        );

        if (!shareholder) {
            return res.status(404).json({ message: 'Shareholder not found' });
        }

        return res.status(200).json({
            message: 'Shareholder updated successfully',
            data: shareholder,
        });
    } catch (error: any) {
        console.error('Error updating shareholder:', error);
        if (
            error.message?.includes('percentage') ||
            error.message?.includes('Cannot update')
        ) {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function deleteShareholder(req: Request, res: Response) {
    try {
        const id = req.params.id;
        if (!id) {
            return res
                .status(400)
                .json({ message: 'Shareholder ID is required' });
        }

        const shareholder = await profitShareService.deleteShareholderFromDB(
            id
        );

        if (!shareholder) {
            return res.status(404).json({ message: 'Shareholder not found' });
        }

        return res.status(200).json({
            message: 'Shareholder deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting shareholder:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// ============ Profit Summary Endpoints ============

async function getProfitSummary(req: Request, res: Response) {
    try {
        const validationResult = profitSummaryQuerySchema.safeParse(req.query);
        if (!validationResult.success) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: validationResult.error.flatten().fieldErrors,
            });
        }

        const { periodType, month, year } = validationResult.data;

        const summary = await profitShareService.getProfitSummaryFromDB(
            periodType,
            year,
            month
        );

        return res.status(200).json({
            message: 'Profit summary fetched successfully',
            data: summary,
        });
    } catch (error) {
        console.error('Error fetching profit summary:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// ============ Distribution Endpoints ============

async function distributeProfit(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const validationResult = distributeProfitSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: validationResult.error.flatten().fieldErrors,
            });
        }

        const distributions = await profitShareService.distributeProfitInDB(
            validationResult.data,
            userId
        );

        return res.status(201).json({
            message: 'Profit distributed successfully',
            data: distributions,
        });
    } catch (error: any) {
        console.error('Error distributing profit:', error);
        if (
            error.message?.includes('Cannot distribute') ||
            error.message?.includes('already distributed') ||
            error.message?.includes('No active shareholders')
        ) {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function getDistributions(req: Request, res: Response) {
    try {
        const params: DistributionQueryParams = {
            page: parseInt(req.query.page as string) || 1,
            limit: parseInt(req.query.limit as string) || 20,
        };

        if (req.query.shareholderId) {
            params.shareholderId = req.query.shareholderId as string;
        }
        if (req.query.periodType) {
            params.periodType = req.query.periodType as 'month' | 'year';
        }
        if (req.query.year) {
            params.year = parseInt(req.query.year as string);
        }
        if (req.query.month) {
            params.month = parseInt(req.query.month as string);
        }
        if (req.query.status) {
            params.status = req.query.status as 'pending' | 'distributed';
        }

        const result = await profitShareService.getDistributionsFromDB(params);

        return res.status(200).json({
            message: 'Distributions fetched successfully',
            data: result.distributions,
            meta: {
                total: result.total,
                page: result.page,
                totalPages: result.totalPages,
            },
        });
    } catch (error) {
        console.error('Error fetching distributions:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export {
    createShareholder,
    getAllShareholders,
    getShareholderById,
    updateShareholder,
    deleteShareholder,
    getProfitSummary,
    distributeProfit,
    getDistributions,
};
