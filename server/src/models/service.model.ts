import { model, Schema } from 'mongoose';
import type { IService } from '../types/service.type.js';

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
    { timestamps: true },
);

const ServiceModel = model<IService>('Service', serviceSchema);
export default ServiceModel;
