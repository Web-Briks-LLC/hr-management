import { model, Schema } from 'mongoose';
import type { IProductionWorkSession } from '../types/production-session.type.js';

const productionWorkSessionSchema = new Schema<IProductionWorkSession>(
    {
        staffId: {
            type: Schema.Types.ObjectId,
            ref: 'Staff',
            required: true,
            index: true,
        },
        orderId: {
            type: Schema.Types.ObjectId,
            ref: 'Order',
            required: true,
            index: true,
        },
        shiftId: {
            type: Schema.Types.ObjectId,
            ref: 'Shift',
            index: true,
        },
        branchId: {
            type: Schema.Types.ObjectId,
            ref: 'Branch',
            index: true,
        },
        imageNames: [
            {
                type: String,
                trim: true,
            },
        ],
        imageCount: {
            type: Number,
            required: true,
            min: 1,
            default: 1,
        },
        startTime: {
            type: Date,
            required: true,
            default: Date.now,
        },
        endTime: {
            type: Date,
        },
        durationSeconds: {
            type: Number,
            default: 0,
            min: 0,
        },
        status: {
            type: String,
            enum: ['active', 'completed', 'cancelled', 'paused'],
            default: 'active',
            index: true,
        },
        completedSteps: [
            {
                type: String,
                trim: true,
            },
        ],
        notes: {
            type: String,
            trim: true,
        },
    },
    { timestamps: true }
);

productionWorkSessionSchema.index({ staffId: 1, status: 1 });
productionWorkSessionSchema.index({ orderId: 1, createdAt: -1 });
productionWorkSessionSchema.index({ staffId: 1, startTime: -1 });

const ProductionWorkSessionModel = model<IProductionWorkSession>(
    'ProductionWorkSession',
    productionWorkSessionSchema
);

export default ProductionWorkSessionModel;
