import LeaveApplicationModel from '../models/leave_application.model.js';
import LeaveBalanceModel from '../models/leave-balance.model.js';
import ShiftAssignmentModel from '../models/shift-assignment.model.js';
import ShiftModel from '../models/shift.model.js';
import notificationService from './notification.service.js';
import type {
    LeaveType,
    LeaveStatus,
} from '../types/leave_application.type.js';
import { Types } from 'mongoose';
import { format } from 'date-fns';

// Lookup stages for populating user data from 'user' collection
const LOOKUP_STAGES = [
    {
        $lookup: {
            from: 'staffs',
            let: { staffId: '$staffId' },
            pipeline: [
                { $match: { $expr: { $eq: ['$_id', '$$staffId'] } } },
                {
                    $lookup: {
                        from: 'user',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'userId',
                        pipeline: [{ $project: { name: 1, email: 1 } }],
                    },
                },
                {
                    $unwind: {
                        path: '$userId',
                        preserveNullAndEmptyArrays: true,
                    },
                },
            ],
            as: 'staffId',
        },
    },
    { $unwind: { path: '$staffId', preserveNullAndEmptyArrays: true } },
    {
        $lookup: {
            from: 'user',
            localField: 'approvedBy',
            foreignField: '_id',
            as: 'approvedBy',
            pipeline: [{ $project: { name: 1, email: 1 } }],
        },
    },
    { $unwind: { path: '$approvedBy', preserveNullAndEmptyArrays: true } },
    {
        $lookup: {
            from: 'user',
            localField: 'appliedBy',
            foreignField: '_id',
            as: 'appliedBy',
            pipeline: [{ $project: { name: 1, email: 1 } }],
        },
    },
    { $unwind: { path: '$appliedBy', preserveNullAndEmptyArrays: true } },
    {
        $lookup: {
            from: 'user',
            localField: 'revokedBy',
            foreignField: '_id',
            as: 'revokedBy',
            pipeline: [{ $project: { name: 1, email: 1 } }],
        },
    },
    { $unwind: { path: '$revokedBy', preserveNullAndEmptyArrays: true } },
];

// Helper: Get end of day (11:59:59.999 PM)
function getEndOfDay(date: Date): Date {
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay;
}

