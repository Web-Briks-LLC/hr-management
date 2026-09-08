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
 * Effective (billable) work seconds for a session, excluding every hold interval.
 *
 *   effective = (end | now - start) - totalPausedSeconds - openHold
 *
 * `openHold` is the currently-running hold (only when status === 'paused').
 * Used everywhere a session's real work time matters: finishing, reassigning,
 * analytics and the live floor monitor — so "held time never counts".
 */
const computeEffectiveSeconds = (
    session: {
        startTime: Date;
        endTime?: Date | null;
        status: string;
        pausedAt?: Date | null;
        totalPausedSeconds?: number | null;
    },
    now: Date = new Date()
): number => {
    const endBase = session.endTime ? session.endTime.getTime() : now.getTime();
    const rawSeconds = Math.floor((endBase - session.startTime.getTime()) / 1000);
    let pausedSeconds = session.totalPausedSeconds || 0;
    if (session.status === 'paused' && session.pausedAt) {
        pausedSeconds += Math.floor((now.getTime() - session.pausedAt.getTime()) / 1000);
    }
    return Math.max(0, rawSeconds - pausedSeconds);
};

/**
 * Release the concurrency locks held by a session's images. Mirrors the
 * behaviour of the editor cancel path: images that had partial step progress
 * fall back to `partially_completed`, everything else to `unassigned`.
 */
