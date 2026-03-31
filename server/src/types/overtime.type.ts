import { Document, Types } from 'mongoose';

export interface IOvertime extends Document {
    staffId: Types.ObjectId;
    shiftId?: Types.ObjectId;
    date: Date;
    type: 'pre_shift' | 'post_shift' | 'weekend' | 'holiday';
    startTime: Date;
    actualStartTime?: Date;
    endTime?: Date;
    durationMinutes: number; // This is the "Allowed" / Scheduled limit
    actualDurationMinutes?: number; // The actual time worked
    earlyStopMinutes: number;
    status: 'pending' | 'approved' | 'rejected';
    isAutoStopped?: boolean;
    reason?: string;
    createdBy?: Types.ObjectId;
    approvedBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
