import { model, Schema } from 'mongoose';
import type { IProfitDistribution } from '../types/shareholder.type.js';

const profitDistributionSchema = new Schema<IProfitDistribution>(
    {
        shareholderId: {
            type: Schema.Types.ObjectId,
            ref: 'Shareholder',
            required: true,
            index: true,
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
        totalProfit: {
            type: Number,
            required: true,
        },
        sharePercentage: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
        },
        shareAmount: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'distributed'],
            default: 'distributed',
            index: true,
        },
        distributedAt: {
            type: Date,
            default: Date.now,
        },
        distributedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        notes: {
            type: String,
            trim: true,
        },
    },
    { timestamps: true }
);

// Compound indexes for efficient queries
profitDistributionSchema.index({ shareholderId: 1, year: 1, month: 1 });
profitDistributionSchema.index({ year: 1, month: 1, status: 1 });

const ProfitDistributionModel = model<IProfitDistribution>(
    'ProfitDistribution',
    profitDistributionSchema
);
export default ProfitDistributionModel;
