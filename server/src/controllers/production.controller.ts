import { Role } from '../constants/role.js';
import StaffModel from '../models/staff.model.js';
import type { Request, Response } from 'express';
import productionService from '../services/production.service.js';
import {
    createProductionLogSchema,
    updateProductionLogSchema,
    submitQCReviewSchema,
    startWorkSessionSchema,
    finishWorkSessionSchema,
    cancelWorkSessionSchema,
    sessionIdOnlySchema,
    adminFinishWorkSessionSchema,
    reassignWorkSessionSchema,
    flagImageRevisionSchema,
    qcApproveImagesSchema,
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
        const {
            branchId,
            search,
            status,
            filterType,
            month,
            year,
            startDate,
            endDate,
            sortBy,
            stage,
        } = req.query;

        const result = await productionService.getActiveOrdersProgress(
            branchId as string | undefined,
            search as string | undefined,
            {
                status: status as string | undefined,
                filterType: filterType as string | undefined,
                month: month ? parseInt(month as string) : undefined,
                year: year ? parseInt(year as string) : undefined,
                startDate: startDate as string | undefined,
                endDate: endDate as string | undefined,
                sortBy: sortBy as string | undefined,
                stage: stage as string | undefined,
            }
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
        const { startDate, endDate, branchId, filterType, month, year } = req.query;

        const result = await productionService.getProductionStats({
            startDate: startDate as string | undefined,
            endDate: endDate as string | undefined,
            branchId: branchId as string | undefined,
            filterType: filterType as string | undefined,
            month: month ? parseInt(month as string) : undefined,
            year: year ? parseInt(year as string) : undefined,
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

export const getSanitizedActiveOrders = async (req: Request, res: Response) => {
    try {
        const { search, includeCompleted } = req.query;
        const result = await productionService.getSanitizedActiveOrders(
            search as string | undefined,
            includeCompleted === 'true'
        );

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        console.error('getSanitizedActiveOrders error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to retrieve active orders',
        });
    }
};

export const getOrderImageStatus = async (req: Request, res: Response) => {
    try {
        const { orderId } = req.params;
        const { status, search } = req.query;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: 'Order ID is required',
            });
        }

        const result = await productionService.getOrderImageStatus(
            orderId,
            status as string | undefined,
            search as string | undefined
        );

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        console.error('getOrderImageStatus error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to retrieve image status',
        });
    }
};

export const startWorkSession = async (req: Request, res: Response) => {
    try {
        const validatedData = startWorkSessionSchema.parse(req.body);
        const userId = req.user!.id;

        const result = await productionService.startWorkSession(
            validatedData,
            userId
        );

        return res.status(201).json({
            success: true,
            message: `Work started successfully on ${result.lockedCount} image(s)`,
            data: result,
        });
    } catch (error: any) {
        console.error('startWorkSession error:', error);
        return res.status(error.name === 'ZodError' ? 400 : 400).json({
            success: false,
            message: error.message || 'Failed to start work session',
            errors: error.errors || undefined,
        });
    }
};

export const getActiveWorkSession = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const result = await productionService.getActiveWorkSession(userId);

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        console.error('getActiveWorkSession error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to retrieve active session',
        });
    }
};

export const finishWorkSession = async (req: Request, res: Response) => {
    try {
        const validatedData = finishWorkSessionSchema.parse(req.body);
        const userId = req.user!.id;

        const result = await productionService.finishWorkSession(
            validatedData,
            userId
        );

        return res.status(200).json({
            success: true,
            message: `Work session completed! ${result.imagesCompleted} image(s) updated.`,
            data: result,
        });
    } catch (error: any) {
        console.error('finishWorkSession error:', error);
        return res.status(error.name === 'ZodError' ? 400 : 400).json({
            success: false,
            message: error.message || 'Failed to finish work session',
            errors: error.errors || undefined,
        });
    }
};

export const cancelWorkSession = async (req: Request, res: Response) => {
    try {
        const validatedData = cancelWorkSessionSchema.parse(req.body);
        const userId = req.user!.id;

        const result = await productionService.cancelWorkSession(
            validatedData.sessionId,
            userId,
            validatedData.reason
        );

        return res.status(200).json({
            success: true,
            message: result.message,
            data: result,
        });
    } catch (error: any) {
        console.error('cancelWorkSession error:', error);
        return res.status(error.name === 'ZodError' ? 400 : 400).json({
            success: false,
            message: error.message || 'Failed to cancel work session',
            errors: error.errors || undefined,
        });
    }
};

export const getHeldWorkSessions = async (req: Request, res: Response) => {
    try {
        const result = await productionService.getHeldWorkSessions(req.user!.id);
        return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
        console.error('getHeldWorkSessions error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to retrieve held sessions',
        });
    }
};

export const pauseWorkSession = async (req: Request, res: Response) => {
    try {
        const { sessionId } = sessionIdOnlySchema.parse(req.body);
        const result = await productionService.pauseWorkSession(sessionId, req.user!.id);
        return res.status(200).json({
            success: true,
            message: 'Work session put on hold. Your timer is frozen.',
            data: result,
        });
    } catch (error: any) {
        console.error('pauseWorkSession error:', error);
        return res.status(error.name === 'ZodError' ? 400 : 400).json({
            success: false,
            message: error.message || 'Failed to hold work session',
            errors: error.errors || undefined,
        });
    }
};

export const resumeWorkSession = async (req: Request, res: Response) => {
    try {
        const { sessionId } = sessionIdOnlySchema.parse(req.body);
        const result = await productionService.resumeWorkSession(sessionId, req.user!.id);
        return res.status(200).json({
            success: true,
            message: 'Work session resumed. Timer is running again.',
            data: result,
        });
    } catch (error: any) {
        console.error('resumeWorkSession error:', error);
        return res.status(error.name === 'ZodError' ? 400 : 400).json({
            success: false,
            message: error.message || 'Failed to resume work session',
            errors: error.errors || undefined,
        });
    }
};

