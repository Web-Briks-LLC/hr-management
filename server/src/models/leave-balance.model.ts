import { model, Schema, Types } from 'mongoose';

export interface ILeaveBalance {
    staffId: Types.ObjectId;
    year: number;
    annualLeaveTotal: number;
    annualLeaveUsed: number;
    annualLeaveRemaining: number;
    sickLeaveTotal: number;
    sickLeaveUsed: number;
    sickLeaveRemaining: number;
    createdAt: Date;
    updatedAt: Date;
}

const leaveBalanceSchema = new Schema<ILeaveBalance>(
    {
        staffId: {
            type: Schema.Types.ObjectId,
            ref: 'Staff',
            required: true,
            index: true,
        },
        year: {
            type: Number,
            required: true,
            index: true,
        },
        annualLeaveTotal: {
            type: Number,
            default: 12,
        },
        annualLeaveUsed: {
            type: Number,
            default: 0,
        },
        annualLeaveRemaining: {
            type: Number,
            default: 12,
        },
        sickLeaveTotal: {
            type: Number,
            default: 14,
        },
        sickLeaveUsed: {
            type: Number,
            default: 0,
        },
        sickLeaveRemaining: {
            type: Number,
            default: 14,
        },
    },
    { timestamps: true }
);

// Unique constraint: one balance per staff per year
leaveBalanceSchema.index({ staffId: 1, year: 1 }, { unique: true });

const LeaveBalanceModel = model<ILeaveBalance>(
    'LeaveBalance',
    leaveBalanceSchema
);
export default LeaveBalanceModel;
