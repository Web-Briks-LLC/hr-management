import type { Document, Types } from 'mongoose';

export type SessionStatus = 'active' | 'completed' | 'cancelled' | 'paused';

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
    createdAt: Date;
    updatedAt: Date;
}
