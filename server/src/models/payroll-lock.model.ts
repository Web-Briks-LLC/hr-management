import mongoose, { Document, Schema } from "mongoose";

export interface IPayrollLock extends Document {
    month: string; // YYYY-MM
    lockedBy: mongoose.Types.ObjectId;
    lockedAt: Date;
}

const payrollLockSchema = new Schema<IPayrollLock>(
    {
        month: {
            type: String,
            required: true,
            unique: true,
            match: /^\d{4}-(0[1-9]|1[0-2])$/,
        },
        lockedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        lockedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true },
);

export const PayrollLockModel = mongoose.model<IPayrollLock>(
    "PayrollLock",
    payrollLockSchema,
);
