import { Document, Types } from 'mongoose';

export type EarningStatus = 'unpaid' | 'paid';

export interface IPaymentLedger {
    invoiceNumber: string;
    amount: number;
    amountInBDT: number;
    method: 'Stripe' | 'PayPal' | 'Manual' | string;
    transactionId: string;
    paidAt: Date;
    conversionRate: number;
}

export interface IEarning extends Document {
    clientId: Types.ObjectId;
    month: number;
    year: number;

    // Linked orders
    orderIds: Types.ObjectId[];

    // Aggregated data
    imageQty: number;
    totalAmount: number;
    currency: string;

    // Withdrawal info (filled when status = paid)
    fees: number;
    tax: number;
    conversionRate: number;
    netAmount: number;
    amountInBDT: number;

    // Status
    status: EarningStatus;
    paidAmount: number;
    paidAmountBDT: number;
    payments: IPaymentLedger[];
    paidAt?: Date;
    paidBy?: Types.ObjectId;

    // Legacy support
    isLegacy: boolean;
    legacyClientCode?: string;

    notes?: string;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

export interface IEarningPopulated {
    _id: string;
    clientId: {
        _id: string;
        clientId: string;
        name: string;
        emails: string[];
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
    paidAmount: number;
    paidAmountBDT: number;
    payments: Array<{
        invoiceNumber: string;
        amount: number;
        amountInBDT: number;
        method: string;
        transactionId: string;
        paidAt: string;
        conversionRate: number;
    }>;
    paidAt?: string;
    paidBy?: string;
    isLegacy: boolean;
    legacyClientCode?: string;
    notes?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateEarningForOrderData {
    orderId: string;
    clientId: string;
    orderDate: Date;
    orderAmount: number;
    imageQty: number;
    currency: string;
    createdBy: string;
}

export interface WithdrawEarningData {
    amount?: number | undefined; // Optional: specify amount for partial payment
    method?: string | undefined; // Optional: specify method
    invoiceNumber?: string | undefined; // Optional: link to a specific invoice
    transactionId?: string | undefined; // Optional: reference ID
    fees?: number | undefined;
    tax?: number | undefined;
    conversionRate?: number;
    notes?: string | undefined;
    paidBy: string;
}

export interface BulkWithdrawData {
    earningIds: string[];
    totalFees: number;
    totalTax: number;
    conversionRate: number;
    notes?: string;
    paidBy: string;
}

export interface EarningQueryParams {
    page?: number;
    limit?: number;
    clientId?: string;
    clientIds?: string[];
    status?: EarningStatus;
    // Date filters
    filterType?: 'today' | 'week' | 'month' | 'year';
    month?: number;
    year?: number;
}

export interface EarningStatsResult {
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

export interface ImportLegacyEarningData {
    clientId: string;
    legacyClientCode: string;
    month: number;
    year: number;
    imageQty: number;
    totalAmount: number;
    currency: string;
    conversionRate: number;
    amountInBDT: number;
    status: EarningStatus;
    createdBy: string;
}
