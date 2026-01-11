import { model, Schema } from 'mongoose';
import type { ICurrencyRate } from '../types/currency-rate.type.js';

const CurrencyRateSchema = new Schema<ICurrencyRate>(
    {
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
        rates: [
            {
                currency: {
                    type: String,
                    required: true,
                    uppercase: true,
                },
                rate: {
                    type: Number,
                    required: true,
                    min: 0,
                },
            },
        ],
        setBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        } as any,
    },
    {
        timestamps: true,
    }
);

// Compound unique index for month + year
CurrencyRateSchema.index({ month: 1, year: 1 }, { unique: true });

const CurrencyRateModel = model<ICurrencyRate>('CurrencyRate', CurrencyRateSchema);
export default CurrencyRateModel;
