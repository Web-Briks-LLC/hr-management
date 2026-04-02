import { model, Schema } from 'mongoose';
import { Designation } from '../constants/designation.js';

export interface IPolicyAcceptance {
    user: Schema.Types.ObjectId | string;
    acceptedAt: Date;
}

export interface IPolicy {
    _id: string;
    title: string;
    description: string;
    branchId?: Schema.Types.ObjectId | string;
    department?: string;
    designations?: string[];
    requiresAcceptance: boolean;
    isActive: boolean;
    acceptedBy: IPolicyAcceptance[];
    createdBy: Schema.Types.ObjectId | string;
    createdAt: Date;
    updatedAt: Date;
}

const policyAcceptanceSchema = new Schema<IPolicyAcceptance>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        acceptedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false }
);

const policySchema = new Schema<IPolicy>(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        description: {
            type: String,
            required: true,
        },
        branchId: {
            type: Schema.Types.ObjectId,
            ref: 'Branch',
            required: false,
            index: true,
        },
        department: {
            type: String,
            required: false,
            index: true,
        },
        designations: [
            {
                type: String,
                enum: Object.values(Designation),
            },
        ],
        requiresAcceptance: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        acceptedBy: [policyAcceptanceSchema],
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

const PolicyModel = model<IPolicy>('Policy', policySchema);
export default PolicyModel;
