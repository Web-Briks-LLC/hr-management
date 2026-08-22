import { Types } from 'mongoose';
import ShiftProductionModel from '../models/shift-production.model.js';
import OrderModel from '../models/order.model.js';
import ShiftModel from '../models/shift.model.js';
import StaffModel from '../models/staff.model.js';
import OrderImageModel from '../models/order-image.model.js';
import ProductionWorkSessionModel from '../models/production-session.model.js';
import { getIO } from '../socket.js';
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';

import type {
    ICreateProductionLogDTO,
    IUpdateProductionLogDTO,
    IProductionQueryFilters,
    IActiveOrdersProgressFilters,
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

    // Only merge with an UNINSPECTED active shift log for the same shift/stage today.
    // CRITICAL: Once a log has QC inspection or revision_required, it is closed/immutable and must not be mutated!
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existingSessionLog = await ShiftProductionModel.findOne({
        orderId: new Types.ObjectId(payload.orderId),
        shiftId: new Types.ObjectId(payload.shiftId),
        stage: payload.stage || 'clipping_path',
        date: { $gte: startOfDay, $lte: endOfDay },
        'qc.checkedAt': { $exists: false },
        status: { $ne: 'revision_required' },
    });

    let productionLog: any;

    if (existingSessionLog) {
        // Smart Merge with existing shift session log
        existingSessionLog.completedQuantity =
            (existingSessionLog.completedQuantity || 0) + (Number(payload.completedQuantity) || 0);
        existingSessionLog.status = payload.status || existingSessionLog.status;

        if (payload.handoverNotes) {
            existingSessionLog.handoverNotes = existingSessionLog.handoverNotes
                ? `${existingSessionLog.handoverNotes} | ${payload.handoverNotes}`
                : payload.handoverNotes;
        }
        if (payload.bottlenecks) {
            existingSessionLog.bottlenecks = existingSessionLog.bottlenecks
                ? `${existingSessionLog.bottlenecks} | ${payload.bottlenecks}`
                : payload.bottlenecks;
        }

        // Merge assigned photo editors
        for (const newStaff of assignedStaffs) {
            const targetStaff = existingSessionLog.assignedStaffs.find(
                (s) => s.staffId.toString() === newStaff.staffId.toString()
            );
            if (targetStaff) {
                targetStaff.imageCount = (targetStaff.imageCount || 0) + newStaff.imageCount;
                if (newStaff.notes) {
                    targetStaff.notes = targetStaff.notes
                        ? `${targetStaff.notes}; ${newStaff.notes}`
                        : newStaff.notes;
                }
            } else {
                existingSessionLog.assignedStaffs.push(newStaff);
            }
        }

        await existingSessionLog.save();
        productionLog = existingSessionLog;
    } else {
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
        productionLog = createdDocs[0];
    }

    if (!productionLog) {
        throw new Error('Failed to save production log');
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

    // Date filter logic (Date range, filterType, month, year)
    if (filters.filterType || filters.startDate || filters.endDate || filters.month || filters.year) {
        const now = new Date();
        let start: Date | null = null;
        let end: Date | null = null;

        if (filters.startDate || filters.endDate) {
            if (filters.startDate) {
                start = new Date(filters.startDate);
                start.setHours(0, 0, 0, 0);
            }
            if (filters.endDate) {
                end = new Date(filters.endDate);
                end.setHours(23, 59, 59, 999);
            }
        } else if (filters.filterType === 'today') {
            start = startOfDay(now);
            end = endOfDay(now);
        } else if (filters.filterType === 'week') {
            start = startOfWeek(now, { weekStartsOn: 1 });
            end = endOfWeek(now, { weekStartsOn: 1 });
        } else if (filters.filterType === 'month') {
            const yr = filters.year || now.getFullYear();
            const mo = filters.month || (now.getMonth() + 1);
            start = new Date(yr, mo - 1, 1, 0, 0, 0, 0);
            end = new Date(yr, mo, 0, 23, 59, 59, 999);
        } else if (filters.filterType === 'year') {
            const yr = filters.year || now.getFullYear();
            start = new Date(yr, 0, 1, 0, 0, 0, 0);
            end = new Date(yr, 11, 31, 23, 59, 59, 999);
        }

        if (start || end) {
            query.date = {};
            if (start) query.date.$gte = start;
            if (end) query.date.$lte = end;
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
    search?: string,
    filters?: IActiveOrdersProgressFilters
) => {
    const orderQuery: any = {};

    // Status filter
    if (filters?.status && filters.status !== 'all') {
        const mappedStatus = filters.status === 'revision_required' ? 'revision' : filters.status;
        orderQuery.status = mappedStatus;
    } else {
        orderQuery.status = { $in: ['pending', 'in_progress', 'quality_check', 'revision'] };
    }

    if (search) {
        orderQuery.$or = [
            { orderName: { $regex: search, $options: 'i' } },
        ];
    }

    // Date filtering (checks orderDate or createdAt)
    if (filters?.filterType || filters?.startDate || filters?.endDate || filters?.month || filters?.year) {
        const now = new Date();
        let start: Date | null = null;
        let end: Date | null = null;

        if (filters?.startDate || filters?.endDate) {
            if (filters.startDate) {
                start = new Date(filters.startDate);
                start.setHours(0, 0, 0, 0);
            }
            if (filters.endDate) {
                end = new Date(filters.endDate);
                end.setHours(23, 59, 59, 999);
            }
        } else if (filters?.filterType === 'today') {
            start = startOfDay(now);
            end = endOfDay(now);
        } else if (filters?.filterType === 'week') {
            start = startOfWeek(now, { weekStartsOn: 1 });
            end = endOfWeek(now, { weekStartsOn: 1 });
        } else if (filters?.filterType === 'month') {
            const yr = filters.year || now.getFullYear();
            const mo = filters.month || (now.getMonth() + 1);
            start = new Date(yr, mo - 1, 1, 0, 0, 0, 0);
            end = new Date(yr, mo, 0, 23, 59, 59, 999);
        } else if (filters?.filterType === 'year') {
            const yr = filters.year || now.getFullYear();
            start = new Date(yr, 0, 1, 0, 0, 0, 0);
            end = new Date(yr, 11, 31, 23, 59, 59, 999);
        }

        if (start || end) {
            orderQuery.orderDate = {};
            if (start) orderQuery.orderDate.$gte = start;
            if (end) orderQuery.orderDate.$lte = end;
        }
    }

    // Sorting criteria: Default to newest orders first so recent orders are immediately visible
    let sortCriteria: any = { orderDate: -1, createdAt: -1 };
    if (filters?.sortBy === 'deadline') {
        sortCriteria = { deadline: 1, createdAt: -1 };
    } else if (filters?.sortBy === 'oldest') {
        sortCriteria = { orderDate: 1, createdAt: 1 };
    } else if (filters?.sortBy === 'volume') {
        sortCriteria = { imageQuantity: -1, orderDate: -1 };
    } else if (filters?.sortBy === 'priority') {
        sortCriteria = { priority: 1, orderDate: -1 };
    } else if (filters?.sortBy === 'newest') {
        sortCriteria = { orderDate: -1, createdAt: -1 };
    }

    const activeOrders = await OrderModel.find(orderQuery)
        .populate('clientId', 'name clientCode email')
        .populate('services', 'name')
        .populate('returnFileFormat', 'name format')
        .sort(sortCriteria)
        .lean();

    if (activeOrders.length === 0) {
        return [];
    }

    const orderIds = activeOrders.map((o) => o._id);

    // Aggregate shift production logs per order with QC inspection awareness
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
                totalLoggedQuantity: { $sum: '$completedQuantity' },
                totalPassedInQC: {
                    $sum: {
                        $cond: [
                            { $gt: ['$qc.checkedAt', null] },
                            '$qc.passedCount',
                            '$completedQuantity'
                        ]
                    }
                },
                totalRejectedInQC: {
                    $sum: {
                        $cond: [
                            { $gt: ['$qc.checkedAt', null] },
                            '$qc.rejectedCount',
                            0
                        ]
                    }
                },
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
                totalRejectedInQC: 0,
            });
        }
        const record = orderProgressMap.get(oId);
        record.stages[item._id.stage] = {
            completed: Math.max(0, item.totalPassedInQC),
            loggedTotal: item.totalLoggedQuantity,
            passedQC: item.totalPassedInQC,
            rejectedQC: item.totalRejectedInQC,
            lastUpdated: item.lastUpdated,
            status: item.latestStatus,
            logsCount: item.logsCount,
        };
        record.totalRejectedInQC = (record.totalRejectedInQC || 0) + (item.totalRejectedInQC || 0);
    }

    const result = activeOrders.map((order) => {
        const oId = (order._id as Types.ObjectId).toString();
        const progressData = orderProgressMap.get(oId) || { stages: {}, totalProcessedImages: 0, totalRejectedInQC: 0 };
        const orderLatestLogs = latestLogs.filter((l) => l.orderId.toString() === oId);
        const latestShiftLog = orderLatestLogs[0] || null;

        // Calculate progress percentage based on QC-approved/completed image quantity
        const totalOrdered = order.imageQuantity || 1;
        const clippingDone = progressData.stages['clipping_path']?.completed || 0;
        const maskingDone = progressData.stages['masking']?.completed || 0;
        const retouchDone = progressData.stages['retouching']?.completed || 0;
        const ghostDone = progressData.stages['ghost_mannequin']?.completed || 0;

        // Primary progress metric: maximum QC-passed stage output towards target across any logged stage
        const stageValues = Object.values(progressData.stages).map((s: any) => Number(s.completed) || 0);
        const primaryCompleted = stageValues.length > 0 ? Math.min(totalOrdered, Math.max(...stageValues)) : 0;
        const overallPercentage = Math.min(100, Math.round((primaryCompleted / totalOrdered) * 100));

        // Calculate remaining images needed to complete the order
        const remainingImages = Math.max(0, totalOrdered - primaryCompleted);
        const isOrderFullyPassed = primaryCompleted >= totalOrdered;
        const totalRejected = progressData.totalRejectedInQC || 0;

        return {
            ...order,
            status: isOrderFullyPassed && order.status === 'revision' ? 'in_progress' : order.status,
            productionProgress: {
                totalOrdered,
                overallPercentage,
                stages: progressData.stages,
                clippingPathCount: clippingDone,
                maskingCount: maskingDone,
                retouchingCount: retouchDone,
                ghostMannequinCount: ghostDone,
                primaryCompleted,
                totalRejected,
                remainingImages,
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
        if (log.revision) {
            log.revision.isRevision = false;
            log.revision.resolvedCount = qcData.passedCount;
        }

        // Calculate total cumulative passed images across all logs for this order
        const allOrderLogs = await ShiftProductionModel.find({
            orderId: log.orderId,
        }).lean();

        const totalPassedSoFar = allOrderLogs.reduce((acc, l: any) => {
            if (String(l._id) === String(log._id)) {
                return acc + (qcData.passedCount || 0);
            }
            if (l.qc?.checkedAt) {
                return acc + (l.qc.passedCount || 0);
            }
            return acc;
        }, 0);

        const orderDoc = await OrderModel.findById(log.orderId);
        if (orderDoc) {
            const isFullyCompleted = totalPassedSoFar >= orderDoc.imageQuantity;

            if (isFullyCompleted || orderDoc.status === 'revision') {
                const targetStatus = isFullyCompleted ? 'in_progress' : 'in_progress';
                await OrderModel.findByIdAndUpdate(log.orderId, {
                    status: targetStatus,
                    $push: {
                        timeline: {
                            status: targetStatus,
                            timestamp: new Date(),
                            changedBy: new Types.ObjectId(userId),
                            note: `QC Passed: ${qcData.passedCount} images approved. Total passed: ${totalPassedSoFar}/${orderDoc.imageQuantity}. ${isFullyCompleted ? 'Order 100% passed QC inspection.' : 'Revision resolved.'}`,
                        },
                    },
                });
            }
        }
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
    filterType?: string | undefined;
    month?: number | undefined;
    year?: number | undefined;
}) => {
    const query: any = {};
    if (filters.branchId) {
        query.branchId = new Types.ObjectId(filters.branchId);
    }

    const now = new Date();
    let start: Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let end: Date = new Date();

    if (filters.startDate || filters.endDate) {
        if (filters.startDate) start = new Date(filters.startDate);
        if (filters.endDate) end = new Date(filters.endDate);
    } else if (filters.filterType === 'today') {
        start = startOfDay(now);
        end = endOfDay(now);
    } else if (filters.filterType === 'week') {
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
    } else if (filters.filterType === 'month') {
        const yr = filters.year || now.getFullYear();
        const mo = filters.month || (now.getMonth() + 1);
        start = new Date(yr, mo - 1, 1, 0, 0, 0, 0);
        end = new Date(yr, mo, 0, 23, 59, 59, 999);
    } else if (filters.filterType === 'year') {
        const yr = filters.year || now.getFullYear();
        start = new Date(yr, 0, 1, 0, 0, 0, 0);
        end = new Date(yr, 11, 31, 23, 59, 59, 999);
    } else if (filters.filterType === 'all') {
        start = new Date(0);
        end = new Date();
    }

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

/**
 * Get sanitized active orders for photo editors (NO client or financial data)
 */
const getSanitizedActiveOrders = async (search?: string) => {
    const query: any = {
        status: { $in: ['pending', 'in_progress', 'quality_check', 'revision'] },
    };

    if (search) {
        query.$or = [
            { orderName: { $regex: search, $options: 'i' } },
            { instruction: { $regex: search, $options: 'i' } },
        ];
    }

    const orders = await OrderModel.find(query)
        .select(
            'orderName deadline originalDeadline imageQuantity services requiredSteps returnFileFormat instruction priority notes status createdAt'
        )
        .populate('services', 'name description')
        .populate('returnFileFormat', 'name extension')
        .sort({ deadline: 1, createdAt: -1 })
        .lean();

    // Attach real-time image status summary for each order
    const orderIds = orders.map((o) => o._id);
    const imageStats = await OrderImageModel.aggregate([
        { $match: { orderId: { $in: orderIds } } },
        {
            $group: {
                _id: '$orderId',
                totalRegistered: { $sum: 1 },
                completedCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
                },
                inProgressCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] },
                },
                partiallyCompletedCount: {
                    $sum: {
                        $cond: [{ $eq: ['$status', 'partially_completed'] }, 1, 0],
                    },
                },
                revisionCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'in_revision'] }, 1, 0] },
                },
            },
        },
    ]);

    const statsMap = new Map<string, any>();
    imageStats.forEach((stat) => {
        statsMap.set(stat._id.toString(), stat);
    });

    return orders.map((order) => {
        const stats = statsMap.get(order._id.toString()) || {
            totalRegistered: 0,
            completedCount: 0,
            inProgressCount: 0,
            partiallyCompletedCount: 0,
            revisionCount: 0,
        };

        return {
            _id: order._id,
            orderName: order.orderName,
            deadline: order.deadline,
            originalDeadline: order.originalDeadline,
            imageQuantity: order.imageQuantity,
            services: order.services,
            requiredSteps: order.requiredSteps || [],
            returnFileFormat: order.returnFileFormat,
            instruction: order.instruction,
            priority: order.priority,
            notes: order.notes,
            status: order.status,
            createdAt: order.createdAt,
            imageStats: {
                totalExpected: order.imageQuantity,
                totalRegistered: stats.totalRegistered,
                completedCount: stats.completedCount,
                inProgressCount: stats.inProgressCount,
                partiallyCompletedCount: stats.partiallyCompletedCount,
                revisionCount: stats.revisionCount,
                unassignedCount: Math.max(
                    0,
                    order.imageQuantity -
                        (stats.completedCount +
                            stats.inProgressCount +
                            stats.partiallyCompletedCount +
                            stats.revisionCount)
                ),
            },
        };
    });
};

