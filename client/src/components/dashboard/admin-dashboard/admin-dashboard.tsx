'use client';

import { useGetAdminDashboardQuery } from '@/redux/features/dashboard/dashboardApi';
import { StatCard } from './stat-card';
import { AttendanceOverviewChart } from './attendance-overview-chart';
import { OvertimeSummaryTable } from './overtime-summary-table';
import { RecentActivities } from './recent-activities';
import { AdminDashboardSkeleton } from './admin-dashboard-skeleton';
import { Users, UserCheck, Clock, TrendingUp, DollarSign, Receipt, Wallet, ArrowUpRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminDashboard() {
    const { data, isLoading, error, refetch } = useGetAdminDashboardQuery(undefined, {
        pollingInterval: 30000, // Refetch every 30 seconds
    });

    if (isLoading) {
        return <AdminDashboardSkeleton />;
    }

    if (error) {
        return (
            <div className="space-y-4">
                <Alert variant="destructive">
                    <AlertCircle className="size-4" />
                    <AlertDescription>
                        Failed to load dashboard data. Please try again.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    if (!data) {
        return null;
    }

    const { staffStats, attendanceOverview, monthlyAttendanceStats, overtimeSummary, recentActivities, financialStats } = data;

    const formatCurrency = (amount: number) => {
        return `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Staff"
                    value={staffStats.total}
                    icon={Users}
                    description={`${staffStats.active} active, ${staffStats.inactive} inactive`}
                    variant="primary"
                />
                <StatCard
                    title="Today's Attendance"
                    value={`${attendanceOverview.presentPercentage.toFixed(1)}%`}
                    icon={UserCheck}
                    description={`${attendanceOverview.present} out of ${attendanceOverview.total} present`}
                    variant="success"
                />
                <StatCard
                    title="Pending Overtime"
                    value={overtimeSummary.pending}
                    icon={Clock}
                    description={`${overtimeSummary.total} total requests`}
                    variant="warning"
                />
                <StatCard
                    title="Monthly Attendance"
                    value={`${monthlyAttendanceStats.averageAttendance.toFixed(1)}%`}
                    icon={TrendingUp}
                    description={`${monthlyAttendanceStats.month} ${monthlyAttendanceStats.year}`}
                    variant="default"
                />
            </div>

            {/* Charts and Summary */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4">
                    <AttendanceOverviewChart data={attendanceOverview} />
                </div>
                <div className="col-span-3">
                    <OvertimeSummaryTable data={overtimeSummary} />
                </div>
            </div>

            {/* Department Stats */}
            {staffStats.byDepartment.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {staffStats.byDepartment.slice(0, 4).map((dept: { department: string; count: number }) => (
                        <StatCard
                            key={dept.department}
                            title={dept.department || 'No Department'}
                            value={dept.count}
                            icon={Users}
                            description="Staff members"
                            variant="default"
                        />
                    ))}
                </div>
            )}

            {/* Recent Activities */}
            <RecentActivities activities={recentActivities} />
        </div>
    );
}

