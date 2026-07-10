import { model, Schema } from 'mongoose';

export interface ISalaryHistory {
    staffId: Schema.Types.ObjectId;
    previousSalary: number;
    newSalary: number;
    changedBy: Schema.Types.ObjectId;
    reason?: string;
    effectiveDate: Date;
    createdAt: Date;
}

const salaryHistorySchema = new Schema<ISalaryHistory>(
    {
        staffId: {
            type: Schema.Types.ObjectId,
            ref: 'Staff',
            required: true,
            index: true,
        },
        previousSalary: {
            type: Number,
            required: true,
        },
        newSalary: {
            type: Number,
            required: true,
        },
        changedBy: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        reason: String,
        effectiveDate: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

salaryHistorySchema.index({ staffId: 1, createdAt: -1 });

const SalaryHistoryModel = model<ISalaryHistory>('SalaryHistory', salaryHistorySchema);
export default SalaryHistoryModel;