/**
 * Get detailed image tracking matrix for an order
 */
const getOrderImageStatus = async (
    orderId: string,
    statusFilter?: string,
    search?: string
) => {
    const order = await OrderModel.findById(orderId)
        .select('orderName deadline imageQuantity requiredSteps instruction')
        .lean();

    if (!order) {
        throw new Error('Order not found');
    }

    const query: any = {
        orderId: new Types.ObjectId(orderId),
    };

    if (statusFilter && statusFilter !== 'all') {
        query.status = statusFilter;
    }

    if (search) {
        query.imageName = { $regex: search, $options: 'i' };
    }

    const images = await OrderImageModel.find(query)
        .populate({
            path: 'currentAssignedStaffId',
            select: 'name staffId employeeId designation branchId',
        })
        .populate({
            path: 'completedSteps.completedBy',
            select: 'name staffId designation',
        })
        .populate({
            path: 'revisionHistory.requestedBy',
            select: 'name email role',
        })
        .sort({ updatedAt: -1, imageName: 1 })
        .lean();

    const summaryStats = await OrderImageModel.aggregate([
        { $match: { orderId: new Types.ObjectId(orderId) } },
        {
            $group: {
                _id: null,
                totalRegistered: { $sum: 1 },
                completedCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
                },
                inProgressCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] },
                },
                partiallyCompletedCount: {
                    $sum: {
                        $cond: [{ $eq: ['$status', 'partially_completed'] }, 1, 0],
                    },
                },
                revisionCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'in_revision'] }, 1, 0] },
                },
            },
        },
    ]);

    const stats = summaryStats[0] || {
        totalRegistered: 0,
        completedCount: 0,
        inProgressCount: 0,
        partiallyCompletedCount: 0,
        revisionCount: 0,
    };

    return {
        order: {
            _id: order._id,
            orderName: order.orderName,
            deadline: order.deadline,
            imageQuantity: order.imageQuantity,
            requiredSteps: order.requiredSteps || [],
            instruction: order.instruction,
        },
        images,
        summary: {
            totalExpected: order.imageQuantity,
            totalRegistered: stats.totalRegistered,
            completedCount: stats.completedCount,
            inProgressCount: stats.inProgressCount,
            partiallyCompletedCount: stats.partiallyCompletedCount,
            revisionCount: stats.revisionCount,
            unassignedCount: Math.max(
                0,
                order.imageQuantity -
                    (stats.completedCount +
                        stats.inProgressCount +
                        stats.partiallyCompletedCount +
                        stats.revisionCount)
            ),
        },
    };
};

