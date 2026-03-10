import { model, Schema, Types } from 'mongoose';

export interface ISalaryAdjustmentLog {
    staffId: Types.ObjectId;
    month: string; // YYYY-MM
    bonus: number;
    deduction: number;
    note?: string;
    performedBy: Types.ObjectId;
    expenseId?: Types.ObjectId;
    previousBonus?: number;
    previousDeduction?: number;
    createdAt: Date;
    updatedAt: Date;
}

const salaryAdjustmentLogSchema = new Schema<ISalaryAdjustmentLog>(
    {
        staffId: {
            type: Schema.Types.ObjectId,
            ref: 'Staff',
            required: true,
            index: true,
        },
        month: {
            type: String,
            required: true,
            index: true,
        },
        bonus: {
            type: Number,
            default: 0,
        },
        deduction: {
            type: Number,
            default: 0,
        },
        note: String,
        performedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        expenseId: {
            type: Schema.Types.ObjectId,
            ref: 'Expense',
        },
        previousBonus: {
            type: Number,
            default: 0,
        },
        previousDeduction: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

salaryAdjustmentLogSchema.index({ staffId: 1, month: 1 });

const SalaryAdjustmentLogModel = model<ISalaryAdjustmentLog>(
    'SalaryAdjustmentLog',
    salaryAdjustmentLogSchema
);

export default SalaryAdjustmentLogModel;
