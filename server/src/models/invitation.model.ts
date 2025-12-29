import { model, Schema } from 'mongoose';

export interface IInvitation {
    email: string;
    token: string;
    expiresAt: Date;
    isUsed: boolean;
    usedAt?: Date;

    // Employee details set by admin
    salary: number;
    role: 'staff' | 'team_leader' | 'admin' | 'super_admin' | 'hr_manager';
    department?: string;
    designation: string;
    branchId?: Schema.Types.ObjectId;
    shiftId?: Schema.Types.ObjectId;

    // Metadata
    createdBy: Schema.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const invitationSchema = new Schema<IInvitation>(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        token: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        isUsed: {
            type: Boolean,
            default: false,
            index: true,
        },
        usedAt: Date,

        // Employee details
        salary: {
            type: Number,
            required: true,
            min: 0,
        },
        role: {
            type: String,
            enum: [
                'staff',
                'team_leader',
                'admin',
                'super_admin',
                'hr_manager',
            ],
            required: true,
        },
        department: String,
        designation: {
            type: String,
            required: true,
        },
        branchId: {
            type: Schema.Types.ObjectId,
            ref: 'Branch',
            required: false, // Optional for admin roles
        },
        shiftId: {
            type: Schema.Types.ObjectId,
            ref: 'Shift',
        },

        // Metadata
        createdBy: {
            type: Schema.Types.ObjectId,
            required: true,
        },
    },
    { timestamps: true }
);

// Index for finding active invitations
invitationSchema.index({ email: 1, isUsed: 1, expiresAt: 1 });

const InvitationModel = model<IInvitation>('Invitation', invitationSchema);
export default InvitationModel;