/**
 * Start a photo editor work session with image concurrency lock
 */
const startWorkSession = async (
    payload: { orderId: string; imageNames: string[]; shiftId?: string | undefined },
    userId: string
) => {
    const staff = await StaffModel.findOne({ userId })
        .populate('userId', 'name email')
        .lean();
    if (!staff) {
        throw new Error('Staff profile not found for this user');
    }
    const staffName = (staff.userId as any)?.name || 'Editor';

    const order = await OrderModel.findById(payload.orderId).lean();
    if (!order) {
        throw new Error('Order not found');
    }

    // Check if staff already has an active work session
    const existingActiveSession = await ProductionWorkSessionModel.findOne({
        staffId: staff._id,
        status: 'active',
    }).populate('orderId', 'orderName deadline').lean();

    if (existingActiveSession) {
        throw new Error(
            `You already have an active work session on order "${
                (existingActiveSession.orderId as any)?.orderName || 'Order'
            }". Please finish or cancel it before starting a new one.`
        );
    }

    // Deduplicate image names and trim
    const cleanImageNames = Array.from(
        new Set(payload.imageNames.map((name) => name.trim()).filter(Boolean))
    );

    if (cleanImageNames.length === 0) {
        throw new Error('No valid image names provided');
    }

    // Concurrency Lock Check: Are any of these images currently locked by someone else?
    const lockedImages = await OrderImageModel.find({
        orderId: new Types.ObjectId(payload.orderId),
        imageName: { $in: cleanImageNames },
        status: 'in_progress',
        currentAssignedStaffId: { $ne: null, $nin: [staff._id] },
    })
        .populate('currentAssignedStaffId', 'name staffId')
        .lean();

    if (lockedImages.length > 0) {
        const lockedDetails = lockedImages
            .map(
                (img: any) =>
                    `"${img.imageName}" (locked by ${img.currentAssignedStaffId?.name || 'another editor'})`
            )
            .join(', ');
        throw new Error(
            `Cannot start work. The following images are currently locked by another editor: ${lockedDetails}`
        );
    }

    // Determine shift ID (from payload, or first active shift in staff's branch)
    let shiftId: Types.ObjectId | undefined = payload.shiftId ? new Types.ObjectId(payload.shiftId) : undefined;
    if (!shiftId && staff.branchId) {
        const anyShift = await ShiftModel.findOne({ branchId: staff.branchId as Types.ObjectId }).lean();
        if (anyShift) {
            shiftId = anyShift._id as Types.ObjectId;
        }
    }

    // Create active ProductionWorkSession
    const session = (await (ProductionWorkSessionModel as any).create({
        staffId: staff._id,
        orderId: order._id,
        shiftId: shiftId || null,
        branchId: (staff.branchId as Types.ObjectId) || null,
        imageNames: cleanImageNames,
        imageCount: cleanImageNames.length,
        startTime: new Date(),
        status: 'active',
        completedSteps: [],
    })) as any;


    // Derive required steps from order snapshot or default list
    const orderRequiredStepNames =
        order.requiredSteps && order.requiredSteps.length > 0
            ? order.requiredSteps.map((s) => s.name)
            : ['Editing & Retouching'];

    // Upsert and Lock each image to this staff and session
    const bulkOps = cleanImageNames.map((imgName) => ({
        updateOne: {
            filter: {
                orderId: order._id,
                imageName: imgName,
            },
            update: {
                $setOnInsert: {
                    requiredSteps: orderRequiredStepNames,
                    completedSteps: [],
                    isRevision: false,
                    revisionHistory: [],
                },
                $set: {
                    status: 'in_progress',
                    currentAssignedStaffId: staff._id,
                    currentSessionId: session._id,
                    lockedAt: new Date(),
                },
            },
            upsert: true,
        },
    }));

    await OrderImageModel.bulkWrite(bulkOps);

    // Update order status to in_progress if currently pending
    if (order.status === 'pending') {
        await OrderModel.findByIdAndUpdate(order._id, {
            status: 'in_progress',
        });
    }

    // Real-time broadcast
    notifyProductionUpdate('production:session_started', {
        sessionId: session._id,
        orderId: order._id,
        orderName: order.orderName,
        staffId: staff._id,
        staffName,
        imageCount: cleanImageNames.length,
    });

    notifyProductionUpdate('production:images_locked', {
        orderId: order._id,
        imageNames: cleanImageNames,
        lockedBy: {
            _id: staff._id,
            name: staffName,
        },
    });

    return {
        session,
        lockedCount: cleanImageNames.length,
        order: {
            _id: order._id,
            orderName: order.orderName,
            deadline: order.deadline,
            requiredSteps: order.requiredSteps || [],
        },
    };
};

