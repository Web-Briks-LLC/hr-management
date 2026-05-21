export interface INormalizedTransaction {
    id: string;
    date: string | Date;
    title: string;
    type: 'earning' | 'expense' | 'debit' | 'wallet' | 'profit_share' | 'profit_transfer';
    subType?: string;
    amount: number;
    currency: string;
    amountInBDT: number;
    flow: 'inflow' | 'outflow';
    status: 'paid' | 'pending' | 'partial_paid' | 'completed' | 'failed' | 'cancelled' | 'distributed';
    referenceId?: string;
    createdBy?: {
        _id: string;
        name: string;
        email?: string;
    } | string;
    runningBalance?: number;
    note?: string;
}

export interface TransactionQueryParams {
    startDate?: string; // ISO format or YYYY-MM-DD
    endDate?: string;   // ISO format or YYYY-MM-DD
    type?: string;      // comma-separated types, e.g. 'earning,expense'
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

export interface TransactionsResponse {
    success: boolean;
    data: ITransactionReportData;
}