const unlockSessionImages = async (session: {
    _id: Types.ObjectId;
    orderId: Types.ObjectId;
    imageNames: string[];
}) => {
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
        .populate('revisionInstructions.createdBy', 'name email')
        .lean();

    if (!order) {
        throw new Error('Order not found');
    }

    // Legacy per-shift team-leader logs. Left in place for branches that use
    // the shift-production workflow, but many orders (worked on via the
    // individual editor work-session flow) will have zero of these — that is
    // not itself a sign nothing happened, see workSessions/revisions below.
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

    // Individual editor work sessions (lock -> finish/cancel), which is the
    // actual source of truth for who worked on this order and when — this
    // previously had no visibility in the timeline drawer at all.
    const workSessions = await ProductionWorkSessionModel.find({
        orderId: new Types.ObjectId(orderId),
    })
        .populate({
            path: 'staffId',
            select: 'staffId userId',
            populate: { path: 'userId', select: 'name email' },
        })
        .sort({ startTime: 1 })
        .lean();

    // Revision instructions, cross-referenced with the OrderImage records
    // that were actually flagged in the same call, so each entry shows which
    // images it applied to. Previously revisionInstructions existed on the
    // Order but were never surfaced anywhere in the UI.
    const imagesWithRevisions = await OrderImageModel.find({
        orderId: new Types.ObjectId(orderId),
        'revisionHistory.0': { $exists: true },
    })
        .select('imageName revisionHistory')
        .lean();

    const revisions = (order.revisionInstructions || []).map((ri) => {
        const riTime = new Date(ri.createdAt).getTime();
        const affectedImages = imagesWithRevisions
            .filter((img) =>
                (img.revisionHistory || []).some(
                    (rh) =>
                        rh.instruction === ri.instruction &&
                        rh.createdAt &&
                        Math.abs(new Date(rh.createdAt).getTime() - riTime) < 10_000
                )
            )
            .map((img) => img.imageName);

        return {
            instruction: ri.instruction,
            createdAt: ri.createdAt,
            createdBy: ri.createdBy,
            affectedImages,
        };
    });

    return {
        order,
        logs,
        workSessions,
        revisions,
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
const getSanitizedActiveOrders = async (search?: string, includeCompleted?: boolean) => {
    const activeStatuses = ['pending', 'in_progress', 'quality_check', 'revision'];
    const query: any = {
        // Completed orders are excluded by default (e.g. the editor's "pick an order
        // to work on" list), but views like the QC/Image Tracking grid need them to
        // stay visible after the last image is approved instead of vanishing.
        status: { $in: includeCompleted ? [...activeStatuses, 'completed'] : activeStatuses },
    };

    if (search) {
        query.$or = [
            { orderName: { $regex: search, $options: 'i' } },
            { instruction: { $regex: search, $options: 'i' } },
        ];
    }

    const orders = await OrderModel.find(query)
        .select(
            'orderName clientId deadline originalDeadline imageQuantity services requiredSteps returnFileFormat instruction priority notes status createdAt'
        )
        .populate('clientId', 'clientId name')
        .populate('services', 'name description')
        .populate('returnFileFormat', 'name extension')
        .sort({ createdAt: -1 })
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
                pendingQcCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'pending_qc'] }, 1, 0] },
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
            pendingQcCount: 0,
            revisionCount: 0,
        };

        return {
            _id: order._id,
            orderName: order.orderName,
            clientId: order.clientId,
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
                pendingQcCount: stats.pendingQcCount,
                revisionCount: stats.revisionCount,
                unassignedCount: Math.max(
                    0,
                    order.imageQuantity -
                        (stats.completedCount +
                            stats.inProgressCount +
                            stats.partiallyCompletedCount +
                            stats.pendingQcCount +
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
                pendingQcCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'pending_qc'] }, 1, 0] },
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
        pendingQcCount: 0,
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
            pendingQcCount: stats.pendingQcCount,
            revisionCount: stats.revisionCount,
            unassignedCount: Math.max(
                0,
                order.imageQuantity -
                    (stats.completedCount +
                        stats.inProgressCount +
                        stats.partiallyCompletedCount +
                        stats.pendingQcCount +
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
        .populate({
            path: 'currentAssignedStaffId',
            select: 'staffId userId',
            populate: { path: 'userId', select: 'name' },
        })
        .lean();

    if (lockedImages.length > 0) {
        const lockedDetails = lockedImages
            .map((img: any) => {
                const lockOwner = img.currentAssignedStaffId;
                const lockOwnerName =
                    lockOwner?.userId?.name || lockOwner?.staffId || 'another editor';
                return `"${img.imageName}" (locked by ${lockOwnerName})`;
            })
            .join(', ');
        throw new Error(
            `Cannot start work. The following images are currently locked by another editor: ${lockedDetails}`
        );
    }

    // Images that have already finished the editing stage (awaiting or passed
    // QC) must not be reopened by an editor picking them again for a new
    // session — that would silently reset their status/progress. Only QC
    // rejecting an image back to 'in_revision' should make it workable again.
    const nonReworkableImages = await OrderImageModel.find({
        orderId: new Types.ObjectId(payload.orderId),
        imageName: { $in: cleanImageNames },
        status: { $in: ['completed', 'pending_qc'] },
    }).lean();

    if (nonReworkableImages.length > 0) {
        const details = nonReworkableImages
            .map(
                (img) =>
                    `"${img.imageName}" (${
                        img.status === 'completed'
                            ? 'already approved'
                            : 'awaiting QC review'
                    })`
            )
            .join(', ');
        throw new Error(
            `Cannot start work. The following images are already submitted and cannot be reopened: ${details}`
        );
    }

    // Guard: an editor with a held (paused) session must not pull the same
    // images into a second session — those images stay locked to the held one.
    const ownHeldLocked = await OrderImageModel.find({
        orderId: new Types.ObjectId(payload.orderId),
        imageName: { $in: cleanImageNames },
        currentAssignedStaffId: staff._id,
        currentSessionId: { $ne: null },
    })
        .select('imageName')
        .lean();

    if (ownHeldLocked.length > 0) {
        const names = ownHeldLocked.map((i) => `"${i.imageName}"`).join(', ');
        throw new Error(
            `These image(s) are still locked to your held session: ${names}. Resume that session to continue them, or pick different images.`
        );
    }

    // Quantity validation: the number of distinct images registered against an
    // order can never exceed the order's ordered image quantity. Counts images
    // already registered (any non-cancelled state) plus the new batch.
    const alreadyRegisteredCount = await OrderImageModel.countDocuments({
        orderId: new Types.ObjectId(payload.orderId),
        imageName: { $nin: cleanImageNames },
    });

    if (alreadyRegisteredCount + cleanImageNames.length > (order.imageQuantity || 0)) {
        const remaining = Math.max(0, (order.imageQuantity || 0) - alreadyRegisteredCount);
        throw new Error(
            `This order is for ${order.imageQuantity} image(s). ${alreadyRegisteredCount} are already registered, so you can add at most ${remaining} more — you tried to add ${cleanImageNames.length}.`
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

    // Primary session for the banner: the live `active` one if there is one,
    // otherwise the oldest held session so the editor can still see/resume it.
    const session = await ProductionWorkSessionModel.findOne({
        staffId: staff._id,
        status: { $in: ['active', 'paused'] },
    })
        .sort({ status: 1, startTime: 1 }) // 'active' sorts before 'paused'
        .populate({
            path: 'orderId',
            select: 'orderName deadline requiredSteps instruction notes priority imageQuantity status',
            populate: {
                path: 'services',
                select: 'name description',
            },
        })
        .lean();

    return session;
};

/**
 * Every held (paused) session for the current editor — powers the "On hold"
 * list in the workstation so multiple parked sessions stay visible/resumable.
 */
const getHeldWorkSessions = async (userId: string) => {
    const staff = await StaffModel.findOne({ userId }).lean();
    if (!staff) {
        return [];
    }

    const sessions = await ProductionWorkSessionModel.find({
        staffId: staff._id,
        status: 'paused',
    })
        .sort({ pausedAt: 1 })
        .populate({
            path: 'orderId',
            select: 'orderName deadline requiredSteps instruction notes priority imageQuantity status',
            populate: { path: 'services', select: 'name description' },
        })
        .lean();

    return sessions.map((s) => ({
        ...s,
        effectiveSeconds: computeEffectiveSeconds(s as any),
        cumulativeSeconds:
            computeEffectiveSeconds(s as any) + (s.priorAccumulatedSeconds || 0),
    }));
};

/**
 * Put an active session on hold. While held its timer is frozen (the elapsed
 * hold time is later subtracted) and the editor is free to start / resume a
 * different session. Images stay locked to the held session.
 */
const pauseWorkSession = async (sessionId: string, userId: string) => {
    const staff = await StaffModel.findOne({ userId }).lean();
    if (!staff) {
        throw new Error('Staff profile not found');
    }

    const session = await ProductionWorkSessionModel.findById(sessionId);
    if (!session) {
        throw new Error('Work session not found');
    }
    if (session.staffId.toString() !== staff._id.toString()) {
        throw new Error('You can only hold your own work session');
    }
    if (session.status !== 'active') {
        throw new Error('Only an active session can be put on hold');
    }

    const now = new Date();
    session.status = 'paused';
    session.pausedAt = now;
    session.pauseHistory.push({
        pausedAt: now,
        resumedAt: null,
        byUserId: new Types.ObjectId(userId),
    });
    await session.save();

    notifyProductionUpdate('production:session_paused', {
        sessionId: session._id,
        orderId: session.orderId,
        staffId: staff._id,
    });

    return session.toObject();
};

/**
 * Resume a held session. Blocked if the editor already has another active
 * session — they must hold or finish that one first (one live timer per editor).
 */
const resumeWorkSession = async (sessionId: string, userId: string) => {
    const staff = await StaffModel.findOne({ userId }).lean();
    if (!staff) {
        throw new Error('Staff profile not found');
    }

    const session = await ProductionWorkSessionModel.findById(sessionId);
    if (!session) {
        throw new Error('Work session not found');
    }
    if (session.staffId.toString() !== staff._id.toString()) {
        throw new Error('You can only resume your own work session');
    }
    if (session.status !== 'paused') {
        throw new Error('This session is not on hold');
    }

    const otherActive = await ProductionWorkSessionModel.findOne({
        staffId: staff._id,
        status: 'active',
        _id: { $ne: session._id },
    })
        .populate('orderId', 'orderName')
        .lean();

    if (otherActive) {
        throw new Error(
            `You have an active session on "${
                (otherActive.orderId as any)?.orderName || 'another order'
            }". Hold or finish it before resuming this one.`
        );
    }

    const now = new Date();
    if (session.pausedAt) {
        const heldSeconds = Math.floor(
            (now.getTime() - session.pausedAt.getTime()) / 1000
        );
        session.totalPausedSeconds = (session.totalPausedSeconds || 0) + Math.max(0, heldSeconds);
        const openEntry = [...session.pauseHistory]
            .reverse()
            .find((p) => !p.resumedAt);
        if (openEntry) {
            openEntry.resumedAt = now;
        }
    }
    session.status = 'active';
    session.pausedAt = null;
    await session.save();

    notifyProductionUpdate('production:session_resumed', {
        sessionId: session._id,
        orderId: session.orderId,
        staffId: staff._id,
    });

    return session.toObject();
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

    if (session.status !== 'active' && session.status !== 'paused') {
        throw new Error('This work session is already closed or cancelled');
    }

    return finalizeSessionCompletion(session, {
        completedSteps: payload.completedSteps,
        notes: payload.notes,
    });
};

/**
 * Shared close-out for a work session (owner finish + supervisor force-finish).
 * Records effective work time (holds excluded), stamps completed steps on every
 * image in the batch, releases locks, syncs the daily shift log and rolls the
 * order up to Quality Check when every image is done.
 */
const finalizeSessionCompletion = async (
    session: any,
    opts: {
        completedSteps: string[];
        notes?: string | undefined;
        closedByUserId?: string | null | undefined;
    }
) => {
    const staff = await StaffModel.findById(session.staffId).lean();
    if (!staff) {
        throw new Error('Editor profile for this session was not found');
    }

    const now = new Date();

    // Close any open hold so its elapsed time is excluded from the total.
    if (session.status === 'paused' && session.pausedAt) {
        const heldSeconds = Math.floor(
            (now.getTime() - session.pausedAt.getTime()) / 1000
        );
        session.totalPausedSeconds =
            (session.totalPausedSeconds || 0) + Math.max(0, heldSeconds);
        const openEntry = [...session.pauseHistory]
            .reverse()
            .find((p: any) => !p.resumedAt);
        if (openEntry) openEntry.resumedAt = now;
        session.pausedAt = null;
        session.status = 'active';
    }

    const durationSeconds = Math.max(1, computeEffectiveSeconds(session, now));

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

    // Dedupe defensively against the same step name being submitted twice in
    // one request (e.g. a double-click), which used to create duplicate
    // completedSteps entries and skew per-step duration stats.
    const uniqueCompletedSteps = Array.from(new Set(opts.completedSteps));

    for (const image of images) {
        // A step already recorded for this image (from a previous session)
        // should not be re-appended — that inflated completedSteps with
        // duplicates every time a batch was re-locked to finish remaining
        // steps.
        const alreadyDoneStepNames = new Set(
            image.completedSteps.map((s) => s.stepName)
        );

        for (const stepName of uniqueCompletedSteps) {
            if (alreadyDoneStepNames.has(stepName)) continue;
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
            // Editor work is done, but the image still needs to pass Quality Check
            // (QA Analyst / Team Leader / Admin / Super Admin) before it counts as complete.
            image.status = 'pending_qc';
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
    session.completedSteps = uniqueCompletedSteps;
    if (opts.notes) session.notes = opts.notes;
    if (opts.closedByUserId) {
        session.closedBy = new Types.ObjectId(opts.closedByUserId);
        session.closeReason = opts.notes || 'Force-finished by supervisor';
    }
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
                        notes: uniqueCompletedSteps.join(', '),
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
                    customStageName: uniqueCompletedSteps.join(', '),
                    completedQuantity: session.imageCount,
                    targetQuantity: session.imageCount,
                    status: 'completed',
                    assignedStaffs: [
                        {
                            staffId: staff._id,
                            imageCount: session.imageCount,
                            notes: uniqueCompletedSteps.join(', '),
                        },
                    ],
                });
            }
        }
    } catch (shiftSyncErr) {
        console.error('Failed to sync session with shift log:', shiftSyncErr);
    }


    // Check if editors are done with every image in the order (either fully
    // completed already or awaiting QC review) so the order can move to the
    // Quality Check stage.
    const remainingIncompleteImages = await OrderImageModel.countDocuments({
        orderId: session.orderId,
        status: { $nin: ['completed', 'pending_qc'] },
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
        completedSteps: uniqueCompletedSteps,
        durationSeconds,
    });

    notifyProductionUpdate('production:images_updated', {
        orderId: session.orderId,
    });

    return {
        session,
        durationSeconds,
        imagesCompleted: session.imageCount,
        completedSteps: uniqueCompletedSteps,
    };
};