/**
 * Get current active work session for a staff user
 */
const getActiveWorkSession = async (userId: string) => {
    const staff = await StaffModel.findOne({ userId }).lean();
    if (!staff) {
        return null;
    }

    const session = await ProductionWorkSessionModel.findOne({
        staffId: staff._id,
        status: 'active',
    })
        .populate({
            path: 'orderId',
            select: 'orderName deadline requiredSteps instruction notes priority',
            populate: {
                path: 'services',
                select: 'name description',
            },
        })
        .lean();

    return session;
};

/**
 * Finish a work session, record completed steps per image, release locks, and update shift production
 */
const finishWorkSession = async (
    payload: {
        sessionId: string;
        completedSteps: string[];
        notes?: string | undefined;
    },
    userId: string
) => {

    const staff = await StaffModel.findOne({ userId }).lean();
    if (!staff) {
        throw new Error('Staff profile not found');
    }

    const session = await ProductionWorkSessionModel.findById(payload.sessionId);
    if (!session) {
        throw new Error('Work session not found');
    }

    if (session.staffId.toString() !== staff._id.toString()) {
        throw new Error('You are not authorized to finish this work session');
    }

    if (session.status !== 'active') {
        throw new Error('This work session is already closed or cancelled');
    }

    const now = new Date();
    const durationSeconds = Math.max(
        1,
        Math.floor((now.getTime() - session.startTime.getTime()) / 1000)
    );

    const order = await OrderModel.findById(session.orderId).lean();
    const orderRequiredSteps =
        order?.requiredSteps && order.requiredSteps.length > 0
            ? order.requiredSteps.map((s) => s.name)
            : ['Editing & Retouching'];

    // Update each image in this session
    const images = await OrderImageModel.find({
        orderId: session.orderId,
        imageName: { $in: session.imageNames },
    });

    for (const image of images) {
        // Append completed steps
        for (const stepName of payload.completedSteps) {
            image.completedSteps.push({
                stepName,
                completedBy: staff._id,
                shiftId: session.shiftId || null,
                completedAt: now,
                durationSeconds: Math.floor(durationSeconds / session.imageCount),
                sessionId: session._id,
            });
        }

        // Determine if all required steps are completed
        const requiredStepsList =
            image.requiredSteps && image.requiredSteps.length > 0
                ? image.requiredSteps
                : orderRequiredSteps;

        const completedSet = new Set(image.completedSteps.map((s) => s.stepName));
        const isAllDone = requiredStepsList.every((reqStep) => completedSet.has(reqStep));

        if (isAllDone && requiredStepsList.length > 0) {
            image.status = 'completed';
        } else {
            image.status = 'partially_completed';
        }

        // Release concurrency lock so other editors can work on remaining steps
        image.currentAssignedStaffId = null as any;
        image.currentSessionId = null as any;
        image.lockedAt = null as any;

        // If it was a revision, mark resolved
        if (image.isRevision) {
            image.isRevision = false;
            if (image.revisionHistory && image.revisionHistory.length > 0) {
                const lastRev = image.revisionHistory[image.revisionHistory.length - 1];
                if (lastRev && !lastRev.resolvedAt) {
                    lastRev.resolvedAt = now;
                    lastRev.resolvedBy = staff._id;
                }
            }
        }

        await image.save();
    }

    // Update session record
    session.status = 'completed';
    session.endTime = now;
    session.durationSeconds = durationSeconds;
    session.completedSteps = payload.completedSteps;
    if (payload.notes) session.notes = payload.notes;
    await session.save();

    // Auto-sync into daily shift production record for seamless supervisor reporting
    try {
        if (session.shiftId) {
            const startOfToday = new Date(now);
            startOfToday.setHours(0, 0, 0, 0);
            const endOfToday = new Date(now);
            endOfToday.setHours(23, 59, 59, 999);

            const existingShiftLog = await ShiftProductionModel.findOne({
                orderId: session.orderId,
                shiftId: session.shiftId,
                date: { $gte: startOfToday, $lte: endOfToday },
                'qc.checkedAt': { $exists: false },
            });

            if (existingShiftLog) {
                existingShiftLog.completedQuantity =
                    (existingShiftLog.completedQuantity || 0) + session.imageCount;
                const matchStaff = existingShiftLog.assignedStaffs.find(
                    (s) => s.staffId.toString() === staff._id.toString()
                );
                if (matchStaff) {
                    matchStaff.imageCount = (matchStaff.imageCount || 0) + session.imageCount;
                } else {
                    existingShiftLog.assignedStaffs.push({
                        staffId: staff._id,
                        imageCount: session.imageCount,
                        notes: payload.completedSteps.join(', '),
                    });
                }
                await existingShiftLog.save();
            } else {
                await (ShiftProductionModel as any).create({
                    orderId: session.orderId,
                    shiftId: session.shiftId,
                    branchId: session.branchId || staff.branchId,
                    date: now,
                    teamLeaderId: staff.userId,
                    stage: 'other',
                    customStageName: payload.completedSteps.join(', '),
                    completedQuantity: session.imageCount,
                    targetQuantity: session.imageCount,
                    status: 'completed',
                    assignedStaffs: [
                        {
                            staffId: staff._id,
                            imageCount: session.imageCount,
                            notes: payload.completedSteps.join(', '),
                        },
                    ],
                });
            }
        }
    } catch (shiftSyncErr) {
        console.error('Failed to sync session with shift log:', shiftSyncErr);
    }


    // Check if entire order is completed
    const remainingIncompleteImages = await OrderImageModel.countDocuments({
        orderId: session.orderId,
        status: { $ne: 'completed' },
    });

    const totalOrderImages = await OrderImageModel.countDocuments({
        orderId: session.orderId,
    });

    if (
        totalOrderImages >= (order?.imageQuantity || 1) &&
        remainingIncompleteImages === 0
    ) {
        await OrderModel.findByIdAndUpdate(session.orderId, {
            status: 'quality_check',
        });
    }

    // Broadcast real-time update
    notifyProductionUpdate('production:session_finished', {
        sessionId: session._id,
        orderId: session.orderId,
        staffId: staff._id,
        imageCount: session.imageCount,
        completedSteps: payload.completedSteps,
        durationSeconds,
    });

    notifyProductionUpdate('production:images_updated', {
        orderId: session.orderId,
    });

    return {
        session,
        durationSeconds,
        imagesCompleted: session.imageCount,
        completedSteps: payload.completedSteps,
    };
};

