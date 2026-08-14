import { Types } from 'mongoose';
import ShiftProductionModel from '../models/shift-production.model.js';
import OrderModel from '../models/order.model.js';
import ShiftModel from '../models/shift.model.js';
import StaffModel from '../models/staff.model.js';
import { getIO } from '../socket.js';
import type {
    ICreateProductionLogDTO,
    IUpdateProductionLogDTO,
    IProductionQueryFilters,
} from '../types/production.type.js';
import { Role } from '../constants/role.js';

/**
 * Emit real-time production updates safely
 */
const notifyProductionUpdate = (event: string, payload: any) => {
    try {
        const io = getIO();
        if (io) {
            io.emit(event, payload);
        }
    } catch {
        // Socket might not be initialized in test or script context
    }
};

/**
 * Create a new shift production log
 */
const createProductionLog = async (
    payload: ICreateProductionLogDTO,
    userId: string,
    _userRole: string
) => {
    const order = await OrderModel.findById(payload.orderId).lean();
    if (!order) {
        throw new Error('Order not found');
    }

    const shift = await ShiftModel.findById(payload.shiftId).lean();
    if (!shift) {
        throw new Error('Shift not found');
    }

    // Determine branchId
    let branchId = payload.branchId ? new Types.ObjectId(payload.branchId) : (shift.branchId as Types.ObjectId);
    if (!branchId) {
        const staff = await StaffModel.findOne({ userId }).select('branchId').lean();
        if (staff?.branchId) {
            branchId = staff.branchId as Types.ObjectId;
        }
    }

    if (!branchId) {
        throw new Error('Branch could not be determined');
    }

    const date = payload.date ? new Date(payload.date) : new Date();

    // Map assigned staffs
    const assignedStaffs = (payload.assignedStaffs || []).map((staff) => ({
        staffId: new Types.ObjectId(staff.staffId),
        imageCount: Number(staff.imageCount) || 0,
        notes: staff.notes || '',
    }));

    const docToCreate: any = {
        orderId: new Types.ObjectId(payload.orderId),
        shiftId: new Types.ObjectId(payload.shiftId),
        branchId: new Types.ObjectId(branchId),
        date,
        teamLeaderId: new Types.ObjectId(userId),
        stage: payload.stage || 'clipping_path',
        completedQuantity: Number(payload.completedQuantity) || 0,
        status: payload.status || 'in_progress',
        assignedStaffs,
        handoverNotes: payload.handoverNotes || '',
        bottlenecks: payload.bottlenecks || '',
    };

    if (payload.serviceId) {
        docToCreate.serviceId = new Types.ObjectId(payload.serviceId);
    }
    if (payload.customStageName) {
        docToCreate.customStageName = payload.customStageName;
    }
    if (payload.targetQuantity !== undefined) {
        docToCreate.targetQuantity = payload.targetQuantity;
    }

    const createdDocs = await ShiftProductionModel.create([docToCreate]);
    const productionLog = createdDocs[0];

    if (!productionLog) {
        throw new Error('Failed to create production log');
    }

    // Update order status if in progress
    if (order.status === 'pending') {
        await OrderModel.findByIdAndUpdate(order._id, {
            status: 'in_progress',
            $push: {
                timeline: {
                    status: 'in_progress',
                    timestamp: new Date(),
                    changedBy: new Types.ObjectId(userId),
                    note: `Work started in shift: ${shift.name}`,
                },
            },
        });
    }

    const populatedLog = await ShiftProductionModel.findById(productionLog._id)
        .populate({
            path: 'orderId',
            populate: [{ path: 'clientId', select: 'name clientCode email' }, { path: 'services', select: 'name' }],
        })
        .populate('shiftId', 'name code startTime endTime')
        .populate('branchId', 'name')
        .populate('teamLeaderId', 'name email')
        .populate('serviceId', 'name')
        .populate('assignedStaffs.staffId', 'staffId phone department designation userId')
        .lean();

    notifyProductionUpdate('production:log_created', populatedLog);

    return populatedLog;
};

/**
 * Get all production logs with filtering & pagination
 */
