import { model, Schema } from 'mongoose';
import type { IOrder } from '../types/order.type.js';

const revisionInstructionSchema = new Schema(
    {
        instruction: {
            type: String,
            required: true,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    { _id: false }
);

const timelineEntrySchema = new Schema(
    {
        status: {
            type: String,
            enum: [
                'pending',
                'in_progress',
                'quality_check',
                'revision',
                'completed',
                'delivered',
                'cancelled',
            ],
            required: true,
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
        changedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        note: {
            type: String,
        },
    },
    { _id: false }
);

const orderSchema = new Schema<IOrder>(
    {
        orderName: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        clientId: {
            type: Schema.Types.ObjectId,
            ref: 'Client',
            required: true,
            index: true,
        },
        orderDate: {
            type: Date,
            required: true,
            index: true,
        },
        deadline: {
            type: Date,
            required: true,
            index: true,
        },
        originalDeadline: {
            type: Date,
        },
        imageQuantity: {
            type: Number,
            required: true,
            min: 1,
        },
        perImagePrice: {
            type: Number,
            required: true,
            min: 0,
        },
        totalPrice: {
            type: Number,
            required: true,
            min: 0,
        },
        services: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Service',
                required: true,
            },
        ],
        returnFileFormat: {
            type: Schema.Types.ObjectId,
            ref: 'ReturnFileFormat',
            required: true,
        },
        instruction: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
            enum: [
                'pending',
                'in_progress',
                'quality_check',
                'revision',
                'completed',
                'delivered',
                'cancelled',
            ],
            default: 'pending',
            index: true,
        },
        priority: {
            type: String,
            enum: ['low', 'normal', 'high', 'urgent'],
            default: 'normal',
            index: true,
        },
        assignedTo: {
            type: Schema.Types.ObjectId,
            ref: 'Staff',
            index: true,
        },
        notes: {
            type: String,
            trim: true,
        },
        revisionCount: {
            type: Number,
            default: 0,
        },
        isLegacy: {
            type: Boolean,
            default: false,
            index: true,
        },
        revisionInstructions: [revisionInstructionSchema],
        timeline: [timelineEntrySchema],
        completedAt: {
            type: Date,
        },
        deliveredAt: {
            type: Date,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual for Earning
orderSchema.virtual('earning', {
    ref: 'Earning',
    localField: '_id',
    foreignField: 'orderId',
    justOne: true,
});

// Compound indexes for common queries
orderSchema.index({ clientId: 1, orderDate: -1 });
orderSchema.index({ status: 1, deadline: 1 });
orderSchema.index({ assignedTo: 1, status: 1 });

// Text search index
orderSchema.index({ orderName: 'text' });

const OrderModel = model<IOrder>('Order', orderSchema);
export default OrderModel;