/**
 * Cancel an active work session and release locks
 */
const cancelWorkSession = async (
    sessionId: string,
    userId: string,
    reason?: string
) => {
    const staff = await StaffModel.findOne({ userId }).lean();
    if (!staff) {
        throw new Error('Staff profile not found');
    }

    const session = await ProductionWorkSessionModel.findById(sessionId);
    if (!session) {
        throw new Error('Work session not found');
    }

    if (session.staffId.toString() !== staff._id.toString()) {
        throw new Error('You are not authorized to cancel this session');
    }

    if (session.status !== 'active') {
        throw new Error('Session is not currently active');
    }

    // Unlock images in OrderImage
    const images = await OrderImageModel.find({
        orderId: session.orderId,
        imageName: { $in: session.imageNames },
        currentSessionId: session._id,
    });

    for (const img of images) {
        img.currentAssignedStaffId = null as any;
        img.currentSessionId = null as any;
        img.lockedAt = null as any;
        if (img.completedSteps && img.completedSteps.length > 0) {
            img.status = 'partially_completed';
        } else {
            img.status = 'unassigned';
        }
        await img.save();
    }

    session.status = 'cancelled';
    session.endTime = new Date();
    if (reason) session.notes = reason;
    await session.save();

    notifyProductionUpdate('production:session_cancelled', {
        sessionId: session._id,
        orderId: session.orderId,
    });

    notifyProductionUpdate('production:images_updated', {
        orderId: session.orderId,
    });

    return { success: true, message: 'Work session cancelled and images unlocked' };
};

