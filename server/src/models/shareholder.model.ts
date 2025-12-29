import { model, Schema } from 'mongoose';
import type { IShareholder } from '../types/shareholder.type.js';

const shareholderSchema = new Schema<IShareholder>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
        percentage: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    { timestamps: true }
);

// Compound index for efficient queries
shareholderSchema.index({ email: 1 }, { unique: true });

const ShareholderModel = model<IShareholder>('Shareholder', shareholderSchema);
export default ShareholderModel;
