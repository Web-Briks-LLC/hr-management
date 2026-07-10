import { model, Schema } from 'mongoose';
import type { IShiftAssignment } from '../types/shift-assignment.type.js';

const shiftAssignmentSchema = new Schema<IShiftAssignment>(
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
            required: true,
        },

        startDate: {
            type: Date,
            required: true,
            index: true,
        },

        endDate: {
            type: Date,
            default: null,
        },

        assignedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

shiftAssignmentSchema.index(
    { staffId: 1, isActive: 1 },
    { unique: true, partialFilterExpression: { isActive: true } }
);

shiftAssignmentSchema.index({ staffId: 1, startDate: 1, endDate: 1 });

const ShiftAssignmentModel = model<IShiftAssignment>(
    'ShiftAssignment',
    shiftAssignmentSchema
);
export default ShiftAssignmentModel;