export const getLiveWorkSessions = async (_req: Request, res: Response) => {
    try {
        const result = await productionService.getLiveWorkSessions();
        return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
        console.error('getLiveWorkSessions error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to retrieve live work sessions',
        });
    }
};

export const getProductionEditors = async (_req: Request, res: Response) => {
    try {
        const result = await productionService.getProductionEditors();
        return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
        console.error('getProductionEditors error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to retrieve editors',
        });
    }
};

export const adminCancelWorkSession = async (req: Request, res: Response) => {
    try {
        const validatedData = cancelWorkSessionSchema.parse(req.body);
        const result = await productionService.cancelWorkSession(
            validatedData.sessionId,
            req.user!.id,
            validatedData.reason,
            { isSupervisor: true }
        );
        return res.status(200).json({
            success: true,
            message: result.message,
            data: result,
        });
    } catch (error: any) {
        console.error('adminCancelWorkSession error:', error);
        return res.status(error.name === 'ZodError' ? 400 : 400).json({
            success: false,
            message: error.message || 'Failed to cancel work session',
            errors: error.errors || undefined,
        });
    }
};

export const adminFinishWorkSession = async (req: Request, res: Response) => {
    try {
        const validatedData = adminFinishWorkSessionSchema.parse(req.body);
        const result = await productionService.adminFinishWorkSession(
            validatedData,
            req.user!.id
        );
        return res.status(200).json({
            success: true,
            message: `Session force-finished. ${result.imagesCompleted} image(s) updated.`,
            data: result,
        });
    } catch (error: any) {
        console.error('adminFinishWorkSession error:', error);
        return res.status(error.name === 'ZodError' ? 400 : 400).json({
            success: false,
            message: error.message || 'Failed to finish work session',
            errors: error.errors || undefined,
        });
    }
};

export const reassignWorkSession = async (req: Request, res: Response) => {
    try {
        const validatedData = reassignWorkSessionSchema.parse(req.body);
        const result = await productionService.reassignWorkSession(
            validatedData,
            req.user!.id
        );
        return res.status(200).json({
            success: true,
            message: result.message,
            data: result,
        });
    } catch (error: any) {
        console.error('reassignWorkSession error:', error);
        return res.status(error.name === 'ZodError' ? 400 : 400).json({
            success: false,
            message: error.message || 'Failed to reassign work session',
            errors: error.errors || undefined,
        });
    }
};

export const flagImageRevision = async (req: Request, res: Response) => {
    try {
        const validatedData = flagImageRevisionSchema.parse(req.body);
        const userId = req.user!.id;

        const result = await productionService.flagImageRevision(
            validatedData,
            userId
        );

        return res.status(200).json({
            success: true,
            message: result.message,
            data: result,
        });
    } catch (error: any) {
        console.error('flagImageRevision error:', error);
        return res.status(error.name === 'ZodError' ? 400 : 400).json({
            success: false,
            message: error.message || 'Failed to flag image revision',
            errors: error.errors || undefined,
        });
    }
};

export const qcApproveImages = async (req: Request, res: Response) => {
    try {
        const validatedData = qcApproveImagesSchema.parse(req.body);
        const userId = req.user!.id;

        const result = await productionService.qcApproveImages(
            validatedData,
            userId
        );

        return res.status(200).json({
            success: true,
            message: result.message,
            data: result,
        });
    } catch (error: any) {
        console.error('qcApproveImages error:', error);
        return res.status(error.name === 'ZodError' ? 400 : 400).json({
            success: false,
            message: error.message || 'Failed to approve images',
            errors: error.errors || undefined,
        });
    }
};

export const getStaffPerformanceAnalytics = async (
    req: Request,
    res: Response
) => {
    try {
        const {
            startDate,
            endDate,
            month,
            year,
            staffId,
            shiftId,
            branchId,
            filterType,
        } = req.query;

        const result = await productionService.getStaffPerformanceAnalytics({
            startDate: startDate as string | undefined,
            endDate: endDate as string | undefined,
            month: month ? parseInt(month as string) : undefined,
            year: year ? parseInt(year as string) : undefined,
            staffId: staffId as string | undefined,
            shiftId: shiftId as string | undefined,
            branchId: branchId as string | undefined,
            filterType: filterType as string | undefined,
        });

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        console.error('getStaffPerformanceAnalytics error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to retrieve staff performance analytics',
        });
    }
};

export const getStaffEditedImages = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;

        let targetStaffId = req.query.staffId as string | undefined;

        // If targetStaffId is not provided, or standard staff is querying, find their own staff ID
        if (!targetStaffId || (userRole === Role.STAFF && !targetStaffId)) {
            const staff = await StaffModel.findOne({ userId }).select('_id').lean();
            if (!staff) {
                return res.status(404).json({
                    success: false,
                    message: 'Staff profile not found for this user',
                });
            }
            targetStaffId = staff._id.toString();
        }

        const filters = {
            search: req.query.search as string | undefined,
            status: req.query.status as string | undefined,
            step: req.query.step as string | undefined,
            filterType: req.query.filterType as string | undefined,
            startDate: req.query.startDate as string | undefined,
            endDate: req.query.endDate as string | undefined,
            month: req.query.month ? parseInt(req.query.month as string) : undefined,
            year: req.query.year ? parseInt(req.query.year as string) : undefined,
            page: req.query.page ? parseInt(req.query.page as string) : 1,
            limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        };

        const result = await productionService.getStaffEditedImages(targetStaffId, filters);

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        console.error('getStaffEditedImages error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to retrieve staff edited images',
        });
    }
};


