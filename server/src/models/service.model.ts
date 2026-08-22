import { model, Schema } from 'mongoose';
import type { IService } from '../types/service.type.js';

const serviceStepSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        code: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        order: {
            type: Number,
            default: 0,
        },
        isDefault: {
            type: Boolean,
            default: true,
        },
    },
    { _id: true }
);

const serviceSchema = new Schema<IService>(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        price: {
            type: Number,
            default: 0,
        },
        steps: [serviceStepSchema],
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

const ServiceModel = model<IService>('Service', serviceSchema);
export default ServiceModel;

