export type EarningStatus = 'unpaid' | 'paid';

export interface IEarning {
    _id: string;
    clientId: {
        _id: string;
        clientId: string;
        name: string;
        email: string;
        currency?: string;
    };
    month: number;
    year: number;
    orderIds: string[];
    imageQty: number;
    totalAmount: number;
    currency: string;
    fees: number;
    tax: number;
    conversionRate: number;
    netAmount: number;
    amountInBDT: number;
    status: EarningStatus;
    paidAt?: string;
    paidBy?: string;
    isLegacy: boolean;
    legacyClientCode?: string;
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
    earningId: string;
    month: number;
    year: number;
    orderCount: number;
    imageQty: number;
    totalAmount: number;
}

export interface ClientOrdersResponse {
    message: string;
    data: ClientOrdersForWithdraw | null;
}

export interface YearsResponse {
    message: string;
    data: number[];
}

// Month names for display
export const MONTHS = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
] as const;

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