const getAllProductionLogs = async (
    filters: IProductionQueryFilters,
    userId: string,
    userRole: string
) => {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    const query: any = {};

    if (filters.orderId) {
        query.orderId = new Types.ObjectId(filters.orderId);
    }
    if (filters.shiftId) {
        query.shiftId = new Types.ObjectId(filters.shiftId);
    }
    if (filters.branchId) {
        query.branchId = new Types.ObjectId(filters.branchId);
    }
    if (filters.serviceId) {
        query.serviceId = new Types.ObjectId(filters.serviceId);
    }
    if (filters.stage) {
        query.stage = filters.stage;
    }
    if (filters.status) {
        query.status = filters.status;
    }
    if (filters.teamLeaderId) {
        query.teamLeaderId = new Types.ObjectId(filters.teamLeaderId);
    }

    // Date range filter
    if (filters.startDate || filters.endDate) {
        query.date = {};
        if (filters.startDate) {
            const start = new Date(filters.startDate);
            start.setHours(0, 0, 0, 0);
            query.date.$gte = start;
        }
        if (filters.endDate) {
            const end = new Date(filters.endDate);
            end.setHours(23, 59, 59, 999);
            query.date.$lte = end;
        }
    }

    // Branch scoping for non-super_admin if needed
    if (userRole !== Role.SUPER_ADMIN && userRole !== Role.ADMIN) {
        const staff = await StaffModel.findOne({ userId }).select('branchId').lean();
        if (staff?.branchId) {
            query.branchId = staff.branchId;
        }
    }

    const [logs, total] = await Promise.all([
        ShiftProductionModel.find(query)
            .populate({
                path: 'orderId',
                populate: [
                    { path: 'clientId', select: 'name clientCode email' },
                    { path: 'services', select: 'name' },
                ],
            })
            .populate('shiftId', 'name code startTime endTime')
            .populate('branchId', 'name')
            .populate('teamLeaderId', 'name email')
            .populate('serviceId', 'name')
            .populate({
                path: 'assignedStaffs.staffId',
                select: 'staffId phone department designation userId',
                populate: { path: 'userId', select: 'name email' },
            })
            .sort({ date: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        ShiftProductionModel.countDocuments(query),
    ]);

    return {
        logs,
        total,
        page,
        totalPages: Math.ceil(total / limit),
    };
};

/**
 * Get active orders with real-time stage progress breakdown
 */
const getActiveOrdersProgress = async (
    branchId?: string,
    search?: string
) => {
    const orderQuery: any = {
        status: { $in: ['pending', 'in_progress', 'quality_check', 'revision'] },
    };

    if (search) {
        orderQuery.$or = [
            { orderName: { $regex: search, $options: 'i' } },
        ];
    }

    const activeOrders = await OrderModel.find(orderQuery)
        .populate('clientId', 'name clientCode email')
        .populate('services', 'name')
        .populate('returnFileFormat', 'name format')
        .sort({ deadline: 1, createdAt: -1 })
        .lean();

    if (activeOrders.length === 0) {
        return [];
    }

    const orderIds = activeOrders.map((o) => o._id);

    // Aggregate shift production logs per order
    const stageAggregation = await ShiftProductionModel.aggregate([
        { 
            $match: { 
                orderId: { $in: orderIds },
                ...(branchId ? { branchId: new Types.ObjectId(branchId) } : {})
            } 
        },
        {
            $group: {
                _id: { orderId: '$orderId', stage: '$stage' },
                totalCompletedInStage: { $sum: '$completedQuantity' },
                lastUpdated: { $max: '$updatedAt' },
                latestStatus: { $last: '$status' },
                logsCount: { $sum: 1 },
            },
        },
    ]);

    // Aggregate total shifts and latest handover per order
    const latestLogs = await ShiftProductionModel.find({ orderId: { $in: orderIds } })
        .populate('shiftId', 'name code')
        .populate('teamLeaderId', 'name email')
        .sort({ createdAt: -1 })
        .lean();

    const orderProgressMap = new Map<string, any>();

    for (const item of stageAggregation) {
        const oId = item._id.orderId.toString();
        if (!orderProgressMap.has(oId)) {
            orderProgressMap.set(oId, {
                stages: {},
                totalProcessedImages: 0,
            });
        }
        const record = orderProgressMap.get(oId);
        record.stages[item._id.stage] = {
            completed: item.totalCompletedInStage,
            lastUpdated: item.lastUpdated,
            status: item.latestStatus,
            logsCount: item.logsCount,
        };
    }

    const result = activeOrders.map((order) => {
        const oId = (order._id as Types.ObjectId).toString();
        const progressData = orderProgressMap.get(oId) || { stages: {}, totalProcessedImages: 0 };
        const orderLatestLogs = latestLogs.filter((l) => l.orderId.toString() === oId);
        const latestShiftLog = orderLatestLogs[0] || null;

        // Calculate progress percentage based on image quantity
        const totalOrdered = order.imageQuantity || 1;
        const clippingDone = progressData.stages['clipping_path']?.completed || 0;
        const maskingDone = progressData.stages['masking']?.completed || 0;
        const retouchDone = progressData.stages['retouching']?.completed || 0;
        const ghostDone = progressData.stages['ghost_mannequin']?.completed || 0;

        // Primary progress metric: maximum stage output towards target
        const primaryCompleted = Math.max(clippingDone, maskingDone, retouchDone, ghostDone);
        const overallPercentage = Math.min(100, Math.round((primaryCompleted / totalOrdered) * 100));

        return {
            ...order,
            productionProgress: {
                totalOrdered,
                overallPercentage,
                stages: progressData.stages,
                clippingPathCount: clippingDone,
                maskingCount: maskingDone,
                retouchingCount: retouchDone,
                ghostMannequinCount: ghostDone,
                remainingImages: Math.max(0, totalOrdered - primaryCompleted),
                latestShiftLog: latestShiftLog
                    ? {
                          _id: latestShiftLog._id,
                          shiftName: (latestShiftLog.shiftId as any)?.name || 'N/A',
                          teamLeaderName: (latestShiftLog.teamLeaderId as any)?.name || 'N/A',
                          stage: latestShiftLog.stage,
                          completedQuantity: latestShiftLog.completedQuantity,
                          status: latestShiftLog.status,
                          handoverNotes: latestShiftLog.handoverNotes,
                          date: latestShiftLog.date,
                      }
                    : null,
                totalShiftsLogged: orderLatestLogs.length,
            },
        };
    });

    return result;
};

/**
 * Get detailed workflow timeline for a specific order
 */
const getOrderTimelineLogs = async (orderId: string) => {
    const order = await OrderModel.findById(orderId)
        .populate('clientId', 'name clientCode email')
        .populate('services', 'name')
        .lean();

    if (!order) {
        throw new Error('Order not found');
    }

    const logs = await ShiftProductionModel.find({ orderId: new Types.ObjectId(orderId) })
        .populate('shiftId', 'name code startTime endTime')
        .populate('branchId', 'name')
        .populate('teamLeaderId', 'name email')
        .populate('serviceId', 'name')
        .populate({
            path: 'assignedStaffs.staffId',
            select: 'staffId phone department designation userId',
            populate: { path: 'userId', select: 'name email' },
        })
        .sort({ date: 1, createdAt: 1 })
        .lean();

    return {
        order,
        logs,
    };
};

/**
 * Update a production log
 */
const updateProductionLog = async (
    id: string,
    payload: IUpdateProductionLogDTO,
    userId: string,
    userRole: string
) => {
    const log = await ShiftProductionModel.findById(id);
    if (!log) {
        throw new Error('Production log not found');
    }

    // Verify permission: Admins have full access; Team Leader can edit if they created it
    if (
        userRole !== Role.SUPER_ADMIN &&
        userRole !== Role.ADMIN &&
        userRole !== Role.HR_MANAGER
    ) {
        if (log.teamLeaderId.toString() !== userId) {
            throw new Error('You can only update production logs created by your shift');
        }
    }

    if (payload.completedQuantity !== undefined) {
        log.completedQuantity = Number(payload.completedQuantity);
    }
    if (payload.targetQuantity !== undefined) {
        log.targetQuantity = Number(payload.targetQuantity);
    }
    if (payload.status) {
        log.status = payload.status;
    }
    if (payload.stage) {
        log.stage = payload.stage;
    }
    if (payload.customStageName !== undefined) {
        log.customStageName = payload.customStageName;
    }
    if (payload.serviceId) {
        log.serviceId = new Types.ObjectId(payload.serviceId);
    }
    if (payload.handoverNotes !== undefined) {
        log.handoverNotes = payload.handoverNotes;
    }
    if (payload.bottlenecks !== undefined) {
        log.bottlenecks = payload.bottlenecks;
    }
    if (payload.assignedStaffs) {
        log.assignedStaffs = payload.assignedStaffs.map((s) => ({
            staffId: new Types.ObjectId(s.staffId),
            imageCount: Number(s.imageCount) || 0,
            notes: s.notes || '',
        }));
    }
    if (payload.qc) {
        log.qc = {
            checkedBy: payload.qc.checkedBy ? new Types.ObjectId(payload.qc.checkedBy) : new Types.ObjectId(userId),
            passedCount: payload.qc.passedCount ?? log.qc?.passedCount ?? 0,
            rejectedCount: payload.qc.rejectedCount ?? log.qc?.rejectedCount ?? 0,
            qcNotes: payload.qc.qcNotes ?? log.qc?.qcNotes ?? '',
            checkedAt: new Date(),
        };
    }
    if (payload.revision) {
        log.revision = {
            isRevision: payload.revision.isRevision ?? log.revision?.isRevision ?? false,
            revisionCount: payload.revision.revisionCount ?? log.revision?.revisionCount ?? 0,
            instructions: payload.revision.instructions ?? log.revision?.instructions ?? '',
            resolvedCount: payload.revision.resolvedCount ?? log.revision?.resolvedCount ?? 0,
        };
    }
    if (payload.isVerifiedByAdmin !== undefined && [Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER].includes(userRole as Role)) {
        log.isVerifiedByAdmin = payload.isVerifiedByAdmin;
    }

    await log.save();

    const updatedLog = await ShiftProductionModel.findById(id)
        .populate({
            path: 'orderId',
            populate: [{ path: 'clientId', select: 'name clientCode email' }, { path: 'services', select: 'name' }],
        })
        .populate('shiftId', 'name code startTime endTime')
        .populate('branchId', 'name')
        .populate('teamLeaderId', 'name email')
        .populate('serviceId', 'name')
        .populate('assignedStaffs.staffId', 'staffId phone department designation userId')
        .lean();

    notifyProductionUpdate('production:log_updated', updatedLog);

    return updatedLog;
};

/**
 * Submit Quality Check (QC) Review
 */
const submitQCReview = async (
    logId: string,
    qcData: {
        passedCount: number;
        rejectedCount: number;
        qcNotes?: string | undefined;
        requiresRevision?: boolean | undefined;
        revisionInstructions?: string | undefined;
    },
    userId: string
) => {
    const log = await ShiftProductionModel.findById(logId);
    if (!log) {
        throw new Error('Production log not found');
    }

    log.qc = {
        checkedBy: new Types.ObjectId(userId),
        passedCount: qcData.passedCount,
        rejectedCount: qcData.rejectedCount,
        qcNotes: qcData.qcNotes || '',
        checkedAt: new Date(),
    };

    if (qcData.requiresRevision || qcData.rejectedCount > 0) {
        log.status = 'revision_required';
        log.revision = {
            isRevision: true,
            revisionCount: (log.revision?.revisionCount || 0) + 1,
            instructions: qcData.revisionInstructions || qcData.qcNotes || 'Quality check rejected - needs revision',
            resolvedCount: 0,
            previousLogId: log._id,
        };

        // Also update order status to revision
        await OrderModel.findByIdAndUpdate(log.orderId, {
            status: 'revision',
            $inc: { revisionCount: 1 },
            $push: {
                revisionInstructions: {
                    instruction: qcData.revisionInstructions || 'QC rejection revision',
                    createdAt: new Date(),
                    createdBy: new Types.ObjectId(userId),
                },
                timeline: {
                    status: 'revision',
                    timestamp: new Date(),
                    changedBy: new Types.ObjectId(userId),
                    note: `QC Rejected: ${qcData.rejectedCount} images need revision. Note: ${qcData.qcNotes || ''}`,
                },
            },
        });
    } else {
        log.status = 'quality_check';
    }

    await log.save();

    notifyProductionUpdate('production:qc_submitted', log);

    return log;
};

/**
 * Delete a production log (Admins only)
 */
const deleteProductionLog = async (id: string) => {
    const log = await ShiftProductionModel.findByIdAndDelete(id);
    if (!log) {
        throw new Error('Production log not found');
    }

    notifyProductionUpdate('production:log_deleted', { id });
    return true;
};

/**
 * Get Production KPIs & Analytics
 */
const getProductionStats = async (filters: {
    startDate?: string | undefined;
    endDate?: string | undefined;
    branchId?: string | undefined;
}) => {
    const query: any = {};
    if (filters.branchId) {
        query.branchId = new Types.ObjectId(filters.branchId);
    }

    const start = filters.startDate ? new Date(filters.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = filters.endDate ? new Date(filters.endDate) : new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    query.date = { $gte: start, $lte: end };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
        totalImagesProcessed,
        todayImagesProcessed,
        shiftComparison,
        stageBreakdown,
        dailyTrend,
        activeOrdersCount,
        revisionsCount,
    ] = await Promise.all([
        // Total images in date range
        ShiftProductionModel.aggregate([
            { $match: query },
            { $group: { _id: null, total: { $sum: '$completedQuantity' } } },
        ]),
        // Today's total images
        ShiftProductionModel.aggregate([
            { $match: { date: { $gte: todayStart, $lte: todayEnd } } },
            { $group: { _id: null, total: { $sum: '$completedQuantity' } } },
        ]),
        // Shift comparison (Morning vs Evening vs Night)
        ShiftProductionModel.aggregate([
            { $match: query },
            {
                $lookup: {
                    from: 'shifts',
                    localField: 'shiftId',
                    foreignField: '_id',
                    as: 'shift',
                },
            },
            { $unwind: '$shift' },
            {
                $group: {
                    _id: '$shift.name',
                    shiftCode: { $first: '$shift.code' },
                    imagesCompleted: { $sum: '$completedQuantity' },
                    logsCount: { $sum: 1 },
                },
            },
            { $sort: { imagesCompleted: -1 } },
        ]),
        // Stage breakdown (Clipping Path, Masking, Retouching, etc.)
        ShiftProductionModel.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$stage',
                    count: { $sum: '$completedQuantity' },
                    logsCount: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
        ]),
        // Daily output trend for charts
        ShiftProductionModel.aggregate([
            { $match: query },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
                    completedImages: { $sum: '$completedQuantity' },
                    targetImages: { $sum: '$targetQuantity' },
                },
            },
            { $sort: { _id: 1 } },
        ]),
        // Active orders currently in production
        OrderModel.countDocuments({
            status: { $in: ['pending', 'in_progress', 'quality_check', 'revision'] },
        }),
        // Revisions currently required
        ShiftProductionModel.countDocuments({
            ...query,
            status: 'revision_required',
        }),
    ]);

    return {
        summary: {
            totalImages: totalImagesProcessed[0]?.total || 0,
            todayImages: todayImagesProcessed[0]?.total || 0,
            activeOrders: activeOrdersCount,
            activeRevisions: revisionsCount,
        },
        shiftComparison: shiftComparison.map((s) => ({
            shiftName: s._id,
            shiftCode: s.shiftCode,
            imagesCompleted: s.imagesCompleted,
            logsCount: s.logsCount,
        })),
        stageBreakdown: stageBreakdown.map((s) => ({
            stage: s._id,
            completedImages: s.count,
            logsCount: s.logsCount,
        })),
        dailyTrend: dailyTrend.map((d) => ({
            date: d._id,
            completed: d.completedImages,
            target: d.targetImages,
        })),
    };
};

const productionService = {
    createProductionLog,
    getAllProductionLogs,
    getActiveOrdersProgress,
    getOrderTimelineLogs,
    updateProductionLog,
    submitQCReview,
    deleteProductionLog,
    getProductionStats,
};

export default productionService;
