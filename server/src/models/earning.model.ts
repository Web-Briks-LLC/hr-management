import { model, Schema } from 'mongoose';
import type { IEarning } from '../types/earning.type.js';

const EarningSchema = new Schema<IEarning>(
    {
        orderId: {
            type: Schema.Types.ObjectId,
            ref: 'Order',
            required: true,
            unique: true,
            index: true,
        },
        clientId: {
            type: Schema.Types.ObjectId,
            ref: 'Client',
            required: true,
            index: true,
        },

        // Order info (denormalized)
        orderName: {
            type: String,
            required: true,
            trim: true,
        },
        orderDate: {
            type: Date,
            required: true,
            index: true,
        },
        orderAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        currency: {
            type: String,
            required: true,
            uppercase: true,
            default: 'USD',
        },

        // Withdrawal info
        fees: {
            type: Number,
            default: 0,
            min: 0,
        },
        tax: {
            type: Number,
            default: 0,
            min: 0,
        },
        conversionRate: {
            type: Number,
            default: 1,
            min: 0,
        },
        netAmount: {
            type: Number,
            default: 0,
        },
        amountInBDT: {
            type: Number,
            default: 0,
        },

        // Status
        status: {
            type: String,
            enum: ['unpaid', 'paid'],
            default: 'unpaid',
            index: true,
        },
        paidAt: {
            type: Date,
        },
        paidBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },

        notes: {
            type: String,
            trim: true,
        },
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

// Compound indexes for common queries
EarningSchema.index({ clientId: 1, status: 1 });
EarningSchema.index({ status: 1, orderDate: -1 });
EarningSchema.index({ clientId: 1, orderDate: -1 });

const EarningModel = model<IEarning>('Earning', EarningSchema);
export default EarningModel;
