import type { Document, Types } from 'mongoose';

export type SessionStatus =
    | 'active'
    | 'completed'
    | 'cancelled'
    | 'paused'
    | 'reassigned';

export interface IProductionSessionPauseEntry {
    pausedAt: Date;
    resumedAt?: Date | null;
    byUserId?: Types.ObjectId | null;
}

export interface IProductionWorkSession extends Document {
    _id: Types.ObjectId;
    staffId: Types.ObjectId;
    orderId: Types.ObjectId;
    shiftId?: Types.ObjectId | null;
    branchId?: Types.ObjectId | null;
    imageNames: string[];
    imageCount: number;
    startTime: Date;
    endTime?: Date | null;
    durationSeconds: number;
    status: SessionStatus;
    completedSteps: string[];
    notes?: string | null;
    pausedAt?: Date | null;
    totalPausedSeconds: number;
    pauseHistory: IProductionSessionPauseEntry[];
    priorAccumulatedSeconds: number;
    reassignedFromSessionId?: Types.ObjectId | null;
    reassignedToSessionId?: Types.ObjectId | null;
    closedBy?: Types.ObjectId | null;
    closeReason?: string | null;
    createdAt: Date;
    updatedAt: Date;
}
