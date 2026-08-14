import type { Request, Response } from 'express';
import productionService from '../services/production.service.js';
import {
    createProductionLogSchema,
    updateProductionLogSchema,
    submitQCReviewSchema,
} from '../validators/production.validator.js';

export const createProductionLog = async (req: Request, res: Response) => {
    try {
        const validatedData = createProductionLogSchema.parse(req.body);
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const result = await productionService.createProductionLog(
            validatedData as any,
            userId,
            userRole
        );

        return res.status(201).json({
            success: true,
            message: 'Production log created successfully',
            data: result,
        });
    } catch (error: any) {
        console.error('createProductionLog error:', error);
        return res.status(error.name === 'ZodError' ? 400 : 500).json({
            success: false,
            message: error.message || 'Failed to create production log',
            errors: error.errors || undefined,
        });
    }
};

export const getAllProductionLogs = async (req: Request, res: Response) => {
    try {
        const filters = req.query;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const result = await productionService.getAllProductionLogs(
            filters as any,
            userId,
            userRole
        );

        return res.status(200).json({
            success: true,
            data: result.logs,
            meta: {
                total: result.total,
                page: result.page,
                totalPages: result.totalPages,
            },
        });
    } catch (error: any) {
        console.error('getAllProductionLogs error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to retrieve production logs',
        });
    }
};

export const getActiveOrdersProgress = async (req: Request, res: Response) => {
    try {
        const { branchId, search } = req.query;

        const result = await productionService.getActiveOrdersProgress(
            branchId as string | undefined,
            search as string | undefined
        );

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        console.error('getActiveOrdersProgress error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to retrieve active orders progress',
        });
    }
};

export const getOrderTimelineLogs = async (req: Request, res: Response) => {
    try {
        const orderId = req.params.orderId;
        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: 'Order ID is required',
            });
        }

        const result = await productionService.getOrderTimelineLogs(orderId);

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        console.error('getOrderTimelineLogs error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to retrieve order timeline logs',
        });
    }
};

export const updateProductionLog = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Production log ID is required',
            });
        }

        const validatedData = updateProductionLogSchema.parse(req.body);
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const result = await productionService.updateProductionLog(
            id,
            validatedData as any,
            userId,
            userRole
        );

        return res.status(200).json({
            success: true,
            message: 'Production log updated successfully',
            data: result,
        });
    } catch (error: any) {
        console.error('updateProductionLog error:', error);
        return res.status(error.name === 'ZodError' ? 400 : 500).json({
            success: false,
            message: error.message || 'Failed to update production log',
            errors: error.errors || undefined,
        });
    }
};

export const submitQCReview = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Production log ID is required',
            });
        }

        const validatedData = submitQCReviewSchema.parse(req.body);
        const userId = req.user!.id;

        const result = await productionService.submitQCReview(
            id,
            validatedData,
            userId
        );

        return res.status(200).json({
            success: true,
            message: 'QC review submitted successfully',
            data: result,
        });
    } catch (error: any) {
        console.error('submitQCReview error:', error);
        return res.status(error.name === 'ZodError' ? 400 : 500).json({
            success: false,
            message: error.message || 'Failed to submit QC review',
            errors: error.errors || undefined,
        });
    }
};

export const deleteProductionLog = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Production log ID is required',
            });
        }

        await productionService.deleteProductionLog(id);

        return res.status(200).json({
            success: true,
            message: 'Production log deleted successfully',
        });
    } catch (error: any) {
        console.error('deleteProductionLog error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete production log',
        });
    }
};

export const getProductionStats = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate, branchId } = req.query;

        const result = await productionService.getProductionStats({
            startDate: startDate as string | undefined,
            endDate: endDate as string | undefined,
            branchId: branchId as string | undefined,
        });

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        console.error('getProductionStats error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to retrieve production statistics',
        });
    }
};
