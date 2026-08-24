export interface StaffStats {
    total: number;
    active: number;
    inactive: number;
    byDepartment: {
        department: string;
        count: number;
    }[];
}

export interface AttendanceOverview {
    date: string;
    total: number;
    present: number;
    absent: number;
    late: number;
    onLeave: number;
    presentPercentage: number;
}

export interface MonthlyAttendanceStats {
    month: string;
    year: number;
    totalWorkingDays: number;
    totalPresent: number;
    totalAbsent: number;
    totalLate: number;
    averageAttendance: number;
}

export interface OvertimeSummary {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    completed: number;
    totalHours: number;
    totalAmount: number;
}

export interface RecentActivity {
    _id: string;
    type: 'attendance' | 'overtime' | 'shift' | 'staff' | 'leave';
    action: string;
    description: string;
    user: {
        _id: string;
        name: string;
        email: string;
    };
    timestamp: string;
}

export interface FinancialStats {
    totalEarnings: number;
    thisMonthEarnings: number;
    totalExpenses: number;
    thisMonthExpenses: number;
    thisMonthProfit: number;
    totalRevenue: number;
    unpaidRevenue: number;
    unpaidRevenueUSD: number;
    totalRevenueUSD: number;
    profit: number;
}

export interface OrderDashboardStats {
    totalThisMonth: number;
    totalToday: number;
    inProgress: number;
    pending: number;
    completedThisMonth: number;
    deliveredThisMonth: number;
    urgentCount: number;
    totalImagesThisMonth: number;
    statusBreakdown: {
        status: string;
        count: number;
        label: string;
    }[];
    urgentOrdersList?: {
        _id: string;
        orderName: string;
        clientName: string;
        deadline: string;
        status: string;
        priority: string;
        imageQuantity: number;
    }[];
}

export interface LeaveDashboardStats {
    pending: number;
    onLeaveToday: number;
    approvedThisMonth: number;
}

export interface MonthlyTrend {
    month: string;
    shortMonth: string;
    year: number;
    earnings: number;
    expenses: number;
    profit: number;
    orders: number;
}

export interface DashboardStats {
    staffStats: StaffStats;
    attendanceOverview: AttendanceOverview;
    monthlyAttendanceStats: MonthlyAttendanceStats;
    overtimeSummary: OvertimeSummary;
    recentActivities: RecentActivity[];
    financialStats: FinancialStats;
    orderStats: OrderDashboardStats;
    leaveStats: LeaveDashboardStats;
    monthlyTrends: MonthlyTrend[];
}

