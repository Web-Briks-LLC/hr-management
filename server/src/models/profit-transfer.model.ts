import { model, Schema } from 'mongoose';
import type { IProfitTransfer } from '../types/external-business.type.js';

const profitTransferSchema = new Schema<IProfitTransfer>(
    {
        businessId: {
            type: Schema.Types.ObjectId,
            ref: 'ExternalBusiness',
            required: true,
            index: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        transferDate: {
            type: Date,
            default: Date.now,
        },
        periodType: {
            type: String,
            enum: ['month', 'year'],
            required: true,
        },
        month: {
            type: Number,
            min: 1,
            max: 12,
        },
        year: {
            type: Number,
            required: true,
        },
        notes: {
            type: String,
            trim: true,
        },
        transferredBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    { timestamps: true }
);

// Compound indexes for efficient queries
profitTransferSchema.index({ businessId: 1, year: 1, month: 1 });
profitTransferSchema.index({ year: 1, month: 1 });
profitTransferSchema.index({ transferDate: -1 });

const ProfitTransferModel = model<IProfitTransfer>(
    'ProfitTransfer',
    profitTransferSchema
);
export default ProfitTransferModel;
