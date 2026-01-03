import { subMonths } from 'date-fns';
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

async function getFinanceAnalytics(
    params: AnalyticsQueryParams
): Promise<IFinanceAnalytics> {
    const now = new Date();
    const monthsToFetch = params.months || 12;
    const year = params.year || now.getFullYear();

    // Get paid order IDs for unpaid calculation
    const paidOrderIds = await EarningModel.distinct('orderIds');

    // Parallel fetch all data
    const [
        // Summary stats
        totalEarningsResult,
        totalExpensesResult,
        totalOrdersResult,
        deliveredOrdersResult,
        unpaidOrdersResult,
        // Monthly trends
        monthlyEarnings,
        monthlyExpenses,
        monthlyOrders,
        // Client breakdown
        clientEarnings,
        clientOrders,
        // Expense categories
        expensesByCategory,
    ] = await Promise.all([
        // Total earnings
        EarningModel.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amountInBDT' } } },
        ]),
        // Total expenses
        ExpenseModel.aggregate([
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        // Total orders
        OrderModel.countDocuments(),
        // Delivered orders with revenue
        OrderModel.aggregate([
            { $match: { status: 'delivered' } },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    revenue: { $sum: '$totalPrice' },
                },
            },
        ]),
        // Unpaid orders revenue
        OrderModel.aggregate([
            { $match: { status: 'delivered', _id: { $nin: paidOrderIds } } },
            { $group: { _id: null, total: { $sum: '$totalPrice' } } },
        ]),
        // Monthly earnings (last N months)
        EarningModel.aggregate([
            { $match: { status: 'completed', year: { $gte: year - 1 } } },
            {
                $group: {
                    _id: { month: '$month', year: '$year' },
                    total: { $sum: '$amountInBDT' },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]),
        // Monthly expenses (last N months)
        ExpenseModel.aggregate([
            {
                $group: {
                    _id: {
                        month: { $month: '$date' },
                        year: { $year: '$date' },
                    },
                    total: { $sum: '$amount' },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]),
        // Monthly orders
        OrderModel.aggregate([
            { $match: { status: 'delivered' } },
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
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]),
        // Client earnings
        EarningModel.aggregate([
            { $match: { status: 'completed' } },
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
        // Client orders
        OrderModel.aggregate([
            { $match: { status: 'delivered' } },
            {
                $group: {
                    _id: '$clientId',
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: '$totalPrice' },
                },
            },
        ]),
        // Expenses by category
        ExpenseModel.aggregate([
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
    const unpaidRevenue = (unpaidOrdersResult[0]?.total || 0) * 120;

    // Get total profit transfers (shared amount)
    const profitTransferResult = await ProfitTransferModel.aggregate([
        { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalShared = profitTransferResult[0]?.total || 0;

    // Get debit balance (Borrow - Return = net amount owed to us)
    const debitBorrowResult = await DebitModel.aggregate([
        { $match: { type: DebitType.BORROW } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const debitReturnResult = await DebitModel.aggregate([
        { $match: { type: DebitType.RETURN } },
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
        totalExpenses,
        totalProfit: totalEarnings - totalExpenses,
        totalRevenue: deliveredData.revenue * 120,
        unpaidRevenue,
        totalShared,
        totalDebit,
        finalAmount,
        totalOrders: totalOrdersResult,
        deliveredOrders: deliveredData.count,
    };

    // Build monthly trends (last 12 months)
    const monthlyTrends: IMonthlyFinance[] = [];
    for (let i = monthsToFetch - 1; i >= 0; i--) {
        const date = subMonths(now, i);
        const month = date.getMonth() + 1;
        const yr = date.getFullYear();

        const earningData = monthlyEarnings.find(
            (e: any) => e._id.month === month && e._id.year === yr
        );
        const expenseData = monthlyExpenses.find(
            (e: any) => e._id.month === month && e._id.year === yr
        );
        const orderData = monthlyOrders.find(
            (o: any) => o._id.month === month && o._id.year === yr
        );

        const earnings = earningData?.total || 0;
        const expenses = expenseData?.total || 0;

        monthlyTrends.push({
            month,
            year: yr,
            monthName: MONTH_NAMES[month - 1] || '',
            earnings,
            expenses,
            profit: earnings - expenses,
            orderCount: orderData?.count || 0,
            orderRevenue: (orderData?.revenue || 0) * 120,
        });
    }

    // Build client breakdown
    const clientOrdersMap = new Map(
        clientOrders.map((c: any) => [c._id?.toString(), c])
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
            totalRevenue: orderData.totalRevenue * 120,
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
};
