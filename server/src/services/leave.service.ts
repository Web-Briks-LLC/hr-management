import LeaveApplicationModel from '../models/leave_application.model.js';
import LeaveBalanceModel from '../models/leave-balance.model.js';
import ShiftAssignmentModel from '../models/shift-assignment.model.js';
import ShiftModel from '../models/shift.model.js';
import type {
    LeaveType,
    LeaveStatus,
} from '../types/leave_application.type.js';
import type { Types } from 'mongoose';

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

    return application.populate([
        { path: 'staffId', populate: { path: 'userId', select: 'name email' } },
        { path: 'appliedBy', select: 'name email' },
    ]);
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

    return application.populate([
        { path: 'staffId', populate: { path: 'userId', select: 'name email' } },
        { path: 'approvedBy', select: 'name email' },
    ]);
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

    return application.populate([
        { path: 'staffId', populate: { path: 'userId', select: 'name email' } },
    ]);
}

// Revoke approved leave
async function revokeLeave(
    applicationId: string,
    revokedBy: string,
    reason?: string
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

    const restoredDays = application.approvedDates.length;

    if (application.leaveType === 'annual') {
        balance.annualLeaveUsed -= restoredDays;
        balance.annualLeaveRemaining += restoredDays;
    } else if (application.leaveType === 'sick') {
        balance.sickLeaveUsed -= restoredDays;
        balance.sickLeaveRemaining += restoredDays;
    }

    await balance.save();

    // Update application
    application.status = 'revoked';
    application.revokedAt = new Date();
    application.revokedBy = revokedBy as unknown as Types.ObjectId;
    if (reason) {
        application.revokeReason = reason;
    }

    await application.save();

    return application;
}

// Get leave balance for a staff
async function getLeaveBalance(staffId: string, year?: number) {
    const targetYear = year || new Date().getFullYear();
    return getOrCreateLeaveBalance(staffId, targetYear);
}

// Get pending leaves for admin notification
async function getPendingLeaves() {
    return LeaveApplicationModel.find({
        status: 'pending',
        expiresAt: { $gte: new Date() },
    })
        .populate({
            path: 'staffId',
            populate: { path: 'userId', select: 'name email' },
        })
        .sort({ createdAt: -1 });
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

    if (staffId) query.staffId = staffId;
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
        LeaveApplicationModel.find(query)
            .populate({
                path: 'staffId',
                populate: { path: 'userId', select: 'name email' },
            })
            .populate('approvedBy', 'name email')
            .populate('appliedBy', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
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
    return LeaveApplicationModel.findById(id)
        .populate({
            path: 'staffId',
            populate: { path: 'userId', select: 'name email' },
        })
        .populate('approvedBy', 'name email')
        .populate('appliedBy', 'name email')
        .populate('revokedBy', 'name email');
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
        LeaveApplicationModel.find({ staffId })
            .populate('approvedBy', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
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
