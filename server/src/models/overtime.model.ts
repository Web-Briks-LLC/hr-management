import { model, Schema } from 'mongoose';
import type { IOvertime } from '../types/overtime.type.js';

const overtimeSchema = new Schema<IOvertime>(
    {
        staffId: {
            type: Schema.Types.ObjectId,
            ref: 'Staff',
            required: true,
            index: true,
        },
        shiftId: {
            type: Schema.Types.ObjectId,
            ref: 'Shift',
            required: false, // Optional for weekend/holiday OT
        },
        date: {
            type: Date,
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ['pre_shift', 'post_shift', 'weekend', 'holiday'],
            required: true,
        },
        startTime: {
            type: Date,
            required: true,
        },
        actualStartTime: {
            type: Date,
            required: false,
        },
        endTime: {
            type: Date,
        },
        durationMinutes: {
            type: Number,
            default: 0,
        },
        earlyStopMinutes: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
            index: true,
        },
        reason: {
            type: String,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        approvedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    { timestamps: true },
);

// Compound indexes for common queries
overtimeSchema.index({ staffId: 1, date: -1 });
overtimeSchema.index({ staffId: 1, date: 1, type: 1 }, { unique: true });

const OvertimeModel = model<IOvertime>('Overtime', overtimeSchema);
export default OvertimeModel;
