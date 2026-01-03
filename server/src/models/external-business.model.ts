import { model, Schema } from 'mongoose';
import type { IExternalBusiness } from '../types/external-business.type.js';

const externalBusinessSchema = new Schema<IExternalBusiness>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        description: {
            type: String,
            trim: true,
        },
        contactPerson: {
            type: String,
            trim: true,
        },
        phone: {
            type: String,
            trim: true,
        },
        email: {
            type: String,
            lowercase: true,
            trim: true,
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

// Compound index for name uniqueness
externalBusinessSchema.index({ name: 1 }, { unique: true });

const ExternalBusinessModel = model<IExternalBusiness>(
    'ExternalBusiness',
    externalBusinessSchema
);
export default ExternalBusinessModel;
