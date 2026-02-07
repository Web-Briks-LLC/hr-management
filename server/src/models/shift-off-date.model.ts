import { model, Schema } from 'mongoose';
import type { IShiftOffDate } from '../types/shift-off-date.type.js';

const shiftOffDateSchema = new Schema<IShiftOffDate>(
    {
        shiftId: {
            type: Schema.Types.ObjectId,
            ref: 'Shift',
            required: true,
            index: true,
        },

        dates: {
            type: [Date],
            required: true,
            default: [],
        },

        reason: {
            type: String,
            trim: true,
        },

        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true },
);

// Compound index for efficient queries
shiftOffDateSchema.index({ shiftId: 1, isActive: 1 });
shiftOffDateSchema.index({ dates: 1 });

const ShiftOffDateModel = model<IShiftOffDate>(
    'ShiftOffDate',
    shiftOffDateSchema,
);
export default ShiftOffDateModel;
