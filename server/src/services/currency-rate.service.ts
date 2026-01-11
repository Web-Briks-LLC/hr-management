import CurrencyRateModel from '../models/currency-rate.model.js';
import type { ICurrencyRate } from '../types/currency-rate.type.js';

// Default rates if none set
const DEFAULT_RATES = [
    { currency: 'USD', rate: 120 },
    { currency: 'EUR', rate: 130 },
    { currency: 'GBP', rate: 150 },
    { currency: 'AUD', rate: 80 },
    { currency: 'CAD', rate: 90 },
];

async function getOrCreateRatesForMonth(
    month: number,
    year: number,
    userId?: string
): Promise<ICurrencyRate> {
    const rates = await CurrencyRateModel.findOne({ month, year }).lean();

    if (!rates && userId) {
        // Create with default rates
        const newRates = await CurrencyRateModel.create({
            month,
            year,
            rates: DEFAULT_RATES,
            setBy: userId,
        });
        return newRates.toObject() as unknown as ICurrencyRate;
    }

    if (!rates) {
        // Return a mock object with defaults if no user provided
        return {
            _id: '',
            month,
            year,
            rates: DEFAULT_RATES,
            setBy: '',
            createdAt: new Date(),
            updatedAt: new Date(),
        } as ICurrencyRate;
    }

    return rates as ICurrencyRate;
}

async function getRatesForMonth(
    month: number,
    year: number
): Promise<ICurrencyRate | null> {
    return CurrencyRateModel.findOne({ month, year }).lean();
}

async function updateRatesForMonth(
    month: number,
    year: number,
    rates: { currency: string; rate: number }[],
    userId: string
): Promise<ICurrencyRate> {
    const updated = await CurrencyRateModel.findOneAndUpdate(
        { month, year },
        {
            $set: {
                rates,
                setBy: userId,
            },
        },
        { upsert: true, new: true }
    ).lean();

    return updated as ICurrencyRate;
}

async function getRateForCurrency(
    month: number,
    year: number,
    currency: string
): Promise<number> {
    const rates = await CurrencyRateModel.findOne({ month, year }).lean();

    if (rates) {
        const found = rates.rates.find(
            (r) => r.currency.toUpperCase() === currency.toUpperCase()
        );
        if (found) return found.rate;
    }

    // Return default if not found
    const defaultRate = DEFAULT_RATES.find(
        (r) => r.currency.toUpperCase() === currency.toUpperCase()
    );
    return defaultRate?.rate || 1;
}

export default {
    getOrCreateRatesForMonth,
    getRatesForMonth,
    updateRatesForMonth,
    getRateForCurrency,
    DEFAULT_RATES,
};
