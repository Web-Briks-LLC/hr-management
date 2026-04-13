import { model, Schema } from 'mongoose';
import type { IShift } from '../types/shift.type.js';

const shiftSchema = new Schema<IShift>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },

        branchId: {
            type: Schema.Types.ObjectId,
            ref: 'Branch',
            required: true,
            index: true,
        },

        timeZone: {
            type: String,
            default: 'Asia/Dhaka',
        },

        workDays: {
            type: [Number],
            default: [1, 2, 3, 4, 5, 6],
        },

        startTime: {
            type: String,
            required: false,
        },

        endTime: {
            type: String,
            required: false,
        },

        isFlexible: {
            type: Boolean,
            default: false,
        },

        gracePeriodMinutes: {
            type: Number,
            default: 10,
        },

        lateAfterMinutes: {
            type: Number,
            default: 10,
        },

        halfDayAfterMinutes: {
            type: Number,
            default: 240,
        },

        otEnabled: {
            type: Boolean,
            default: false,
        },

        minOtMinutes: {
            type: Number,
            default: 30,
        },

        roundOtTo: {
            type: Number,
            default: 30,
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    { timestamps: true }
);

const ShiftModel = model<IShift>('Shift', shiftSchema);
export default ShiftModel;