/**
 * Flag specific images in an order for revision
 */
const flagImageRevision = async (
    payload: {
        orderId: string;
        imageNames: string[];
        instruction: string;
    },
    userId: string
) => {
    const order = await OrderModel.findById(payload.orderId);
    if (!order) {
        throw new Error('Order not found');
    }

    const now = new Date();

    for (const imgName of payload.imageNames) {
        let orderImage = await OrderImageModel.findOne({
            orderId: order._id,
            imageName: imgName.trim(),
        });

        if (!orderImage) {
            orderImage = new OrderImageModel({
                orderId: order._id,
                imageName: imgName.trim(),
                requiredSteps:
                    order.requiredSteps?.map((s) => s.name) || ['Editing & Retouching'],
                completedSteps: [],
            });
        }

        orderImage.status = 'in_revision';
        orderImage.isRevision = true;
        orderImage.currentAssignedStaffId = null as any;
        orderImage.currentSessionId = null as any;
        orderImage.lockedAt = null as any;
        orderImage.revisionHistory.push({
            instruction: payload.instruction,
            requestedBy: new Types.ObjectId(userId),
            createdAt: now,
        });

        await orderImage.save();
    }

    // Update order status to revision
    order.status = 'revision';
    order.revisionCount = (order.revisionCount || 0) + 1;
    order.revisionInstructions.push({
        instruction: payload.instruction,
        createdAt: now,
        createdBy: new Types.ObjectId(userId),
    });
    await order.save();

    notifyProductionUpdate('production:images_updated', {
        orderId: order._id,
    });

    return {
        success: true,
        message: `${payload.imageNames.length} image(s) flagged for revision`,
    };
};

