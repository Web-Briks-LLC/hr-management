import { endOfMonth, endOfYear } from 'date-fns';
import EarningModel from '../models/earning.model.js';
import ExpenseModel from '../models/expense.model.js';
import ProfitTransferModel from '../models/profit-transfer.model.js';
import DebitModel, { DebitType } from '../models/Debit.js';
import type {
    IFinanceAnalytics,
    IMonthlyFinance,
    IClientFinance,
    AnalyticsQueryParams,
} from '../types/analytics.type.js';

const MONTH_NAMES = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
];

async function getAvailableAnalyticsYears(): Promise<number[]> {
    const earningYears = await EarningModel.aggregate([
        { $project: { year: '$year' } },
        { $group: { _id: null, years: { $addToSet: '$year' } } },
    ]);
    const expenseYears = await ExpenseModel.aggregate([
        { $project: { year: { $year: '$date' } } },
        { $group: { _id: null, years: { $addToSet: '$year' } } },
    ]);

    const distinctEarningYears = earningYears[0]?.years || [];
    const distinctExpenseYears = expenseYears[0]?.years || [];

    // Merge and unique
    const allYears = Array.from(
        new Set([
            ...distinctEarningYears,
            ...distinctExpenseYears,
            new Date().getFullYear(),
        ]),
    );
    return allYears.map(Number).sort((a, b) => b - a); // Descending
}