/**
 * Cancel an active/held work session and release locks.
 * `actingUserId` differs from the session owner only on the supervisor
 * (force-cancel) path, in which case it is stamped on `closedBy`.
 */
const cancelWorkSession = async (
    sessionId: string,
    userId: string,
    reason?: string,
    options?: { isSupervisor?: boolean }
) => {
    const session = await ProductionWorkSessionModel.findById(sessionId);
    if (!session) {
        throw new Error('Work session not found');
    }

    const isSupervisor = options?.isSupervisor === true;

    if (!isSupervisor) {
        const staff = await StaffModel.findOne({ userId }).lean();
        if (!staff) {
            throw new Error('Staff profile not found');
        }
        if (session.staffId.toString() !== staff._id.toString()) {
            throw new Error('You are not authorized to cancel this session');
        }
    }

    if (session.status !== 'active' && session.status !== 'paused') {
        throw new Error('Session is not currently active or on hold');
    }

    await unlockSessionImages(session as any);

    const now = new Date();
    session.durationSeconds = computeEffectiveSeconds(session as any, now);
    session.status = 'cancelled';
    session.endTime = now;
    session.pausedAt = null;
    if (reason) session.notes = reason;
    if (isSupervisor) {
        session.closedBy = new Types.ObjectId(userId);
        session.closeReason = reason || 'Force-cancelled by supervisor';
    }
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
 * Supervisor (Admin / HR / Team Leader) force-finish of another editor's
 * session. Delegates to the shared completion path with `closedBy` stamped.
 */
const adminFinishWorkSession = async (
    payload: { sessionId: string; completedSteps: string[]; notes?: string | undefined },
    actingUserId: string
) => {
    const session = await ProductionWorkSessionModel.findById(payload.sessionId);
    if (!session) {
        throw new Error('Work session not found');
    }
    if (session.status !== 'active' && session.status !== 'paused') {
        throw new Error('This work session is already closed');
    }

    return finalizeSessionCompletion(session, {
        completedSteps: payload.completedSteps,
        notes: payload.notes,
        closedByUserId: actingUserId,
    });
};

/**
 * Reassign a live/held session to a different editor.
 *
 * The outgoing session is closed with status `reassigned` — its effective
 * work time is frozen into `durationSeconds` and STILL counts in analytics.
 * A brand-new session is created for the incoming editor with a fresh
 * `startTime` (new countdown) but carrying `priorAccumulatedSeconds` so the
 * cumulative time across everyone who touched this batch stays visible.
 * Image locks (and all completed-step progress) transfer as-is.
 */
const reassignWorkSession = async (
    payload: { sessionId: string; newStaffId: string; note?: string | undefined },
    actingUserId: string
) => {
    const oldSession = await ProductionWorkSessionModel.findById(payload.sessionId);
    if (!oldSession) {
        throw new Error('Work session not found');
    }
    if (oldSession.status !== 'active' && oldSession.status !== 'paused') {
        throw new Error('Only an active or held session can be reassigned');
    }

    const newStaff = await StaffModel.findById(payload.newStaffId)
        .populate('userId', 'name email')
        .lean();
    if (!newStaff) {
        throw new Error('Target editor not found');
    }
    if (newStaff._id.toString() === oldSession.staffId.toString()) {
        throw new Error('Session is already assigned to this editor');
    }

    const newStaffActive = await ProductionWorkSessionModel.findOne({
        staffId: newStaff._id,
        status: 'active',
    })
        .populate('orderId', 'orderName')
        .lean();
    if (newStaffActive) {
        throw new Error(
            `${
                (newStaff.userId as any)?.name || 'That editor'
            } already has an active session on "${
                (newStaffActive.orderId as any)?.orderName || 'another order'
            }". They must hold or finish it first.`
        );
    }

    const now = new Date();

    // Freeze the outgoing session's effective time.
    if (oldSession.status === 'paused' && oldSession.pausedAt) {
        const heldSeconds = Math.floor(
            (now.getTime() - oldSession.pausedAt.getTime()) / 1000
        );
        oldSession.totalPausedSeconds =
            (oldSession.totalPausedSeconds || 0) + Math.max(0, heldSeconds);
        const openEntry = [...oldSession.pauseHistory]
            .reverse()
            .find((p: any) => !p.resumedAt);
        if (openEntry) openEntry.resumedAt = now;
        oldSession.pausedAt = null;
    }
    const frozenSeconds = computeEffectiveSeconds(
        { ...oldSession.toObject(), status: 'active', endTime: now } as any,
        now
    );
    oldSession.status = 'reassigned';
    oldSession.endTime = now;
    oldSession.durationSeconds = frozenSeconds;
    oldSession.closedBy = new Types.ObjectId(actingUserId);
    oldSession.closeReason =
        payload.note || `Reassigned to ${(newStaff.userId as any)?.name || 'another editor'}`;

    let shiftId: Types.ObjectId | null = oldSession.shiftId || null;
    if (newStaff.branchId) {
        const branchShift = await ShiftModel.findOne({
            branchId: newStaff.branchId as Types.ObjectId,
        }).lean();
        if (branchShift) shiftId = branchShift._id as Types.ObjectId;
    }

    const newSession = (await (ProductionWorkSessionModel as any).create({
        staffId: newStaff._id,
        orderId: oldSession.orderId,
        shiftId,
        branchId: (newStaff.branchId as Types.ObjectId) || oldSession.branchId || null,
        imageNames: oldSession.imageNames,
        imageCount: oldSession.imageCount,
        startTime: now,
        status: 'active',
        completedSteps: [],
        priorAccumulatedSeconds:
            (oldSession.priorAccumulatedSeconds || 0) + frozenSeconds,
        reassignedFromSessionId: oldSession._id,
    })) as any;

    oldSession.reassignedToSessionId = newSession._id;
    await oldSession.save();

    // Transfer the image locks to the incoming editor / session.
    await OrderImageModel.updateMany(
        {
            orderId: oldSession.orderId,
            imageName: { $in: oldSession.imageNames },
            currentSessionId: oldSession._id,
        },
        {
            $set: {
                status: 'in_progress',
                currentAssignedStaffId: newStaff._id,
                currentSessionId: newSession._id,
                lockedAt: now,
            },
        }
    );

    notifyProductionUpdate('production:session_reassigned', {
        fromSessionId: oldSession._id,
        toSessionId: newSession._id,
        orderId: oldSession.orderId,
        fromStaffId: oldSession.staffId,
        toStaffId: newStaff._id,
    });
    notifyProductionUpdate('production:images_locked', {
        orderId: oldSession.orderId,
        imageNames: oldSession.imageNames,
        lockedBy: { _id: newStaff._id, name: (newStaff.userId as any)?.name || 'Editor' },
    });
    notifyProductionUpdate('production:images_updated', { orderId: oldSession.orderId });

    const populated = await ProductionWorkSessionModel.findById(newSession._id)
        .populate({
            path: 'staffId',
            select: 'staffId designation userId',
            populate: { path: 'userId', select: 'name email' },
        })
        .populate('orderId', 'orderName deadline requiredSteps priority imageQuantity')
        .lean();

    return {
        success: true,
        message: `Reassigned to ${(newStaff.userId as any)?.name || 'the selected editor'}. A fresh countdown has started; the previous editor's ${Math.round(
            frozenSeconds / 60
        )} min still counts.`,
        session: populated,
        previousDurationSeconds: frozenSeconds,
    };
};

/**
 * Live floor monitor feed for Admin / HR / Team Leader: every active + held
 * session with computed live timers, plus a per-editor rollup.
 */
const getLiveWorkSessions = async (userId?: string, userRole?: string) => {
    // Branch scoping for the supervisor floor monitor: every supervisor except
    // super_admin only sees sessions from their own branch. Super admins — and
    // anyone whose staff profile has no branch — see every branch.
    let viewerBranchId: Types.ObjectId | null = null;
    if (userId && userRole !== Role.SUPER_ADMIN) {
        const me = await StaffModel.findOne({ userId })
            .select('branchId')
            .lean();
        if (me?.branchId) {
            viewerBranchId = me.branchId as Types.ObjectId;
        }
    }

    let sessions = await ProductionWorkSessionModel.find({
        status: { $in: ['active', 'paused'] },
    })
        .sort({ status: 1, startTime: 1 })
        .populate({
            path: 'staffId',
            select: 'staffId designation branchId userId',
            populate: { path: 'userId', select: 'name email' },
        })
        .populate('orderId', 'orderName deadline priority imageQuantity requiredSteps status')
        .populate('shiftId', 'name code')
        .lean();

    // Scope by the assigned editor's branch — that is the source of truth for
    // who a supervisor manages. A session's own `branchId` can be stale or
    // derived from a shift in another branch, so only fall back to it when the
    // staff record has no branch.
    if (viewerBranchId) {
        const target = viewerBranchId.toString();
        sessions = sessions.filter((s: any) => {
            const staffBranch = s.staffId?.branchId?.toString();
            const sessionBranch = s.branchId?.toString();
            return (staffBranch || sessionBranch) === target;
        });
    }

    const now = new Date();

    const mapped = sessions.map((s: any) => {
        const effectiveSeconds = computeEffectiveSeconds(s, now);
        return {
            _id: s._id,
            status: s.status,
            isOnHold: s.status === 'paused',
            staff: {
                _id: s.staffId?._id,
                staffId: s.staffId?.staffId,
                name: s.staffId?.userId?.name || s.staffId?.staffId || 'Editor',
                designation: s.staffId?.designation,
            },
            order: {
                _id: s.orderId?._id,
                orderName: s.orderId?.orderName,
                deadline: s.orderId?.deadline,
                priority: s.orderId?.priority,
                imageQuantity: s.orderId?.imageQuantity,
                requiredSteps: s.orderId?.requiredSteps || [],
                status: s.orderId?.status,
            },
            shiftName: s.shiftId?.name || null,
            imageNames: s.imageNames,
            imageCount: s.imageCount,
            startTime: s.startTime,
            pausedAt: s.pausedAt || null,
            totalPausedSeconds: s.totalPausedSeconds || 0,
            priorAccumulatedSeconds: s.priorAccumulatedSeconds || 0,
            effectiveSeconds,
            cumulativeSeconds: effectiveSeconds + (s.priorAccumulatedSeconds || 0),
            isReassignment: !!s.reassignedFromSessionId,
        };
    });

    const byStaffMap = new Map<string, any>();
    for (const s of mapped) {
        const key = String(s.staff._id);
        if (!byStaffMap.has(key)) {
            byStaffMap.set(key, {
                staffId: s.staff._id,
                name: s.staff.name,
                designation: s.staff.designation,
                activeCount: 0,
                heldCount: 0,
                totalImages: 0,
                orders: [] as string[],
            });
        }
        const row = byStaffMap.get(key);
        if (s.isOnHold) row.heldCount += 1;
        else row.activeCount += 1;
        row.totalImages += s.imageCount;
        if (s.order.orderName && !row.orders.includes(s.order.orderName)) {
            row.orders.push(s.order.orderName);
        }
    }

    return {
        sessions: mapped,
        byStaff: Array.from(byStaffMap.values()).sort(
            (a, b) => b.totalImages - a.totalImages
        ),
        summary: {
            editorsWorking: byStaffMap.size,
            activeSessions: mapped.filter((s) => !s.isOnHold).length,
            heldSessions: mapped.filter((s) => s.isOnHold).length,
            imagesInProgress: mapped
                .filter((s) => !s.isOnHold)
                .reduce((acc, s) => acc + s.imageCount, 0),
        },
    };
};

/**
 * Lightweight editor directory for the reassignment picker — production-eligible
 * (non-telemarketer, active) staff only.
 */
const getProductionEditors = async (userId?: string, userRole?: string) => {
    const query: Record<string, unknown> = { status: 'active' };

    // Branch scoping for the reassignment picker: every supervisor except
    // super_admin only sees editors from their own branch. Super admins — and
    // anyone whose staff profile has no branch — fall back to all branches.
    if (userId && userRole !== Role.SUPER_ADMIN) {
        const me = await StaffModel.findOne({ userId })
            .select('branchId')
            .lean();
        if (me?.branchId) {
            query.branchId = me.branchId;
        }
    }

    const staff = await StaffModel.find(query)
        .select('staffId designation userId')
        .populate('userId', 'name email')
        .lean();

    return staff
        .filter(
            (s: any) =>
                (s.designation || '').toLowerCase() !== 'telemarketer' && s.userId
        )
        .map((s: any) => ({
            _id: s._id,
            staffId: s.staffId,
            name: s.userId?.name || s.staffId,
            designation: s.designation,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
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
 * Approve images that have passed Quality Check (QA Analyst / Team Leader / Admin / Super Admin).
 * Only images currently awaiting QC (`pending_qc`) are affected. Once every image on the order
 * has been approved, the order itself rolls up to `completed`.
 */
const qcApproveImages = async (
    payload: {
        orderId: string;
        imageNames: string[];
    },
    userId: string
) => {
    const order = await OrderModel.findById(payload.orderId);
    if (!order) {
        throw new Error('Order not found');
    }

    const now = new Date();

    const updateResult = await OrderImageModel.updateMany(
        {
            orderId: order._id,
            imageName: { $in: payload.imageNames },
            status: 'pending_qc',
        },
        {
            $set: {
                status: 'completed',
                qcApprovedBy: new Types.ObjectId(userId),
                qcApprovedAt: now,
            },
        }
    );

    // Roll the order up to fully completed once every registered image has passed QC
    const remainingIncompleteImages = await OrderImageModel.countDocuments({
        orderId: order._id,
        status: { $ne: 'completed' },
    });

    const totalOrderImages = await OrderImageModel.countDocuments({
        orderId: order._id,
    });

    const orderJustCompleted =
        totalOrderImages >= order.imageQuantity &&
        remainingIncompleteImages === 0 &&
        order.status !== 'completed';

    if (orderJustCompleted) {
        order.status = 'completed';
        order.completedAt = now;
        order.timeline.push({
            status: 'completed',
            timestamp: now,
            changedBy: new Types.ObjectId(userId),
            note: `Quality Check passed: all ${totalOrderImages} images approved.`,
        });
        await order.save();
    }

    notifyProductionUpdate('production:qc_reviewed', {
        orderId: order._id,
        orderCompleted: orderJustCompleted,
    });
    notifyProductionUpdate('production:images_updated', {
        orderId: order._id,
    });

    return {
        success: true,
        message: orderJustCompleted
            ? `${updateResult.modifiedCount} image(s) approved — order fully completed!`
            : `${updateResult.modifiedCount} image(s) approved`,
        approvedCount: updateResult.modifiedCount,
        orderCompleted: orderJustCompleted,
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

    // `reassigned` sessions are included so a handed-off editor's logged time
    // still counts towards their output for the period.
    const query: any = {
        status: { $in: ['completed', 'reassigned'] },
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

/**
 * Get edited images history and metrics for a specific staff member
 */
const getStaffEditedImages = async (
    targetStaffId: string,
    filters: {
        search?: string | undefined;
        status?: string | undefined;
        step?: string | undefined;
        filterType?: string | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
        month?: number | undefined;
        year?: number | undefined;
        page?: number | undefined;
        limit?: number | undefined;
    }
) => {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    let staffObjId: Types.ObjectId;
    if (Types.ObjectId.isValid(targetStaffId)) {
        // Double check if this is an existing staff ObjectId or if staffId field matches
        const staffByObjId = await StaffModel.findById(targetStaffId).select('_id').lean();
        if (staffByObjId) {
            staffObjId = staffByObjId._id as Types.ObjectId;
        } else {
            const staffByCode = await StaffModel.findOne({ staffId: targetStaffId }).select('_id').lean();
            staffObjId = (staffByCode ? staffByCode._id : new Types.ObjectId(targetStaffId)) as Types.ObjectId;
        }
    } else {
        const staffByCode = await StaffModel.findOne({ staffId: targetStaffId }).select('_id').lean();
        if (staffByCode) {
            staffObjId = staffByCode._id as Types.ObjectId;
        } else {
            staffObjId = new Types.ObjectId(targetStaffId);
        }
    }

    // Build match query for OrderImage
    const matchQuery: any = {
        $or: [
            { 'completedSteps.completedBy': staffObjId },
            { currentAssignedStaffId: staffObjId },
        ],
    };

    if (filters.status && filters.status !== 'all') {
        matchQuery.status = filters.status;
    }

    if (filters.step && filters.step !== 'all') {
        matchQuery.completedSteps = {
            $elemMatch: {
                stepName: filters.step,
                completedBy: staffObjId,
            },
        };
    }

    // Date range filter
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
        const dateMatch: any = {};
        if (start) dateMatch.$gte = start;
        if (end) dateMatch.$lte = end;
        matchQuery['completedSteps.completedAt'] = dateMatch;
    }

    // Search by image name or order name
    if (filters.search) {
        const matchingOrders = await OrderModel.find({
            orderName: { $regex: filters.search, $options: 'i' },
        })
            .select('_id')
            .lean();
        const orderMatchIds = matchingOrders.map((o) => o._id as Types.ObjectId);

        matchQuery.$and = [
            {
                $or: [
                    { imageName: { $regex: filters.search, $options: 'i' } },
                    { orderId: { $in: orderMatchIds } },
                ],
            },
        ];
    }

    const [images, total] = await Promise.all([
        OrderImageModel.find(matchQuery)
            .populate({
                path: 'orderId',
                select: 'orderName imageQuantity priority deadline status clientId',
                populate: { path: 'clientId', select: 'name clientCode email' },
            })
            .populate({
                path: 'completedSteps.completedBy',
                select: 'staffId userId',
                populate: { path: 'userId', select: 'name email' },
            })
            .populate('completedSteps.shiftId', 'name code')
            .populate('qcApprovedBy', 'name email')
            .populate('revisionHistory.requestedBy', 'name email')
            .populate({
                path: 'revisionHistory.resolvedBy',
                select: 'staffId userId',
                populate: { path: 'userId', select: 'name' },
            })
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        OrderImageModel.countDocuments(matchQuery),
    ]);

    // Compute summary metrics for this staff
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const [totalCompleted, todayCompleted, approvedCount, revisionCount, workSessionsStats] =
        await Promise.all([
            OrderImageModel.countDocuments({
                'completedSteps.completedBy': staffObjId,
            }),
            OrderImageModel.countDocuments({
                completedSteps: {
                    $elemMatch: {
                        completedBy: staffObjId,
                        completedAt: { $gte: todayStart, $lte: todayEnd },
                    },
                },
            }),
            OrderImageModel.countDocuments({
                'completedSteps.completedBy': staffObjId,
                status: 'completed',
            }),
            OrderImageModel.countDocuments({
                'completedSteps.completedBy': staffObjId,
                'revisionHistory.0': { $exists: true },
            }),
            ProductionWorkSessionModel.aggregate([
                {
                    $match: {
                        staffId: staffObjId,
                        status: { $in: ['completed', 'reassigned'] },
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalSessions: { $sum: 1 },
                        totalSeconds: { $sum: '$durationSeconds' },
                        totalImages: { $sum: '$imageCount' },
                    },
                },
            ]),
        ]);

    const sessionStats = workSessionsStats[0] || {
        totalSessions: 0,
        totalSeconds: 0,
        totalImages: 0,
    };
    const avgSecondsPerImage =
        sessionStats.totalImages > 0
            ? Math.round(sessionStats.totalSeconds / sessionStats.totalImages)
            : 0;

    return {
        summary: {
            totalImagesWorked: totalCompleted,
            todayImagesWorked: todayCompleted,
            qcApprovedCount: approvedCount,
            revisionCount,
            totalWorkSessions: sessionStats.totalSessions,
            totalWorkSeconds: sessionStats.totalSeconds,
            avgSecondsPerImage,
        },
        images,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
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
    getHeldWorkSessions,
    pauseWorkSession,
    resumeWorkSession,
    finishWorkSession,
    cancelWorkSession,
    adminFinishWorkSession,
    reassignWorkSession,
    getLiveWorkSessions,
    getProductionEditors,
    flagImageRevision,
    qcApproveImages,
    getStaffPerformanceAnalytics,
    getStaffEditedImages,
};

export default productionService;

