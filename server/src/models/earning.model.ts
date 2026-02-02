import { model, Schema } from 'mongoose';
import type { IEarning } from '../types/earning.type.js';

const EarningSchema = new Schema<IEarning>(
    {
        // Client and time period
        clientId: {
            type: Schema.Types.ObjectId,
            ref: 'Client',
            required: true,
            index: true,
        },
        month: {
            type: Number,
            required: true,
            min: 1,
            max: 12,
        },
        year: {
            type: Number,
            required: true,
        },

        // Linked orders (empty for legacy data)
        orderIds: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Order',
            },
        ],

        // Aggregated data
        imageQty: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalAmount: {
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

        // Legacy support
        isLegacy: {
            type: Boolean,
            default: false,
        },
        legacyClientCode: {
            type: String,
            trim: true,
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
    },
);

// Unique constraint: One earning per client per month/year
EarningSchema.index({ clientId: 1, month: 1, year: 1 }, { unique: true });

// Other indexes for common queries
EarningSchema.index({ status: 1, year: -1, month: -1 });
EarningSchema.index({ clientId: 1, year: -1, month: -1 });

const EarningModel = model<IEarning>('Earning', EarningSchema);
export default EarningModel;
