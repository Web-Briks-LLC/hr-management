import type { Document, Types } from 'mongoose';

export type ImageProductionStatus =
    | 'unassigned'
    | 'in_progress'
    | 'partially_completed'
    | 'pending_qc'
    | 'completed'
    | 'in_revision';

export interface IImageCompletedStep {
    stepName: string;
    completedBy: Types.ObjectId;
    shiftId?: Types.ObjectId | null;
    completedAt?: Date;
    durationSeconds?: number;
    sessionId?: Types.ObjectId | null;
}

export interface IImageRevisionEntry {
    instruction: string;
    requestedBy: Types.ObjectId;
    createdAt?: Date;
    resolvedAt?: Date | null;
    resolvedBy?: Types.ObjectId | null;
}

export interface IOrderImage extends Document {
    _id: Types.ObjectId;
    orderId: Types.ObjectId;
    imageName: string;
    status: ImageProductionStatus;
    requiredSteps: string[];
    completedSteps: IImageCompletedStep[];
    currentAssignedStaffId?: Types.ObjectId | null;
    currentSessionId?: Types.ObjectId | null;
    lockedAt?: Date | null;
    isRevision: boolean;
    revisionHistory: IImageRevisionEntry[];
    qcApprovedBy?: Types.ObjectId | null;
    qcApprovedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
