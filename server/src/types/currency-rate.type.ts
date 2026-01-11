export interface ICurrencyRate {
    _id: string;
    month: number;
    year: number;
    rates: {
        currency: string;
        rate: number;
    }[];
    setBy: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface UpdateCurrencyRatesInput {
    rates: {
        currency: string;
        rate: number;
    }[];
}
