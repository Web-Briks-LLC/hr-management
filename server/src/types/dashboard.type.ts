import type { Types } from 'mongoose';

export interface IStaffStats {
    total: number;
    active: number;
    inactive: number;
    byDepartment: {
        department: string;
        count: number;
    }[];
}

export interface IAttendanceOverview {
    date: Date;
    total: number;
    present: number;
    absent: number;
    late: number;
    onLeave: number;
    presentPercentage: number;
}

export interface IMonthlyAttendanceStats {
    month: string;
    year: number;
    totalWorkingDays: number;
    totalPresent: number;
    totalAbsent: number;
    totalLate: number;
    averageAttendance: number;
}

export interface IOvertimeSummary {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    completed: number;
    totalHours: number;
    totalAmount: number;
}

export interface IRecentActivity {
    _id: Types.ObjectId;
    type: 'attendance' | 'overtime' | 'shift' | 'staff' | 'leave';
    action: string;
    description: string;
    user: {
        _id: Types.ObjectId;
        name: string;
        email: string;
    };
    timestamp: Date;
}

export interface IFinancialStats {
    totalEarnings: number;
    thisMonthEarnings: number;
    totalExpenses: number;
    thisMonthExpenses: number;
    totalRevenue: number;
    unpaidRevenue: number;
    profit: number;
}

export interface IDashboardStats {
    staffStats: IStaffStats;
    attendanceOverview: IAttendanceOverview;
    monthlyAttendanceStats: IMonthlyAttendanceStats;
    overtimeSummary: IOvertimeSummary;
    recentActivities: IRecentActivity[];
    financialStats?: IFinancialStats;
}
