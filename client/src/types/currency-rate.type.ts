export interface CurrencyRate {
    currency: string;
    rate: number;
}

export interface ICurrencyRateDocument {
    _id: string;
    month: number;
    year: number;
    rates: CurrencyRate[];
    setBy: string;
    createdAt: string;
    updatedAt: string;
}

export interface CurrencyRatesResponse {
    message: string;
    data: ICurrencyRateDocument;
}

export interface UpdateCurrencyRatesInput {
    rates: CurrencyRate[];
}

// Monthly summary types
export interface ClientMonthlySummary {
    clientId: string;
    clientName: string;
    clientCode: string;
    currency: string;
    orderCount: number;
    totalAmount: number;
    orders: {
        _id: string;
        orderName: string;
        totalPrice: number;
        deliveredAt: string;
    }[];
}

export interface MonthlySummaryResponse {
    message: string;
    data: ClientMonthlySummary[];
    currencies: string[];
}
