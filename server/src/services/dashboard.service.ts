import {
    startOfDay,
    endOfDay,
    startOfMonth,
    endOfMonth,
    subMonths,
    format,
} from 'date-fns';
import StaffModel from '../models/staff.model.js';
import AttendanceDayModel from '../models/attendance-day.model.js';
import OvertimeModel from '../models/overtime.model.js';
import EarningModel from '../models/earning.model.js';
import ExpenseModel from '../models/expense.model.js';
import OrderModel from '../models/order.model.js';
import LeaveApplicationModel from '../models/leave_application.model.js';
import CurrencyRateModel from '../models/currency-rate.model.js';
import { client } from '../lib/db.js';
import { Role } from '../constants/role.js';
import envConfig from '../config/env.config.js';
import type {
    IDashboardStats,
    IStaffStats,
    IAttendanceOverview,
    IMonthlyAttendanceStats,
    IOvertimeSummary,
    IRecentActivity,
    IFinancialStats,
    IOrderDashboardStats,
    ILeaveDashboardStats,
    IMonthlyTrend,
} from '../types/dashboard.type.js';

const getStaffStats = async (): Promise<IStaffStats> => {
    const mongoClient = await client();
    const db = mongoClient.db(envConfig.db_name);

    // Find only staff and team_leader users (exclude admins)
    const staffUsers = await db
        .collection('user')
        .find({
            role: { $in: [Role.STAFF, Role.TEAM_LEADER] },
        })
        .toArray();

    const staffUserIds = staffUsers.map((u: any) => u._id);

    const total = await StaffModel.countDocuments({
        userId: { $in: staffUserIds },
    });

    const active = await StaffModel.countDocuments({
        userId: { $in: staffUserIds },
        status: 'active',
    });

    const inactive = total - active;

    const byDepartment = await StaffModel.aggregate([
        {
            $match: {
                userId: { $in: staffUserIds },
            },
        },
        {
            $group: {
                _id: '$department',
                count: { $sum: 1 },
            },
        },
        {
            $project: {
                _id: 0,
                department: '$_id',
                count: 1,
            },
        },
        {
            $sort: { count: -1 },
        },
    ]);

    return {
        total,
        active,
        inactive,
        byDepartment,
    };
};

const getTodayAttendanceOverview = async (): Promise<IAttendanceOverview> => {
    const today = new Date();
    const startDate = startOfDay(today);
    const endDate = endOfDay(today);

    const attendanceRecords = await AttendanceDayModel.find({
        date: {
            $gte: startDate,
            $lte: endDate,
        },
    });

    const total = attendanceRecords.length;
    const present = attendanceRecords.filter(
        (r) => r.status === 'present' || r.status === 'late',
    ).length;
    const absent = attendanceRecords.filter(
        (r) => r.status === 'absent',
    ).length;
    const late = attendanceRecords.filter((r) => r.status === 'late').length;
    const onLeave = attendanceRecords.filter(
        (r) => r.status === 'on_leave',
    ).length;

    const presentPercentage = total > 0 ? (present / total) * 100 : 0;

    return {
        date: today,
        total,
        present,
        absent,
        late,
        onLeave,
        presentPercentage: Math.round(presentPercentage * 100) / 100,
    };
};

const getMonthlyAttendanceStats = async (): Promise<IMonthlyAttendanceStats> => {
    const now = new Date();
    const startDate = startOfMonth(now);
    const endDate = endOfMonth(now);

    const attendanceRecords = await AttendanceDayModel.find({
        date: {
            $gte: startDate,
            $lte: endDate,
        },
    });

    const totalWorkingDays = attendanceRecords.length;
    const totalPresent = attendanceRecords.filter(
        (r) => r.status === 'present' || r.status === 'late',
    ).length;
    const totalAbsent = attendanceRecords.filter(
        (r) => r.status === 'absent',
    ).length;
    const totalLate = attendanceRecords.filter(
        (r) => r.status === 'late',
    ).length;

    const averageAttendance =
        totalWorkingDays > 0 ? (totalPresent / totalWorkingDays) * 100 : 0;

    return {
        month: now.toLocaleString('default', { month: 'long' }),
        year: now.getFullYear(),
        totalWorkingDays,
        totalPresent,
        totalAbsent,
        totalLate,
        averageAttendance: Math.round(averageAttendance * 100) / 100,
    };
};

