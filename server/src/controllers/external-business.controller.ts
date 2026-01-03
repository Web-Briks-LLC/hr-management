import type { Request, Response } from 'express';
import externalBusinessService from '../services/external-business.service.js';
import {
    createExternalBusinessSchema,
    updateExternalBusinessSchema,
    createProfitTransferSchema,
    profitTransferQuerySchema,
    transferStatsQuerySchema,
} from '../validators/external-business.validation.js';
import type {
    ExternalBusinessQueryParams,
    ProfitTransferQueryParams,
} from '../types/external-business.type.js';

// ============ External Business Endpoints ============

async function createBusiness(req: Request, res: Response) {
    try {
        const parsed = createExternalBusinessSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                message: 'Validation error',
                errors: parsed.error.flatten().fieldErrors,
            });
            return;
        }

        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const business = await externalBusinessService.createBusinessInDB(
            parsed.data,
            userId
        );

        res.status(201).json({
            message: 'Business created successfully',
            data: business,
        });
    } catch (error: unknown) {
        if (error instanceof Error && error.message.includes('duplicate key')) {
            res.status(400).json({
                message: 'A business with this name already exists',
            });
            return;
        }
        console.error('Create business error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function getAllBusinesses(req: Request, res: Response) {
    try {
        const params: ExternalBusinessQueryParams = {
            page: req.query.page ? Number(req.query.page) : undefined,
            limit: req.query.limit ? Number(req.query.limit) : undefined,
            isActive:
                req.query.isActive === 'true'
                    ? true
                    : req.query.isActive === 'false'
                    ? false
                    : undefined,
        };

        const { businesses, total } =
            await externalBusinessService.getAllBusinessesFromDB(params);

        res.status(200).json({
            message: 'Businesses fetched successfully',
            data: businesses,
            meta: { total },
        });
    } catch (error) {
        console.error('Get all businesses error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function getBusinessById(req: Request, res: Response) {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ message: 'Business ID is required' });
            return;
        }

        const business = await externalBusinessService.getBusinessByIdFromDB(
            id
        );

        if (!business) {
            res.status(404).json({ message: 'Business not found' });
            return;
        }

        res.status(200).json({
            message: 'Business fetched successfully',
            data: business,
        });
    } catch (error) {
        console.error('Get business by ID error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function updateBusiness(req: Request, res: Response) {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ message: 'Business ID is required' });
            return;
        }

        const parsed = updateExternalBusinessSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                message: 'Validation error',
                errors: parsed.error.flatten().fieldErrors,
            });
            return;
        }

        const business = await externalBusinessService.updateBusinessInDB(
            id,
            parsed.data
        );

        if (!business) {
            res.status(404).json({ message: 'Business not found' });
            return;
        }

        res.status(200).json({
            message: 'Business updated successfully',
            data: business,
        });
    } catch (error: unknown) {
        if (error instanceof Error && error.message.includes('duplicate key')) {
            res.status(400).json({
                message: 'A business with this name already exists',
            });
            return;
        }
        console.error('Update business error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function deleteBusiness(req: Request, res: Response) {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ message: 'Business ID is required' });
            return;
        }

        // Check if business has transfers
        const transferCount =
            await externalBusinessService.getTransferCountByBusiness(id);
        if (transferCount > 0) {
            res.status(400).json({
                message: `Cannot delete business with ${transferCount} existing transfers. Deactivate instead.`,
            });
            return;
        }

        const business = await externalBusinessService.deleteBusinessFromDB(id);

        if (!business) {
            res.status(404).json({ message: 'Business not found' });
            return;
        }

        res.status(200).json({
            message: 'Business deleted successfully',
        });
    } catch (error) {
        console.error('Delete business error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

// ============ Profit Transfer Endpoints ============

async function transferProfit(req: Request, res: Response) {
    try {
        const parsed = createProfitTransferSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                message: 'Validation error',
                errors: parsed.error.flatten().fieldErrors,
            });
            return;
        }

        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        // Verify business exists
        const business = await externalBusinessService.getBusinessByIdFromDB(
            parsed.data.businessId
        );
        if (!business) {
            res.status(404).json({ message: 'Business not found' });
            return;
        }

        const transfer = await externalBusinessService.createTransferInDB(
            parsed.data,
            userId
        );

        res.status(201).json({
            message: 'Profit transferred successfully',
            data: transfer,
        });
    } catch (error) {
        console.error('Transfer profit error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function getTransfers(req: Request, res: Response) {
    try {
        const parsed = profitTransferQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            res.status(400).json({
                message: 'Validation error',
                errors: parsed.error.flatten().fieldErrors,
            });
            return;
        }

        const params: ProfitTransferQueryParams = parsed.data;
        const { transfers, total, page, totalPages } =
            await externalBusinessService.getTransfersFromDB(params);

        res.status(200).json({
            message: 'Transfers fetched successfully',
            data: transfers,
            meta: { total, page, totalPages },
        });
    } catch (error) {
        console.error('Get transfers error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function getTransferStats(req: Request, res: Response) {
    try {
        const parsed = transferStatsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            res.status(400).json({
                message: 'Validation error',
                errors: parsed.error.flatten().fieldErrors,
            });
            return;
        }

        const stats = await externalBusinessService.getTransferStatsFromDB(
            parsed.data.year,
            parsed.data.month
        );

        res.status(200).json({
            message: 'Transfer stats fetched successfully',
            data: stats,
        });
    } catch (error) {
        console.error('Get transfer stats error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function deleteTransfer(req: Request, res: Response) {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ message: 'Transfer ID is required' });
            return;
        }

        const transfer = await externalBusinessService.deleteTransferFromDB(id);

        if (!transfer) {
            res.status(404).json({ message: 'Transfer not found' });
            return;
        }

        res.status(200).json({
            message: 'Transfer deleted successfully',
        });
    } catch (error) {
        console.error('Delete transfer error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

export {
    createBusiness,
    getAllBusinesses,
    getBusinessById,
    updateBusiness,
    deleteBusiness,
    transferProfit,
    getTransfers,
    getTransferStats,
    deleteTransfer,
};