// Helper: Calculate working days excluding weekends based on shift
async function calculateWorkingDays(
    staffId: string,
    startDate: Date,
    endDate: Date
): Promise<Date[]> {
    // Get staff's current shift assignment
    const shiftAssignment = await ShiftAssignmentModel.findOne({
        staffId,
        isActive: true,
    }).populate('shiftId');

    let workDays = [1, 2, 3, 4, 5, 6]; // Default: Mon-Sat (0=Sun, 6=Sat)

    if (shiftAssignment && shiftAssignment.shiftId) {
        const shift = await ShiftModel.findById(shiftAssignment.shiftId);
        if (shift && shift.workDays) {
            workDays = shift.workDays;
        }
    }

    const workingDates: Date[] = [];
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    while (current <= end) {
        const dayOfWeek = current.getDay();
        if (workDays.includes(dayOfWeek)) {
            workingDates.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
    }

    return workingDates;
}

// Get or create leave balance for a staff for a year
async function getOrCreateLeaveBalance(staffId: string, year: number) {
    let balance = await LeaveBalanceModel.findOne({ staffId, year });

    if (!balance) {
        balance = await LeaveBalanceModel.create({
            staffId,
            year,
            annualLeaveTotal: 12,
            annualLeaveUsed: 0,
            annualLeaveRemaining: 12,
            sickLeaveTotal: 18,
            sickLeaveUsed: 0,
            sickLeaveRemaining: 18,
        });
    }

    return balance;
}

// Apply for leave
interface ApplyLeaveInput {
    staffId: string;
    leaveType: LeaveType;
    startDate: Date;
    endDate: Date;
    reason: string;
    appliedBy: string;
}

async function applyForLeave(input: ApplyLeaveInput) {
    const { staffId, leaveType, startDate, endDate, reason, appliedBy } = input;

    // Calculate working days based on shift
    const requestedDates = await calculateWorkingDays(
        staffId,
        startDate,
        endDate
    );

    if (requestedDates.length === 0) {
        throw new Error('No working days in the selected date range');
    }

    // Check leave balance
    const year = new Date(startDate).getFullYear();
    const balance = await getOrCreateLeaveBalance(staffId, year);

    if (
        leaveType === 'annual' &&
        requestedDates.length > balance.annualLeaveRemaining
    ) {
        throw new Error(
            `Insufficient annual leave. Remaining: ${balance.annualLeaveRemaining}, Requested: ${requestedDates.length}`
        );
    }

    if (
        leaveType === 'sick' &&
        requestedDates.length > balance.sickLeaveRemaining
    ) {
        throw new Error(
            `Insufficient sick leave. Remaining: ${balance.sickLeaveRemaining}, Requested: ${requestedDates.length}`
        );
    }

    // Set expiry at 11:59 PM today
    const expiresAt = getEndOfDay(new Date());

    const application = await LeaveApplicationModel.create({
        staffId,
        leaveType,
        startDate,
        endDate,
        requestedDates,
        reason,
        appliedBy,
        expiresAt,
        status: 'pending',
    });

    // Notify admins about new leave request
    try {
        const populatedApp = await application.populate({
            path: 'staffId',
            populate: { path: 'userId', select: 'name' },
        });
        const staffName =
            (populatedApp.staffId as any)?.userId?.name || 'Staff Member';
        const staffUserId =
            (populatedApp.staffId as any)?.userId?._id ||
            (populatedApp.staffId as any)?.userId;

        await notificationService.notifyAdminsLeaveRequest({
            staffName,
            staffUserId: staffUserId,
            leaveId: application._id as Types.ObjectId,
            leaveType,
            startDate: format(new Date(startDate), 'MMM dd'),
            endDate: format(new Date(endDate), 'MMM dd'),
            days: requestedDates.length,
        });
    } catch (err) {
        console.error('Failed to notify admins about leave request:', err);
    }

    return application.populate('staffId');
}

// Approve leave (full or partial)
interface ApproveLeaveInput {
    applicationId: string;
    approvedBy: string;
    approvedDates?: Date[];
    paidLeaveDates?: Date[];
    comment?: string;
}

async function approveLeave(input: ApproveLeaveInput) {
    const {
        applicationId,
        approvedBy,
        approvedDates,
        paidLeaveDates,
        comment,
    } = input;

    const application = await LeaveApplicationModel.findById(applicationId);
    if (!application) {
        throw new Error('Leave application not found');
    }

    if (application.status !== 'pending') {
        throw new Error(
            `Cannot approve: Application is already ${application.status}`
        );
    }

    // Check if expired
    if (new Date() > application.expiresAt) {
        application.status = 'expired';
        await application.save();
        throw new Error('Application has expired and cannot be approved');
    }

    const requestedDateStrings = application.requestedDates.map(
        (d) => d.toISOString().split('T')[0]
    );
    const finalApprovedDates = approvedDates || application.requestedDates;
    const finalPaidLeaveDates = paidLeaveDates || [];

    // Validate dates
    const approvedDateStrings = finalApprovedDates.map(
        (d) => new Date(d).toISOString().split('T')[0]
    );
    const paidDateStrings = finalPaidLeaveDates.map(
        (d) => new Date(d).toISOString().split('T')[0]
    );

    for (const dateStr of approvedDateStrings) {
        if (!requestedDateStrings.includes(dateStr)) {
            throw new Error(`Date ${dateStr} was not in the original request`);
        }
    }

    // Calculate rejected dates (requested but not approved or paid)
    const rejectedDates = application.requestedDates.filter((d) => {
        const dateStr = d.toISOString().split('T')[0];
        return (
            !approvedDateStrings.includes(dateStr) &&
            !paidDateStrings.includes(dateStr)
        );
    });

    // Update leave balance
    const year = new Date(application.startDate).getFullYear();
    const balance = await getOrCreateLeaveBalance(
        application.staffId.toString(),
        year
    );

    const leaveDaysCount = finalApprovedDates.length;

    if (application.leaveType === 'annual') {
        balance.annualLeaveUsed += leaveDaysCount;
        balance.annualLeaveRemaining -= leaveDaysCount;
    } else if (application.leaveType === 'sick') {
        balance.sickLeaveUsed += leaveDaysCount;
        balance.sickLeaveRemaining -= leaveDaysCount;
    }

    await balance.save();

    // Determine status
    let status: LeaveStatus = 'approved';
    if (rejectedDates.length > 0 || finalPaidLeaveDates.length > 0) {
        status = 'partially_approved';
    }

    // Update application
    application.status = status;
    application.approvedDates = finalApprovedDates.map((d) => new Date(d));
    application.paidLeaveDates = finalPaidLeaveDates.map((d) => new Date(d));
    application.rejectedDates = rejectedDates;
    application.approvedBy = approvedBy as unknown as Types.ObjectId;
    application.approvedAt = new Date();
    if (comment) {
        application.commentByApprover = comment;
    }

    await application.save();

    // Send notification to staff
    try {
        const populatedApp = await application.populate('staffId');
        const staffUserId = (populatedApp.staffId as any)?.userId;
        if (staffUserId) {
            await notificationService.notifyLeaveStatus({
                staffUserId: staffUserId,
                leaveId: application._id as Types.ObjectId,
                status: status,
                leaveType: application.leaveType,
                startDate: format(application.startDate, 'MMM dd'),
                endDate: format(application.endDate, 'MMM dd'),
                approvedDays: finalApprovedDates.length,
                approvedBy: approvedBy as unknown as Types.ObjectId,
                ...(comment && { comment }),
            });
        }
    } catch (err) {
        console.error('Failed to send leave approval notification:', err);
    }

    return application.populate('staffId');
}

// Reject leave
async function rejectLeave(
    applicationId: string,
    rejectedBy: string,
    comment?: string
) {
    const application = await LeaveApplicationModel.findById(applicationId);
    if (!application) {
        throw new Error('Leave application not found');
    }

    if (application.status !== 'pending') {
        throw new Error(
            `Cannot reject: Application is already ${application.status}`
        );
    }

    application.status = 'rejected';
    application.rejectedDates = application.requestedDates;
    application.approvedBy = rejectedBy as unknown as Types.ObjectId;
    application.rejectedAt = new Date();
    if (comment) {
        application.commentByApprover = comment;
    }

    await application.save();

    // Send notification to staff
    try {
        const populatedApp = await application.populate('staffId');
        const staffUserId = (populatedApp.staffId as any)?.userId;
        if (staffUserId) {
            await notificationService.notifyLeaveStatus({
                staffUserId: staffUserId,
                leaveId: application._id as Types.ObjectId,
                status: 'rejected',
                leaveType: application.leaveType,
                startDate: format(application.startDate, 'MMM dd'),
                endDate: format(application.endDate, 'MMM dd'),
                approvedBy: rejectedBy as unknown as Types.ObjectId,
                ...(comment && { comment }),
            });
        }
    } catch (err) {
        console.error('Failed to send leave rejection notification:', err);
    }

    return application.populate('staffId');
}

// Revoke approved leave (full or partial)
async function revokeLeave(
    applicationId: string,
    revokedBy: string,
    reason?: string,
    datesToRevoke?: Date[] // Optional: if provided, partial revoke; if not, full revoke
) {
    const application = await LeaveApplicationModel.findById(applicationId);
    if (!application) {
        throw new Error('Leave application not found');
    }

    if (!['approved', 'partially_approved'].includes(application.status)) {
        throw new Error(
            'Can only revoke approved or partially approved leaves'
        );
    }

    // Restore leave balance
    const year = new Date(application.startDate).getFullYear();
    const balance = await getOrCreateLeaveBalance(
        application.staffId.toString(),
        year
    );

    let restoredDays: number;

    if (datesToRevoke && datesToRevoke.length > 0) {
        // Partial revoke - only revoke specified dates
        const datesToRevokeStrings = datesToRevoke.map(
            (d) => new Date(d).toISOString().split('T')[0]
        );

        // Filter approved dates to remove revoked ones
        const remainingApprovedDates = application.approvedDates.filter((d) => {
            const dateStr = new Date(d).toISOString().split('T')[0];
            return !datesToRevokeStrings.includes(dateStr);
        });

        restoredDays =
            application.approvedDates.length - remainingApprovedDates.length;

        // Update approved dates
        application.approvedDates = remainingApprovedDates;

        // Add to rejected dates for record keeping (or create partialRevokedDates)
        if (!application.rejectedDates) {
            application.rejectedDates = [];
        }
        datesToRevoke.forEach((d) => {
            application.rejectedDates.push(d);
        });

        // Update status
        if (remainingApprovedDates.length === 0) {
            application.status = 'revoked';
            application.revokedAt = new Date();
            application.revokedBy = revokedBy as unknown as Types.ObjectId;
        } else {
            application.status = 'partially_approved';
        }
    } else {
        // Full revoke - revoke all approved dates
        restoredDays = application.approvedDates.length;

        application.status = 'revoked';
        application.revokedAt = new Date();
        application.revokedBy = revokedBy as unknown as Types.ObjectId;
    }

    // Restore balance
    if (restoredDays > 0) {
        if (application.leaveType === 'annual') {
            balance.annualLeaveUsed -= restoredDays;
            balance.annualLeaveRemaining += restoredDays;
        } else if (application.leaveType === 'sick') {
            balance.sickLeaveUsed -= restoredDays;
            balance.sickLeaveRemaining += restoredDays;
        }
        await balance.save();
    }

    if (reason) {
        application.revokeReason = reason;
    }

    await application.save();

    // Send notification to staff
    try {
        const populatedApp = await application.populate('staffId');
        const staffUserId = (populatedApp.staffId as any)?.userId;
        if (staffUserId) {
            await notificationService.notifyLeaveStatus({
                staffUserId: staffUserId,
                leaveId: application._id as Types.ObjectId,
                status: 'revoked',
                leaveType: application.leaveType,
                startDate: format(application.startDate, 'MMM dd'),
                endDate: format(application.endDate, 'MMM dd'),
                approvedBy: revokedBy as unknown as Types.ObjectId,
                ...(reason && { comment: reason }),
            });
        }
    } catch (err) {
        console.error('Failed to send leave revoke notification:', err);
    }

    return application;
}

// Get leave balance for a staff
async function getLeaveBalance(staffId: string, year?: number) {
    const targetYear = year || new Date().getFullYear();
    return getOrCreateLeaveBalance(staffId, targetYear);
}

// Get pending leaves for admin notification
async function getPendingLeaves() {
    return LeaveApplicationModel.aggregate([
        {
            $match: {
                status: 'pending',
                expiresAt: { $gte: new Date() },
            },
        },
        ...LOOKUP_STAGES,
        { $sort: { createdAt: -1 } },
    ]);
}

// Get all leave applications with filters
interface GetLeavesFilters {
    staffId?: string | undefined;
    status?: LeaveStatus | undefined;
    leaveType?: LeaveType | undefined;
    startDate?: Date | undefined;
    endDate?: Date | undefined;
    page?: number;
    limit?: number;
}

async function getLeaveApplications(filters: GetLeavesFilters) {
    const {
        staffId,
        status,
        leaveType,
        startDate,
        endDate,
        page = 1,
        limit = 20,
    } = filters;

    const query: Record<string, unknown> = {};

    if (staffId) query.staffId = new Types.ObjectId(staffId);
    if (status) query.status = status;
    if (leaveType) query.leaveType = leaveType;
    if (startDate || endDate) {
        query.startDate = {};
        if (startDate)
            (query.startDate as Record<string, Date>).$gte = new Date(
                startDate
            );
        if (endDate)
            (query.startDate as Record<string, Date>).$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [applications, total] = await Promise.all([
        LeaveApplicationModel.aggregate([
            { $match: query },
            ...LOOKUP_STAGES,
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
        ]),
        LeaveApplicationModel.countDocuments(query),
    ]);

    return {
        applications,
        total,
        page,
        totalPages: Math.ceil(total / limit),
    };
}

// Get single leave application by ID
async function getLeaveApplicationById(id: string) {
    const result = await LeaveApplicationModel.aggregate([
        { $match: { _id: new Types.ObjectId(id) } },
        ...LOOKUP_STAGES,
    ]);
    return result[0] || null;
}

// Expire stale applications (for cron job)
async function expireStaleApplications() {
    const now = new Date();

    const result = await LeaveApplicationModel.updateMany(
        {
            status: 'pending',
            expiresAt: { $lt: now },
        },
        {
            status: 'expired',
        }
    );

    return result.modifiedCount;
}

// Get my leave applications (for staff)
async function getMyLeaveApplications(staffId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [applications, total] = await Promise.all([
        LeaveApplicationModel.aggregate([
            { $match: { staffId: new Types.ObjectId(staffId) } },
            ...LOOKUP_STAGES,
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
        ]),
        LeaveApplicationModel.countDocuments({ staffId }),
    ]);

    return {
        applications,
        total,
        page,
        totalPages: Math.ceil(total / limit),
    };
}

// Cancel own pending application
async function cancelLeaveApplication(applicationId: string, userId: string) {
    const application = await LeaveApplicationModel.findById(applicationId);
    if (!application) {
        throw new Error('Leave application not found');
    }

    if (application.appliedBy.toString() !== userId) {
        throw new Error('You can only cancel your own applications');
    }

    if (application.status !== 'pending') {
        throw new Error('Can only cancel pending applications');
    }

    application.status = 'cancelled';
    await application.save();

    return application;
}

// Upload medical document for sick leave
async function uploadMedicalDocument(
    applicationId: string,
    userId: string,
    file: Express.Multer.File
) {
    // Dynamic imports for cloudinary
    const cloudinaryModule = await import('../lib/cloudinary.js');
    const envConfigModule = await import('../config/env.config.js');
    const cloudinary = cloudinaryModule.default;
    const envConfig = envConfigModule.default;

    const application = await LeaveApplicationModel.findById(applicationId);
    if (!application) {
        throw new Error('Leave application not found');
    }

    // Verify ownership
    if (application.appliedBy.toString() !== userId) {
        throw new Error(
            'You can only upload documents to your own applications'
        );
    }

    // Only allow for sick leave
    if (application.leaveType !== 'sick') {
        throw new Error(
            'Medical documents can only be uploaded for sick leave'
        );
    }

    // Only allow for pending applications
    if (application.status !== 'pending') {
        throw new Error('Can only upload documents to pending applications');
    }

    // Upload to cloudinary in sick-leave-documents folder
    const uploadResult = await new Promise<{
        secure_url: string;
        public_id: string;
    }>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: `${envConfig.cloudinary_upload_path}/sick-leave-documents`,
                resource_type: 'auto',
            },
            (
                err: Error | undefined,
                result: { secure_url: string; public_id: string } | undefined
            ) => {
                if (err) reject(err);
                else if (result) resolve(result);
                else reject(new Error('Upload failed'));
            }
        );
        uploadStream.end(file.buffer);
    });

    // Add document to application
    const document = {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        fileName: file.originalname,
        uploadedAt: new Date(),
    };

    if (!application.medicalDocuments) {
        application.medicalDocuments = [];
    }
    application.medicalDocuments.push(document);
    await application.save();

    return document;
}

export default {
    applyForLeave,
    approveLeave,
    rejectLeave,
    revokeLeave,
    getLeaveBalance,
    getPendingLeaves,
    getLeaveApplications,
    getLeaveApplicationById,
    expireStaleApplications,
    getMyLeaveApplications,
    cancelLeaveApplication,
    calculateWorkingDays,
    getOrCreateLeaveBalance,
    uploadMedicalDocument,
};
