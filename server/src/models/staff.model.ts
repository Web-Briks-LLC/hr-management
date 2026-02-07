import { model, Schema } from 'mongoose';
import type IStaff from '../types/staff.type.js';

const StaffSchema = new Schema<IStaff>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: false,
            unique: true,
            sparse: true,
            index: true,
        },

        staffId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        phone: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        branchId: {
            type: Schema.Types.ObjectId,
            ref: 'Branch',
            required: false, // Optional for admin roles
            index: true,
        },

        department: {
            type: String,
            // Dynamic values from metadata, no enum restriction
            index: true,
        },

        designation: {
            type: String,
            required: true,
            index: true,
        },

        joinDate: {
            type: Date,
            required: true,
            index: true,
        },

        status: {
            type: String,
            enum: ['active', 'inactive', 'terminated'],
            default: 'active',
            index: true,
        },

        dateOfBirth: {
            type: Date,
            required: false,
        },

        nationalId: {
            type: String,
            unique: true,
            sparse: true,
            index: true,
            required: false,
        },

        bloodGroup: {
            type: String,
            enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
            required: false,
        },

        address: {
            type: String,
            required: false,
        },

        emergencyContact: {
            name: {
                type: String,
                required: false,
            },
            relation: {
                type: String,
                required: false,
            },
            phone: {
                type: String,
                required: false,
            },
        },

        fathersName: {
            type: String,
            required: false,
        },

        mothersName: {
            type: String,
            required: false,
        },

        spouseName: {
            type: String,
            required: false,
        },

        bankAccountNo: {
            type: String,
            required: false,
        },

        bankAccountName: {
            type: String,
            required: false,
        },

        bankName: {
            type: String,
            required: false,
        },

        exitDate: {
            type: Date,
        },

        salary: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
            index: true,
        },

        salaryVisibleToEmployee: {
            type: Boolean,
            default: true,
        },

        profileCompleted: {
            type: Boolean,
            default: false,
            index: true,
        },

        salaryPin: {
            type: String,
            required: false,
            select: false, // Do not return by default
        },

        salaryPinResetToken: {
            type: String,
            select: false,
        },

        salaryPinResetExpires: {
            type: Date,
            select: false,
        },
    },
    {
        timestamps: true,
    },
);

const StaffModel = model<IStaff>('Staff', StaffSchema);
export default StaffModel;
