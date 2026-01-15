import { Document, Types } from 'mongoose';

export type EarningStatus = 'unpaid' | 'paid';

export interface IEarning extends Document {
    orderId: Types.ObjectId;
    clientId: Types.ObjectId;

    // Order info (denormalized for performance)
    orderName: string;
    orderDate: Date;
    orderAmount: number;
    currency: string;

    // Withdrawal info (filled when status = paid)
    fees: number;
    tax: number;
    conversionRate: number;
    netAmount: number;
    amountInBDT: number;

    // Status
    status: EarningStatus;
    paidAt?: Date;
    paidBy?: Types.ObjectId;

    notes?: string;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

export interface IEarningPopulated {
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

export interface CreateEarningForOrderData {
    orderId: string;
    clientId: string;
    orderName: string;
    orderDate: Date;
    orderAmount: number;
    currency: string;
    createdBy: string;
}

export interface WithdrawEarningData {
    fees?: number;
    tax?: number;
    conversionRate: number;
    notes?: string;
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
    status?: EarningStatus;
    // Date filters
    filterType?: 'today' | 'week' | 'month' | 'year' | 'range';
    startDate?: string;
    endDate?: string;
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
    orders: {
        earningId: string;
        orderId: string;
        orderName: string;
        orderDate: Date;
        orderAmount: number;
    }[];
    totalAmount: number;
    orderCount: number;
}
