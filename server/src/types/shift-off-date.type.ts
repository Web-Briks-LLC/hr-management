import { Document, Types } from 'mongoose';

export interface IShiftOffDate extends Document {
    shiftId: Types.ObjectId;
    dates: Date[];
    reason?: string;
    createdBy: Types.ObjectId;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
