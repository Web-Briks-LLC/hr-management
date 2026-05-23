<<<<<<< HEAD
import type { Types } from "mongoose";

export interface INormalizedTransaction {
    id: string;
    date: Date;
    title: string;
    type: 'earning' | 'expense' | 'debit' | 'wallet' | 'profit_share' | 'profit_transfer';
    subType?: string;
    amount: number;
    currency: string;
    amountInBDT: number;
    flow: 'inflow' | 'outflow';
    status: 'paid' | 'pending' | 'partial_paid' | 'completed' | 'failed' | 'cancelled' | 'distributed';
    referenceId?: string | Types.ObjectId;
    createdBy?: {
        _id: string | Types.ObjectId;
        name: string;
        email?: string;
    } | string;
    runningBalance?: number;
    note?: string;
    createdAt?: Date;
}

export interface TransactionQueryParams {
    startDate?: string; // ISO format or YYYY-MM-DD
    endDate?: string;   // ISO format or YYYY-MM-DD
    type?: string;      // e.g. 'earning,expense' or 'earning'
    search?: string;
    branchId?: string;
    page?: number;
    limit?: number;
}

export interface ITransactionReportData {
    summary: {
        openingBalance: number;
        totalInflow: number;
        totalOutflow: number;
        netChange: number;
        closingBalance: number;
    };
    transactions: INormalizedTransaction[];
}
=======
import type { Types } from "mongoose";

export interface INormalizedTransaction {
    id: string;
    date: Date;
    title: string;
    type: 'earning' | 'expense' | 'debit' | 'wallet' | 'profit_share' | 'profit_transfer';
    subType?: string;
    amount: number;
    currency: string;
    amountInBDT: number;
    flow: 'inflow' | 'outflow';
    status: 'paid' | 'pending' | 'partial_paid' | 'completed' | 'failed' | 'cancelled' | 'distributed';
    referenceId?: string | Types.ObjectId;
    createdBy?: {
        _id: string | Types.ObjectId;
        name: string;
        email?: string;
    } | string;
    runningBalance?: number;
    note?: string;
    createdAt?: Date;
}

export interface TransactionQueryParams {
    startDate?: string; // ISO format or YYYY-MM-DD
    endDate?: string;   // ISO format or YYYY-MM-DD
    type?: string;      // e.g. 'earning,expense' or 'earning'
    search?: string;
    branchId?: string;
    page?: number;
    limit?: number;
}

export interface ITransactionReportData {
    summary: {
        openingBalance: number;
        totalInflow: number;
        totalOutflow: number;
        netChange: number;
        closingBalance: number;
    };
    transactions: INormalizedTransaction[];
}

>>>>>>> 89a7d85984cd03ce81b5f521c9e0a8d31c12eab3
