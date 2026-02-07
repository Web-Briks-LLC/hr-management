import mongoose, { Document, Schema } from 'mongoose';

export interface IPayrollBankSettings extends Document {
    bankName: string;
    bankAccountNo: string;
    companyName: string;
    branchName?: string;
    branchLocation?: string;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const payrollBankSettingsSchema = new Schema<IPayrollBankSettings>(
    {
        bankName: {
            type: String,
            required: [true, 'Bank name is required'],
            trim: true,
        },
        bankAccountNo: {
            type: String,
            required: [true, 'Bank account number is required'],
            trim: true,
        },
        companyName: {
            type: String,
            required: [true, 'Company name is required'],
            trim: true,
        },
        branchName: {
            type: String,
            trim: true,
        },
        branchLocation: {
            type: String,
            trim: true,
        },
        isDefault: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    },
);

// Ensure only one default
payrollBankSettingsSchema.pre('save', async function () {
    if (this.isDefault) {
        await mongoose
            .model('PayrollBankSettings')
            .updateMany({ _id: { $ne: this._id } }, { isDefault: false });
    }
});

export const PayrollBankSettingsModel = mongoose.model<IPayrollBankSettings>(
    'PayrollBankSettings',
    payrollBankSettingsSchema,
);