const getOvertimeSummary = async (): Promise<IOvertimeSummary> => {
    const overtimeRecords = await OvertimeModel.find();

    const total = overtimeRecords.length;
    const pending = overtimeRecords.filter((r) => r.status === 'pending').length;
    const approved = overtimeRecords.filter((r) => r.status === 'approved').length;
    const rejected = overtimeRecords.filter((r) => r.status === 'rejected').length;
    const completed = approved;

    const totalMinutes = overtimeRecords.reduce(
        (sum, r) => sum + (r.durationMinutes || 0),
        0,
    );
    const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
    const totalAmount = 0;

    return {
        total,
        pending,
        approved,
        rejected,
        completed,
        totalHours,
        totalAmount: Math.round(totalAmount * 100) / 100,
    };
};

const getOrderDashboardStats = async (): Promise<IOrderDashboardStats> => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const [
        totalThisMonth,
        totalToday,
        inProgress,
        pending,
        completedThisMonth,
        deliveredThisMonth,
        urgentCount,
        imagesResult,
        statusAggregate,
        urgentOrders,
    ] = await Promise.all([
        OrderModel.countDocuments({
            orderDate: { $gte: monthStart, $lte: monthEnd },
        }),
        OrderModel.countDocuments({
            orderDate: { $gte: todayStart, $lte: todayEnd },
        }),
        OrderModel.countDocuments({
            status: { $in: ['in_progress', 'quality_check', 'revision'] },
        }),
        OrderModel.countDocuments({ status: 'pending' }),
        OrderModel.countDocuments({
            status: { $in: ['completed', 'delivered'] },
            orderDate: { $gte: monthStart, $lte: monthEnd },
        }),
        OrderModel.countDocuments({
            status: 'delivered',
            orderDate: { $gte: monthStart, $lte: monthEnd },
        }),
        OrderModel.countDocuments({
            priority: { $in: ['urgent', 'high'] },
            status: { $nin: ['completed', 'delivered', 'cancelled'] },
        }),
        OrderModel.aggregate([
            {
                $match: {
                    orderDate: { $gte: monthStart, $lte: monthEnd },
                },
            },
            { $group: { _id: null, totalImages: { $sum: '$imageQuantity' } } },
        ]),
        OrderModel.aggregate([
            {
                $match: {
                    status: { $ne: 'cancelled' },
                },
            },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        OrderModel.find({
            priority: { $in: ['urgent', 'high'] },
            status: { $nin: ['completed', 'delivered', 'cancelled'] },
        })
            .sort({ deadline: 1 })
            .limit(5)
            .populate('clientId', 'name')
            .lean(),
    ]);

    const totalImagesThisMonth = imagesResult[0]?.totalImages || 0;

    const statusLabels: Record<string, string> = {
        pending: 'Pending',
        in_progress: 'In Progress',
        quality_check: 'Quality Check',
        revision: 'Revision',
        completed: 'Completed',
        delivered: 'Delivered',
    };

    const statusBreakdown = statusAggregate.map((item: any) => ({
        status: item._id,
        count: item.count,
        label: statusLabels[item._id] || item._id,
    }));

    const urgentOrdersList = urgentOrders.map((o: any) => ({
        _id: o._id.toString(),
        orderName: o.orderName,
        clientName: o.clientId?.name || 'Unknown Client',
        deadline: o.deadline ? o.deadline.toISOString() : '',
        status: o.status,
        priority: o.priority,
        imageQuantity: o.imageQuantity || 1,
    }));

    return {
        totalThisMonth,
        totalToday,
        inProgress,
        pending,
        completedThisMonth,
        deliveredThisMonth,
        urgentCount,
        totalImagesThisMonth,
        statusBreakdown,
        urgentOrdersList,
    };
};

const getLeaveDashboardStats = async (): Promise<ILeaveDashboardStats> => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const [pending, onLeaveToday, approvedThisMonth] = await Promise.all([
        LeaveApplicationModel.countDocuments({ status: 'pending' }),
        AttendanceDayModel.countDocuments({
            date: { $gte: todayStart, $lte: todayEnd },
            status: 'on_leave',
        }),
        LeaveApplicationModel.countDocuments({
            status: 'approved',
            startDate: { $gte: monthStart, $lte: monthEnd },
        }),
    ]);

    return {
        pending,
        onLeaveToday,
        approvedThisMonth,
    };
};

