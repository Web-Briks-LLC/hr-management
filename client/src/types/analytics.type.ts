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
        totalExpenses: number;
        totalProfit: number;
        totalRevenue: number;
        unpaidRevenue: number;
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
