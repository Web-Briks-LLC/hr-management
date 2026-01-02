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
    uploadedAt?: string;
}

export interface ILeaveApplication {
    _id: string;
    staffId: {
        _id: string;
        staffId: string;
        userId: {
            _id: string;
            name: string;
            email: string;
        };
    };
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    requestedDates: string[];
    approvedDates: string[];
    rejectedDates: string[];
    paidLeaveDates: string[];
    status: LeaveStatus;
    reason: string;
    commentByApprover?: string;
    approvedBy?: {
        _id: string;
        name: string;
        email: string;
    };
    appliedBy: {
        _id: string;
        name: string;
        email: string;
    };
    isPaid: boolean;
    affectsSalary: boolean;
    expiresAt: string;
    revokedAt?: string;
    revokedBy?: {
        _id: string;
        name: string;
        email: string;
    };
    revokeReason?: string;
    approvedAt?: string;
    rejectedAt?: string;
    medicalDocuments?: MedicalDocument[];
    createdAt: string;
    updatedAt: string;
}

export interface ILeaveBalance {
    _id: string;
    staffId: string;
    year: number;
    annualLeaveTotal: number;
    annualLeaveUsed: number;
    annualLeaveRemaining: number;
    sickLeaveTotal: number;
    sickLeaveUsed: number;
    sickLeaveRemaining: number;
}

export interface ApplyLeaveInput {
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    reason: string;
}

export interface ApproveLeaveInput {
    approvedDates?: string[];
    paidLeaveDates?: string[];
    comment?: string;
}

export interface LeaveFilters {
    staffId?: string;
    status?: LeaveStatus;
    leaveType?: LeaveType;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
    annual: 'Annual Leave',
    sick: 'Sick Leave',
    paid: 'Paid Leave',
    casual: 'Casual Leave',
    earned: 'Earned Leave',
    other: 'Other',
};

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
    pending: 'Pending',
    approved: 'Approved',
    partially_approved: 'Partially Approved',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
    expired: 'Expired',
    revoked: 'Revoked',
};
