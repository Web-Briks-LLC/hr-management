export type EarningStatus = 'unpaid' | 'paid';

export interface IEarning {
    _id: string;
    orderId: {
        _id: string;
        orderName: string;
        totalPrice: number;
        status: string;
    };
    clientId: {
        _id: string;
        clientId: string;
        name: string;
        email: string;
        currency?: string;
    };
    orderName: string;
    orderDate: string;
    orderAmount: number;
    currency: string;
    fees: number;
    tax: number;
    conversionRate: number;
    netAmount: number;
    amountInBDT: number;
    status: EarningStatus;
    paidAt?: string;
    paidBy?: string;
    notes?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export interface WithdrawEarningInput {
    fees?: number;
    tax?: number;
    conversionRate: number;
    notes?: string;
}

export interface ToggleStatusInput {
    status: 'paid' | 'unpaid';
    fees?: number;
    tax?: number;
    conversionRate?: number;
    notes?: string;
}

export interface BulkWithdrawInput {
    earningIds: string[];
    totalFees: number;
    totalTax: number;
    conversionRate: number;
    notes?: string;
}

export interface EarningFilters {
    page?: number;
    limit?: number;
    clientId?: string;
    status?: EarningStatus;
    filterType?: 'today' | 'week' | 'month' | 'year' | 'range';
    startDate?: string;
    endDate?: string;
    month?: number;
    year?: number;
}

export interface EarningsResponse {
    message: string;
    data: IEarning[];
    meta: {
        total: number;
        page: number;
        totalPages: number;
    };
}

export interface EarningResponse {
    message: string;
    data: IEarning;
}

export interface EarningStats {
    totalUnpaidCount: number;
    totalUnpaidAmount: number;
    totalPaidCount: number;
    totalPaidAmount: number;
    totalPaidBDT: number;
    filteredUnpaidCount: number;
    filteredUnpaidAmount: number;
    filteredPaidCount: number;
    filteredPaidAmount: number;
    filteredPaidBDT: number;
}

export interface EarningStatsResponse {
    message: string;
    data: EarningStats;
}

export interface ClientOrdersForWithdraw {
    clientId: string;
    clientName: string;
    clientCode: string;
    currency: string;
    orders: {
        earningId: string;
        orderId: string;
        orderName: string;
        orderDate: string;
        orderAmount: number;
    }[];
    totalAmount: number;
    orderCount: number;
}

export interface ClientOrdersResponse {
    message: string;
    data: ClientOrdersForWithdraw | null;
}

export interface BulkWithdrawResponse {
    message: string;
    data: {
        updatedCount: number;
        totalAmount: number;
        totalBDT: number;
    };
}

export interface YearsResponse {
    message: string;
    data: number[];
}

// Currency options
export const CURRENCIES = [
    { value: 'USD', label: 'US Dollar ($)', symbol: '$' },
    { value: 'EUR', label: 'Euro (€)', symbol: '€' },
    { value: 'GBP', label: 'British Pound (£)', symbol: '£' },
    { value: 'AUD', label: 'Australian Dollar (A$)', symbol: 'A$' },
    { value: 'CAD', label: 'Canadian Dollar (C$)', symbol: 'C$' },
] as const;

export const CURRENCY_SYMBOLS: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    AUD: 'A$',
    CAD: 'C$',
};
