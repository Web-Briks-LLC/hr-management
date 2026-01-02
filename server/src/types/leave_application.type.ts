import type { Types } from 'mongoose';

export type LeaveType =
    | 'annual'
    | 'sick'
    | 'paid'
    | 'casual'
    | 'earned'
    | 'other';

export type LeaveStatus =
    | 'pending'
    | 'approved'
    | 'partially_approved'
    | 'rejected'
    | 'cancelled'
    | 'expired'
    | 'revoked';

export interface MedicalDocument {
    url: string;
    publicId?: string;
    fileName?: string;
    uploadedAt?: Date;
}

export interface ILeaveApplication {
    _id?: Types.ObjectId;
    staffId: Types.ObjectId;
    leaveType: LeaveType;
    startDate: Date;
    endDate: Date;
    requestedDates: Date[];
    approvedDates: Date[];
    rejectedDates: Date[];
    paidLeaveDates: Date[];
    status: LeaveStatus;
    reason: string;
    alternativeContact?: string;
    commentByApprover?: string;
    approvedBy?: Types.ObjectId;
    appliedBy: Types.ObjectId;
    isPaid?: boolean;
    affectsSalary?: boolean;
    attendanceLinked?: boolean;
    expiresAt: Date;
    revokedAt?: Date;
    revokedBy?: Types.ObjectId;
    revokeReason?: string;
    approvedAt?: Date;
    rejectedAt?: Date;
    medicalDocuments?: MedicalDocument[];
    createdAt: Date;
    updatedAt: Date;
}