async function getFinanceAnalytics(
    params: AnalyticsQueryParams,
): Promise<IFinanceAnalytics> {
    const now = new Date();
    const year = params.year || now.getFullYear();
    const month = params.month; // Optional: 1-12

    // Determine date range for expense/transfer lookups
    let startDate: Date;
    let endDate: Date;

    if (month) {
        startDate = new Date(year, month - 1, 1);
        endDate = endOfMonth(startDate);
    } else {
        startDate = new Date(year, 0, 1);
        endDate = endOfYear(startDate);
    }

    // Common Date Filters for Earnings (uses year/month fields)
    const earningMatch: any = {
        status: 'paid',
        year: year,
    };
    if (month) {
        earningMatch.month = month;
    }

    // Others use Date objects
    const expenseFilter: any = {
        date: { $gte: startDate, $lte: endDate },
    };

    // Parallel fetch all data
    const [
        // Summary stats
        totalEarningsResult,
        totalExpensesResult,
        // Monthly trends
        monthlyEarnings,
        monthlyExpenses,
        monthlyOrdersResult,
        // Client breakdown
        clientEarnings,
        // Expense categories
        expensesByCategory,
        // Earnings by currency (Paid)
        earningsByCurrencyResult,
        // Unpaid earnings by currency
        unpaidByCurrencyResult,
        // Total Billable (Summary)
        totalBillableResult,
    ] = await Promise.all([
        // Total earnings (Paid)
        EarningModel.aggregate([
            { $match: earningMatch },
            { $group: { _id: null, total: { $sum: '$amountInBDT' } } },
        ]),
        // Total expenses
        ExpenseModel.aggregate([
            { $match: expenseFilter },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        // Monthly earnings (Full Year for Trends)
        EarningModel.aggregate([
            {
                $match: {
                    status: 'paid',
                    year: year,
                },
            },
            {
                $group: {
                    _id: { month: '$month' },
                    total: { $sum: '$amountInBDT' },
                },
            },
        ]),
        // Monthly expenses (Full Year)
        ExpenseModel.aggregate([
            {
                $match: {
                    date: {
                        $gte: new Date(year, 0, 1),
                        $lte: new Date(year, 11, 31, 23, 59, 59, 999),
                    },
                },
            },
            {
                $group: {
                    _id: { month: { $month: '$date' } },
                    total: { $sum: '$amount' },
                },
            },
        ]),
        // Monthly orders (Full Year) - Based on Earning records for accurate billing counts
        EarningModel.aggregate([
            {
                $match: {
                    year: year,
                },
            },
            {
                $group: {
                    _id: { month: '$month' },
                    count: { $sum: { $size: { $ifNull: ['$orderIds', []] } } },
                    revenue: { $sum: '$amountInBDT' },
                },
            },
        ]),
        // Client earnings (Filtered by selected period) - Includes all billing impact
        EarningModel.aggregate([
            {
                $match: {
                    year: year,
                    ...(month && { month }),
                },
            },
            {
                $group: {
                    _id: '$clientId',
                    paidEarnings: {
                        $sum: {
                            $cond: [
                                { $eq: ['$status', 'paid'] },
                                '$amountInBDT',
                                0,
                            ],
                        },
                    },
                    unpaidRevenue: {
                        $sum: {
                            $cond: [
                                { $eq: ['$status', 'unpaid'] },
                                '$amountInBDT',
                                0,
                            ],
                        },
                    },
                    totalOrders: {
                        $sum: { $size: { $ifNull: ['$orderIds', []] } },
                    },
                },
            },
            {
                $lookup: {
                    from: 'clients',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'client',
                },
            },
            { $unwind: { path: '$client', preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    totalRevenue: { $add: ['$paidEarnings', '$unpaidRevenue'] },
                },
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: 10 },
        ]),
        // Expenses by category (Filtered by selected period)
        ExpenseModel.aggregate([
            { $match: expenseFilter },
            {
                $group: {
                    _id: '$categoryId',
                    total: { $sum: '$amount' },
                },
            },
            {
                $lookup: {
                    from: 'expensecategories',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'category',
                },
            },
            {
                $unwind: {
                    path: '$category',
                    preserveNullAndEmptyArrays: true,
                },
            },
            { $sort: { total: -1 } },
        ]),
        // Earnings by currency (Paid)
        EarningModel.aggregate([
            {
                $match: {
                    status: 'paid',
                    year: year,
                    ...(month && { month }),
                },
            },
            {
                $group: {
                    _id: '$currency',
                    amount: { $sum: '$totalAmount' },
                    totalBDT: { $sum: '$amountInBDT' },
                },
            },
        ]),
        // Unpaid earnings by currency
        EarningModel.aggregate([
            {
                $match: {
                    status: 'unpaid',
                    year: year,
                    ...(month && { month }),
                },
            },
            {
                $group: {
                    _id: '$currency',
                    amount: { $sum: '$totalAmount' },
                    totalBDT: { $sum: '$amountInBDT' },
                },
            },
        ]),
        // Total Billable (Summary)
        EarningModel.aggregate([
            {
                $match: {
                    year: year,
                    ...(month && { month }),
                },
            },
            {
                $group: {
                    _id: null,
                    totalBDT: { $sum: '$amountInBDT' },
                    totalOrders: {
                        $sum: { $size: { $ifNull: ['$orderIds', []] } },
                    },
                },
            },
        ]),
    ]);

    // Build summary calculations
    const totalEarnings = totalEarningsResult[0]?.total || 0;
    const totalExpenses = totalExpensesResult[0]?.total || 0;

    const totalRevenue = totalBillableResult[0]?.totalBDT || 0;
    const deliveredOrdersCount = totalBillableResult[0]?.totalOrders || 0;

    // Process unpaid and paid totals
    const unpaidRevenue = (unpaidByCurrencyResult || []).reduce(
        (sum: number, item: any) => sum + (item.totalBDT || 0),
        0,
    );

    // Process earnings by currency
    const earningsByCurrency = (earningsByCurrencyResult || []).map(
        (item: any) => ({
            currency: item._id || 'USD',
            amount: item.amount || 0,
            amountBDT: item.totalBDT || 0,
        }),
    );

    const unpaidByCurrency = (unpaidByCurrencyResult || []).map(
        (item: any) => ({
            currency: item._id || 'USD',
            amount: item.amount || 0,
            amountBDT: item.totalBDT || 0,
        }),
    );

    // Calculate profit
    const totalProfit = totalEarnings - totalExpenses;

    const APPROX_RATES: Record<string, number> = {
        USD: 117,
        EUR: 127,
        GBP: 148,
    };

    const expensesByCurrency = Object.keys(APPROX_RATES).map((currency) => ({
        currency,
        amount: totalExpenses / (APPROX_RATES[currency] || 1),
        amountBDT: totalExpenses,
    }));

    const profitByCurrency = Object.keys(APPROX_RATES).map((currency) => ({
        currency,
        amount: totalProfit / (APPROX_RATES[currency] || 1),
        amountBDT: totalProfit,
    }));

    // Get total profit transfers (External Business)
    const profitTransferResult = await ProfitTransferModel.aggregate([
        { $match: { transferDate: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalTransferred = profitTransferResult[0]?.total || 0;

    // Get total profit distributions (Shareholders)
    const profitDistributionResult =
        await import('../models/profit-distribution.model.js').then((m) =>
            m.default.aggregate([
                {
                    $match: {
                        distributedAt: { $gte: startDate, $lte: endDate },
                    },
                },
                { $group: { _id: null, total: { $sum: '$shareAmount' } } },
            ]),
        );
    const totalDistributed = profitDistributionResult[0]?.total || 0;

    const totalShared = totalTransferred + totalDistributed;

    // Get ALL TIME debit balance for Final Amount calculation
    const debitBorrowResult = await DebitModel.aggregate([
        {
            $match: {
                type: DebitType.BORROW,
            },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const debitReturnResult = await DebitModel.aggregate([
        {
            $match: {
                type: DebitType.RETURN,
            },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalBorrow = debitBorrowResult[0]?.total || 0;
    const totalReturn = debitReturnResult[0]?.total || 0;
    const totalDebit = totalBorrow - totalReturn; // Net amount owed to us (All Time)

    // --- CUMULATIVE STATS FOR FINAL AMOUNT ---
    // Final Amount = Cumulative Profit + All Time Debit up to selected year/month
    const cumulativeEarningMatch: any = { status: 'paid' };
    if (month) {
        cumulativeEarningMatch.$or = [
            { year: { $lt: year } },
            { year: year, month: { $lte: month } },
        ];
    } else {
        cumulativeEarningMatch.year = { $lte: year };
    }

    const cumulativeDateFilter = { $lte: endDate };

    const [
        cumEarningsResult,
        cumExpensesResult,
        cumTransfersResult,
        cumDistributionsResult,
    ] = await Promise.all([
        EarningModel.aggregate([
            { $match: cumulativeEarningMatch },
            { $group: { _id: null, total: { $sum: '$amountInBDT' } } },
        ]),
        ExpenseModel.aggregate([
            { $match: { date: cumulativeDateFilter } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        ProfitTransferModel.aggregate([
            { $match: { transferDate: cumulativeDateFilter } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        import('../models/profit-distribution.model.js').then((m) =>
            m.default.aggregate([
                { $match: { distributedAt: cumulativeDateFilter } },
                { $group: { _id: null, total: { $sum: '$shareAmount' } } },
            ]),
        ),
    ]);

    const cumEarnings = cumEarningsResult[0]?.total || 0;
    const cumExpenses = cumExpensesResult[0]?.total || 0;
    const cumShared =
        (cumTransfersResult[0]?.total || 0) +
        (cumDistributionsResult[0]?.total || 0);

    let finalAmount = cumEarnings - cumExpenses - cumShared;
    if (year >= 2025) {
        finalAmount += totalDebit;
    }
    finalAmount = Math.max(0, finalAmount);

    const summary = {
        totalEarnings,
        earningsByCurrency,
        totalExpenses,
        expensesByCurrency,
        totalProfit,
        profitByCurrency,
        totalRevenue,
        unpaidRevenue,
        unpaidByCurrency,
        totalShared,
        totalDebit,
        finalAmount,
        totalOrders: deliveredOrdersCount, // Using accurate billing orders
        deliveredOrders: deliveredOrdersCount,
    };

    // Build monthly trends (12 months of the selected year)
    const monthlyTrends: IMonthlyFinance[] = [];

    for (let m = 1; m <= 12; m++) {
        const earningData = monthlyEarnings.find((e: any) => e._id.month === m);
        const expenseData = monthlyExpenses.find((e: any) => e._id.month === m);
        const orderData = monthlyOrdersResult.find(
            (o: any) => o._id.month === m,
        );

        const earnings = earningData?.total || 0;
        const expenses = expenseData?.total || 0;

        monthlyTrends.push({
            month: m,
            year: year,
            monthName: MONTH_NAMES[m - 1] || '',
            earnings,
            expenses,
            profit: earnings - expenses,
            orderCount: orderData?.count || 0,
            orderRevenue: orderData?.revenue || 0,
        });
    }

    // Build client breakdown
    const clientBreakdown: IClientFinance[] = clientEarnings.map((c: any) => ({
        clientId: c._id,
        clientName: c.client?.name || 'Unknown',
        totalEarnings: c.paidEarnings,
        totalOrders: c.totalOrders,
        totalRevenue: c.totalRevenue,
        unpaidRevenue: c.unpaidRevenue,
    }));

    // Build expenses by category
    const expensesByCategoryFormatted = expensesByCategory.map((e: any) => ({
        categoryId: e._id?.toString() || 'uncategorized',
        categoryName: e.category?.name || 'Uncategorized',
        total: e.total,
    }));

    return {
        summary,
        monthlyTrends,
        clientBreakdown,
        expensesByCategory: expensesByCategoryFormatted,
    };
}

async function getFinanceTotalsForPeriod(year: number, month: number) {
    const earningMatch = {
        status: 'paid',
        year: year,
        month: month,
    };

    // Expenses use date objects
    const startDate = new Date(`${year}-${month.toString().padStart(2, '0')}-01T00:00:00+06:00`);
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = new Date(`${year}-${month.toString().padStart(2, '0')}-${lastDay}T23:59:59.999+06:00`);

    const expenseFilter = {
        date: { $gte: startDate, $lte: endDate },
    };

    const [earnings, expenses] = await Promise.all([
        EarningModel.aggregate([
            { $match: earningMatch },
            { $group: { _id: null, total: { $sum: '$amountInBDT' } } },
        ]),
        ExpenseModel.aggregate([
            { $match: expenseFilter },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
    ]);

    return {
        totalEarnings: earnings[0]?.total || 0,
        totalExpenses: expenses[0]?.total || 0,
    };
}

async function getCurrentFinalAmount(session?: any): Promise<number> {
    const now = new Date();
    const currentYear = now.getFullYear();

    // Cumulative Earnings
    const cumEarningsResult = await EarningModel.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amountInBDT' } } },
    ], { session });
    const cumEarnings = cumEarningsResult[0]?.total || 0;

    // Cumulative Expenses
    const cumExpensesResult = await ExpenseModel.aggregate([
        { $group: { _id: null, total: { $sum: '$amount' } } },
    ], { session });
    const cumExpenses = cumExpensesResult[0]?.total || 0;

    // Cumulative Shared (Transfers + Distributions)
    const [cumTransfersResult, cumDistributionsResult] = await Promise.all([
        ProfitTransferModel.aggregate([
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ], { session }),
        import('../models/profit-distribution.model.js').then((m) =>
            m.default.aggregate([
                { $group: { _id: null, total: { $sum: '$shareAmount' } } },
            ], { session }),
        ),
    ]);
    const cumShared =
        (cumTransfersResult[0]?.total || 0) +
        (cumDistributionsResult[0]?.total || 0);

    // All Time Debit
    const [debitBorrowResult, debitReturnResult] = await Promise.all([
        DebitModel.aggregate([
            { $match: { type: DebitType.BORROW } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ], { session }),
        DebitModel.aggregate([
            { $match: { type: DebitType.RETURN } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ], { session }),
    ]);
    const totalBorrow = debitBorrowResult[0]?.total || 0;
    const totalReturn = debitReturnResult[0]?.total || 0;
    const totalDebit = totalBorrow - totalReturn;

    let finalAmount = cumEarnings - cumExpenses - cumShared;
    if (currentYear >= 2025) {
        finalAmount += totalDebit;
    }

    return Math.max(0, finalAmount);
}

export default {
    getFinanceAnalytics,
    getAvailableAnalyticsYears,
    getFinanceTotalsForPeriod,
    getCurrentFinalAmount,
};
