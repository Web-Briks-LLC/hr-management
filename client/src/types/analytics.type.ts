export interface IMonthlyFinance {
    month: number;
    year: number;
    monthName: string;
    earnings: number;
    expenses: number;
    profit: number;
    orderCount: number;
    orderRevenue: number;
}

export interface IClientFinance {
    clientId: string;
    clientName: string;
    totalEarnings: number;
    totalOrders: number;
    totalRevenue: number;
    unpaidRevenue: number;
}

export interface IExpenseCategory {
    categoryId: string;
    categoryName: string;
    total: number;
}

export interface IFinanceAnalytics {
    summary: {
        totalEarnings: number;
        earningsByCurrency?: {
            currency: string;
            amount: number;
            amountBDT: number;
        }[];
        totalExpenses: number;
        expensesByCurrency?: {
            currency: string;
            amount: number;
            amountBDT: number;
        }[];
        totalProfit: number;
        profitByCurrency?: {
            currency: string;
            amount: number;
            amountBDT: number;
        }[];
        totalRevenue: number;
        unpaidRevenue: number;
        unpaidByCurrency?: {
            currency: string;
            amount: number;
            amountBDT: number;
        }[];
        totalShared: number;
        totalDebit: number;
        finalAmount: number;
        totalOrders: number;
        deliveredOrders: number;
    };
    monthlyTrends: IMonthlyFinance[];
    clientBreakdown: IClientFinance[];
    expensesByCategory: IExpenseCategory[];
}

export interface AnalyticsQueryParams {
    year?: number;
    months?: number;
    month?: number;
}