const getFinancialStats = async (): Promise<IFinancialStats> => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const startOfMonthDate = startOfMonth(now);
    const endOfMonthDate = endOfMonth(now);

    // Fetch active currency conversion rate
    const latestRateDoc = await CurrencyRateModel.findOne({
        month: currentMonth,
        year: currentYear,
    }).sort({ createdAt: -1 });

    const usdRate =
        latestRateDoc?.rates?.find((r) => r.currency === 'USD')?.rate || 122;

    // Get all order IDs that have been included in earnings
    const paidOrderIds = await EarningModel.distinct('orderIds');

    const [
        earningsTotal,
        earningsThisMonth,
        expensesTotal,
        expensesThisMonth,
        deliveredRevenueResult,
        unpaidOrdersResult,
    ] = await Promise.all([
        // Total earnings (all time, BDT)
        EarningModel.aggregate([
            { $match: { status: 'paid' } },
            { $group: { _id: null, total: { $sum: '$amountInBDT' } } },
        ]),
        // This month earnings (BDT)
        EarningModel.aggregate([
            {
                $match: {
                    status: 'paid',
                    month: currentMonth,
                    year: currentYear,
                },
            },
            { $group: { _id: null, total: { $sum: '$amountInBDT' } } },
        ]),
        // Total expenses (all time)
        ExpenseModel.aggregate([
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        // This month expenses
        ExpenseModel.aggregate([
            {
                $match: {
                    date: { $gte: startOfMonthDate, $lte: endOfMonthDate },
                },
            },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        // Total revenue from ALL delivered/completed orders in USD
        OrderModel.aggregate([
            { $match: { status: { $in: ['delivered', 'completed'] } } },
            { $group: { _id: null, total: { $sum: '$totalPrice' } } },
        ]),
        // Unpaid = ALL orders NOT yet withdrawn in USD
        OrderModel.aggregate([
            {
                $match: {
                    status: { $ne: 'cancelled' },
                    _id: { $nin: paidOrderIds },
                },
            },
            { $group: { _id: null, total: { $sum: '$totalPrice' } } },
        ]),
    ]);

    const totalEarnings = earningsTotal[0]?.total || 0;
    const thisMonthEarnings = earningsThisMonth[0]?.total || 0;
    const totalExpenses = expensesTotal[0]?.total || 0;
    const thisMonthExpenses = expensesThisMonth[0]?.total || 0;
    const thisMonthProfit = thisMonthEarnings - thisMonthExpenses;

    const totalRevenueUSD = deliveredRevenueResult[0]?.total || 0;
    const unpaidRevenueUSD = unpaidOrdersResult[0]?.total || 0;
    const totalRevenue = totalRevenueUSD * usdRate;
    const unpaidRevenue = unpaidRevenueUSD * usdRate;
    const profit = totalEarnings - totalExpenses;

    return {
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        thisMonthEarnings: Math.round(thisMonthEarnings * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        thisMonthExpenses: Math.round(thisMonthExpenses * 100) / 100,
        thisMonthProfit: Math.round(thisMonthProfit * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        unpaidRevenue: Math.round(unpaidRevenue * 100) / 100,
        unpaidRevenueUSD: Math.round(unpaidRevenueUSD * 100) / 100,
        totalRevenueUSD: Math.round(totalRevenueUSD * 100) / 100,
        profit: Math.round(profit * 100) / 100,
    };
};

const getMonthlyTrends = async (): Promise<IMonthlyTrend[]> => {
    const trends: IMonthlyTrend[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
        const targetDate = subMonths(now, i);
        const mStart = startOfMonth(targetDate);
        const mEnd = endOfMonth(targetDate);
        const mNum = targetDate.getMonth() + 1;
        const yNum = targetDate.getFullYear();

        const [earningsRes, expensesRes, ordersCount] = await Promise.all([
            EarningModel.aggregate([
                {
                    $match: {
                        status: 'paid',
                        month: mNum,
                        year: yNum,
                    },
                },
                { $group: { _id: null, total: { $sum: '$amountInBDT' } } },
            ]),
            ExpenseModel.aggregate([
                {
                    $match: {
                        date: { $gte: mStart, $lte: mEnd },
                    },
                },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            OrderModel.countDocuments({
                orderDate: { $gte: mStart, $lte: mEnd },
            }),
        ]);

        const earnings = earningsRes[0]?.total || 0;
        const expenses = expensesRes[0]?.total || 0;
        const profit = earnings - expenses;

        trends.push({
            month: format(targetDate, 'MMMM yyyy'),
            shortMonth: format(targetDate, 'MMM'),
            year: yNum,
            earnings: Math.round(earnings),
            expenses: Math.round(expenses),
            profit: Math.round(profit),
            orders: ordersCount,
        });
    }

    return trends;
};

const getRecentActivities = async (): Promise<IRecentActivity[]> => {
    try {
        const [recentAttendance, recentOvertime, recentLeaves, recentOrders] =
            await Promise.all([
                AttendanceDayModel.find()
                    .sort({ createdAt: -1 })
                    .limit(4)
                    .populate('staffId', 'name email'),
                OvertimeModel.find()
                    .sort({ createdAt: -1 })
                    .limit(4)
                    .populate('staffId', 'name email'),
                LeaveApplicationModel.find()
                    .sort({ createdAt: -1 })
                    .limit(4)
                    .populate('staffId', 'name email'),
                OrderModel.find()
                    .sort({ createdAt: -1 })
                    .limit(4)
                    .populate('createdBy', 'name email'),
            ]);

        const activities: IRecentActivity[] = [];

        recentAttendance.forEach((record: any) => {
            if (record.staffId?.name) {
                activities.push({
                    _id: record._id,
                    type: 'attendance',
                    action: `Marked ${record.status}`,
                    description: `${record.staffId.name} marked ${record.status}`,
                    user: {
                        _id: record.staffId._id,
                        name: record.staffId.name,
                        email: record.staffId.email,
                    },
                    timestamp: record.createdAt || record.date,
                });
            }
        });

        recentOvertime.forEach((record: any) => {
            if (record.staffId?.name) {
                activities.push({
                    _id: record._id,
                    type: 'overtime',
                    action: `Overtime ${record.status}`,
                    description: `${record.staffId.name} overtime ${record.status}`,
                    user: {
                        _id: record.staffId._id,
                        name: record.staffId.name,
                        email: record.staffId.email,
                    },
                    timestamp: record.createdAt,
                });
            }
        });

        recentLeaves.forEach((record: any) => {
            if (record.staffId?.name) {
                activities.push({
                    _id: record._id,
                    type: 'leave',
                    action: `Leave Application ${record.status}`,
                    description: `${record.staffId.name} applied for ${record.leaveType} leave (${record.status})`,
                    user: {
                        _id: record.staffId._id,
                        name: record.staffId.name,
                        email: record.staffId.email,
                    },
                    timestamp: record.createdAt,
                });
            }
        });

        recentOrders.forEach((record: any) => {
            if (record.createdBy?.name || record.orderName) {
                activities.push({
                    _id: record._id,
                    type: 'staff',
                    action: `Order ${record.status}`,
                    description: `Order "${record.orderName}" created (${record.imageQuantity} images)`,
                    user: {
                        _id: record.createdBy?._id || record._id,
                        name: record.createdBy?.name || 'System',
                        email: record.createdBy?.email || '',
                    },
                    timestamp: record.createdAt,
                });
            }
        });

        return activities
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 12);
    } catch (error) {
        console.error('Error fetching recent activities:', error);
        return [];
    }
};

const getAdminDashboardStats = async (): Promise<IDashboardStats> => {
    const [
        staffStats,
        attendanceOverview,
        monthlyAttendanceStats,
        overtimeSummary,
        recentActivities,
        financialStats,
        orderStats,
        leaveStats,
        monthlyTrends,
    ] = await Promise.all([
        getStaffStats(),
        getTodayAttendanceOverview(),
        getMonthlyAttendanceStats(),
        getOvertimeSummary(),
        getRecentActivities(),
        getFinancialStats(),
        getOrderDashboardStats(),
        getLeaveDashboardStats(),
        getMonthlyTrends(),
    ]);

    return {
        staffStats,
        attendanceOverview,
        monthlyAttendanceStats,
        overtimeSummary,
        recentActivities,
        financialStats,
        orderStats,
        leaveStats,
        monthlyTrends,
    };
};

export default {
    getAdminDashboardStats,
    getStaffStats,
    getTodayAttendanceOverview,
    getMonthlyAttendanceStats,
    getOvertimeSummary,
    getRecentActivities,
    getFinancialStats,
    getOrderDashboardStats,
    getLeaveDashboardStats,
    getMonthlyTrends,
};