/**
 * Detailed staff performance analytics (Hourly, Daily, Monthly, Yearly, Shift-wise)
 */
const getStaffPerformanceAnalytics = async (filters: {
    startDate?: string | undefined;
    endDate?: string | undefined;
    month?: number | undefined;
    year?: number | undefined;
    staffId?: string | undefined;
    shiftId?: string | undefined;
    branchId?: string | undefined;
    filterType?: string | undefined;
}) => {

    const query: any = {
        status: 'completed',
    };

    if (filters.staffId && filters.staffId !== 'all') {
        query.staffId = new Types.ObjectId(filters.staffId);
    }

    if (filters.shiftId && filters.shiftId !== 'all') {
        query.shiftId = new Types.ObjectId(filters.shiftId);
    }

    if (filters.branchId && filters.branchId !== 'all') {
        query.branchId = new Types.ObjectId(filters.branchId);
    }

    // Date range filters
    const now = new Date();
    if (filters.filterType === 'today') {
        query.startTime = { $gte: startOfDay(now), $lte: endOfDay(now) };
    } else if (filters.filterType === 'week') {
        query.startTime = { $gte: startOfWeek(now), $lte: endOfWeek(now) };
    } else if (filters.filterType === 'month' || (filters.month && filters.year)) {
        const m = filters.month || now.getMonth() + 1;
        const y = filters.year || now.getFullYear();
        const start = new Date(y, m - 1, 1);
        const end = new Date(y, m, 0, 23, 59, 59, 999);
        query.startTime = { $gte: start, $lte: end };
    } else if (filters.filterType === 'year' || filters.year) {
        const y = filters.year || now.getFullYear();
        const start = new Date(y, 0, 1);
        const end = new Date(y, 11, 31, 23, 59, 59, 999);
        query.startTime = { $gte: start, $lte: end };
    } else if (filters.startDate && filters.endDate) {
        query.startTime = {
            $gte: new Date(filters.startDate),
            $lte: new Date(filters.endDate),
        };
    }

    // 1. Staff Leaderboard & Individual Output
    const staffSummary = await ProductionWorkSessionModel.aggregate([
        { $match: query },
        {
            $group: {
                _id: '$staffId',
                totalSessions: { $sum: 1 },
                totalImages: { $sum: '$imageCount' },
                totalDurationSeconds: { $sum: '$durationSeconds' },
                completedSteps: { $push: '$completedSteps' },
            },
        },
        {
            $lookup: {
                from: 'staffs',
                localField: '_id',
                foreignField: '_id',
                as: 'staffInfo',
            },
        },
        { $unwind: '$staffInfo' },
        {
            $project: {
                staffId: '$_id',
                staffName: '$staffInfo.name',
                employeeId: '$staffInfo.staffId',
                designation: '$staffInfo.designation',
                totalSessions: 1,
                totalImages: 1,
                totalDurationSeconds: 1,
                totalHours: {
                    $round: [{ $divide: ['$totalDurationSeconds', 3600] }, 2],
                },
                avgSecondsPerImage: {
                    $cond: [
                        { $gt: ['$totalImages', 0] },
                        { $round: [{ $divide: ['$totalDurationSeconds', '$totalImages'] }, 0] },
                        0,
                    ],
                },
                completedSteps: 1,
            },
        },
        { $sort: { totalImages: -1 } },
    ]);

    // 2. Shift-wise performance comparison
    const shiftOutput = await ProductionWorkSessionModel.aggregate([
        { $match: query },
        {
            $group: {
                _id: '$shiftId',
                totalImages: { $sum: '$imageCount' },
                totalSessions: { $sum: 1 },
                totalDurationSeconds: { $sum: '$durationSeconds' },
            },
        },
        {
            $lookup: {
                from: 'shifts',
                localField: '_id',
                foreignField: '_id',
                as: 'shiftInfo',
            },
        },
        { $unwind: { path: '$shiftInfo', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                shiftId: '$_id',
                shiftName: { $ifNull: ['$shiftInfo.name', 'General Shift'] },
                shiftCode: '$shiftInfo.shiftCode',
                totalImages: 1,
                totalSessions: 1,
                totalHours: {
                    $round: [{ $divide: ['$totalDurationSeconds', 3600] }, 2],
                },
            },
        },
        { $sort: { totalImages: -1 } },
    ]);

    // 3. Step/Sub-Service Breakdown
    const stepBreakdownMap: Record<string, number> = {};
    staffSummary.forEach((s) => {
        (s.completedSteps || []).forEach((stepList: string[]) => {
            (stepList || []).forEach((step) => {
                stepBreakdownMap[step] = (stepBreakdownMap[step] || 0) + 1;
            });
        });
    });

    // 4. Overall Totals
    const totalImagesAgg = staffSummary.reduce((acc, s) => acc + s.totalImages, 0);
    const totalSessionsAgg = staffSummary.reduce((acc, s) => acc + s.totalSessions, 0);
    const totalHoursAgg = staffSummary.reduce((acc, s) => acc + s.totalHours, 0);

    return {
        summary: {
            totalImages: totalImagesAgg,
            totalSessions: totalSessionsAgg,
            totalHours: Number(totalHoursAgg.toFixed(2)),
            activeStaffCount: staffSummary.length,
        },
        staffPerformance: staffSummary.map((s) => ({
            staffId: s.staffId,
            staffName: s.staffName,
            employeeId: s.employeeId,
            designation: s.designation,
            totalSessions: s.totalSessions,
            totalImages: s.totalImages,
            totalHours: s.totalHours,
            avgSecondsPerImage: s.avgSecondsPerImage,
        })),
        shiftPerformance: shiftOutput,
        stepBreakdown: Object.entries(stepBreakdownMap).map(([step, count]) => ({
            stepName: step,
            count,
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
    getSanitizedActiveOrders,
    getOrderImageStatus,
    startWorkSession,
    getActiveWorkSession,
    finishWorkSession,
    cancelWorkSession,
    flagImageRevision,
    getStaffPerformanceAnalytics,
};

export default productionService;

