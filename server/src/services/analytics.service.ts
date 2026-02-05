import { endOfMonth, endOfYear } from 'date-fns';
import EarningModel from '../models/earning.model.js';
import ExpenseModel from '../models/expense.model.js';
import OrderModel from '../models/order.model.js';
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

    // Determine date range
    let startDate: Date;
    let endDate: Date;

    if (month) {
        // Specific Month
        startDate = new Date(year, month - 1, 1);
        endDate = endOfMonth(startDate);
    } else {
        // Whole Year
        startDate = new Date(year, 0, 1);
        endDate = endOfYear(startDate);
    }

    // Common Date Filters
    // Earnings use 'year' and 'month' fields
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
    const orderFilter: any = {
        status: 'delivered',
        createdAt: { $gte: startDate, $lte: endDate },
    };

    // Parallel fetch all data
    const [
        // Summary stats
        totalEarningsResult,
        totalExpensesResult,
        totalOrdersResult,
        deliveredOrdersResult,
        unpaidOrdersResult,
        unpaidByCurrencyResult,
        // Monthly trends
        monthlyEarnings,
        monthlyExpenses,
        monthlyOrders,
        // Client breakdown
        clientEarnings,
        clientOrders,
        // Expense categories
        expensesByCategory,
        // Earnings by currency result
        earningsByCurrencyResult,
    ] = await Promise.all([
        // Total earnings
        EarningModel.aggregate([
            { $match: earningMatch },
            { $group: { _id: null, total: { $sum: '$amountInBDT' } } },
        ]),
        // Total expenses
        ExpenseModel.aggregate([
            { $match: expenseFilter },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        // Total orders (count only)
        OrderModel.countDocuments({
            createdAt: { $gte: startDate, $lte: endDate },
        }),
        // Delivered orders with revenue
        OrderModel.aggregate([
            { $match: orderFilter },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    revenue: { $sum: '$totalPrice' },
                },
            },
        ]),
        // Unpaid earnings (from Earnings table directly)
        EarningModel.aggregate([
            {
                $match: {
                    status: 'unpaid',
                    year: year,
                    ...(month && { month }),
                },
            },
            { $group: { _id: null, total: { $sum: '$amountInBDT' } } },
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
                },
            },
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
                    _id: {
                        month: '$month',
                        year: '$year',
                    },
                    total: { $sum: '$amountInBDT' },
                },
            },
            { $sort: { '_id.month': 1 } },
        ]),
        // Monthly expenses (Full Year)
        ExpenseModel.aggregate([
            {
                $match: {
                    date: {
                        $gte: new Date(year, 0, 1),
                        $lte: new Date(year, 11, 31),
                    },
                },
            },
            {
                $group: {
                    _id: {
                        month: { $month: '$date' },
                        year: { $year: '$date' },
                    },
                    total: { $sum: '$amount' },
                },
            },
            { $sort: { '_id.month': 1 } },
        ]),
        // Monthly orders (Full Year)
        OrderModel.aggregate([
            {
                $match: {
                    status: 'delivered',
                    createdAt: {
                        $gte: new Date(year, 0, 1),
                        $lte: new Date(year, 11, 31),
                    },
                },
            },
            {
                $group: {
                    _id: {
                        month: { $month: '$createdAt' },
                        year: { $year: '$createdAt' },
                    },
                    count: { $sum: 1 },
                    revenue: { $sum: '$totalPrice' },
                },
            },
            { $sort: { '_id.month': 1 } },
        ]),
        // Client earnings (Filtered by selected period)
        EarningModel.aggregate([
            { $match: earningMatch },
            {
                $group: {
                    _id: '$clientId',
                    totalEarnings: { $sum: '$amountInBDT' },
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
            { $sort: { totalEarnings: -1 } },
            { $limit: 10 },
        ]),
        // Client orders (Filtered by selected period)
        OrderModel.aggregate([
            { $match: orderFilter },
            {
                $group: {
                    _id: '$clientId',
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: '$totalPrice' },
                },
            },
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
    ]);

    // Build summary
    const totalEarnings = totalEarningsResult[0]?.total || 0;
    const totalExpenses = totalExpensesResult[0]?.total || 0;
    const deliveredData = deliveredOrdersResult[0] || { count: 0, revenue: 0 };
    const unpaidRevenue = unpaidOrdersResult[0]?.total || 0;

    // Process unpaid by currency with approximate BDT rates
    const APPROX_RATES: Record<string, number> = {
        USD: 117,
        EUR: 127,
        GBP: 148,
    };
    const unpaidByCurrency = (unpaidByCurrencyResult || []).map((item: any) => {
        const currency = item._id || 'USD';
        const rate = APPROX_RATES[currency] || 117;
        return {
            currency,
            amount: item.amount || 0,
            amountBDT: Math.round((item.amount || 0) * rate),
        };
    });

    // Process earnings by currency
    const earningsByCurrency = (earningsByCurrencyResult || []).map(
        (item: any) => {
            const currency = item._id || 'USD';
            const rate = APPROX_RATES[currency] || 117;
            return {
                currency,
                amount: item.amount || 0,
                amountBDT: Math.round((item.amount || 0) * rate),
            };
        },
    );

    // Calculate approximate Expenses and Profit in USD/EUR
    // Base totals are in BDT
    const totalProfit = totalEarnings - totalExpenses;

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

    // Get debit balance - Filtered?
    // Debits have dates.
    const debitBorrowResult = await DebitModel.aggregate([
        {
            $match: {
                type: DebitType.BORROW,
                date: { $gte: startDate, $lte: endDate },
            },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const debitReturnResult = await DebitModel.aggregate([
        {
            $match: {
                type: DebitType.RETURN,
                date: { $gte: startDate, $lte: endDate },
            },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalBorrow = debitBorrowResult[0]?.total || 0;
    const totalReturn = debitReturnResult[0]?.total || 0;
    const totalDebit = totalBorrow - totalReturn; // Net amount owed to us

    // Final Amount = Earnings - Expenses - Shared + Debit
    const finalAmount =
        totalEarnings - totalExpenses - totalShared + totalDebit;

    const summary = {
        totalEarnings,
        earningsByCurrency,
        totalExpenses,
        expensesByCurrency,
        totalProfit,
        profitByCurrency,
        totalRevenue: deliveredData.revenue,
        unpaidRevenue,
        unpaidByCurrency,
        totalShared,
        totalDebit,
        finalAmount,
        totalOrders: totalOrdersResult,
        deliveredOrders: deliveredData.count,
    };

    // Build monthly trends (12 months of the selected year)
    // Note: If 'month' param was passed, this still returns full year trends to keep charts context,
    // OR it could return just that one month.
    // Decision: Return full year trends so charts look good (contextual).
    const monthlyTrends: IMonthlyFinance[] = [];

    // Loop for 12 months of the requested year
    for (let m = 1; m <= 12; m++) {
        const earningData = monthlyEarnings.find((e: any) => e._id.month === m);
        const expenseData = monthlyExpenses.find((e: any) => e._id.month === m);
        const orderData = monthlyOrders.find((o: any) => o._id.month === m);

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
    const clientOrdersMap = new Map(
        clientOrders.map((c: any) => [c._id?.toString(), c]),
    );

    const clientBreakdown: IClientFinance[] = clientEarnings.map((c: any) => {
        const orderData = clientOrdersMap.get(c._id?.toString()) || {
            totalOrders: 0,
            totalRevenue: 0,
        };
        return {
            clientId: c._id,
            clientName: c.client?.name || 'Unknown',
            totalEarnings: c.totalEarnings,
            totalOrders: orderData.totalOrders,
            totalRevenue: orderData.totalRevenue,
            unpaidRevenue: 0,
        };
    });

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

export default {
    getFinanceAnalytics,
    getAvailableAnalyticsYears,
};
