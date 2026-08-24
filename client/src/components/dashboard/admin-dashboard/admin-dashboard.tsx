'use client';

import * as React from 'react';
import { useGetAdminDashboardQuery } from '@/redux/features/dashboard/dashboardApi';
import { StatCard } from './stat-card';
import { FinancialTrendChart } from './financial-trend-chart';
import { OrderPipelineCard } from './order-pipeline-card';
import { AttendanceOverviewChart } from './attendance-overview-chart';
import { OvertimeSummaryTable } from './overtime-summary-table';
import { RecentActivities } from './recent-activities';
import { AdminDashboardSkeleton } from './admin-dashboard-skeleton';
import StaffTracking from '../staff-dashboard/staff-tracking';
import { useSession } from '@/lib/auth-client';
import { Role } from '@/constants/role';
import {
    Users,
    UserCheck,
    Clock,
    TrendingUp,
    DollarSign,
    Receipt,
    Wallet,
    Package,
    Plus,
    CalendarDays,
    AlertCircle,
    Flame,
    FileText,
    ArrowRight,
    RefreshCw,
    Building2,
    Timer,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
    const { data: session } = useSession();
    const isHRManager = session?.user?.role === Role.HR_MANAGER;
    const isSuperAdmin = session?.user?.role === Role.SUPER_ADMIN;
    const isAdmin = session?.user?.role === Role.ADMIN;

    const { data, isLoading, error, refetch, isFetching } = useGetAdminDashboardQuery(undefined, {
        pollingInterval: 30000, // Refetch every 30 seconds
    });

    const [currentTime, setCurrentTime] = React.useState<string>('');

    React.useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setCurrentTime(
                now.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                })
            );
        };
        updateTime();
        const timer = setInterval(updateTime, 60000);
        return () => clearInterval(timer);
    }, []);

    if (isLoading) {
        return <AdminDashboardSkeleton />;
    }

    if (error) {
        return (
            <div className="space-y-4">
                <Alert variant="destructive">
                    <AlertCircle className="size-4" />
                    <AlertDescription className="flex items-center justify-between">
                        <span>Failed to load dashboard data. Please check your connection.</span>
                        <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 text-xs">
                            Retry
                        </Button>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    if (!data) {
        return null;
    }

    const {
        staffStats,
        attendanceOverview,
        overtimeSummary,
        recentActivities,
        financialStats,
        orderStats,
        leaveStats,
        monthlyTrends,
    } = data;

    const totalActiveOrders = (orderStats?.inProgress || 0) + (orderStats?.pending || 0);
    const hasPendingAlerts =
        (leaveStats?.pending || 0) > 0 ||
        (overtimeSummary?.pending || 0) > 0 ||
        (orderStats?.urgentCount || 0) > 0;

    const userName = session?.user?.name || 'Administrator';
    const roleLabel = isSuperAdmin
        ? 'Super Admin'
        : isAdmin
        ? 'Admin'
        : 'HR Manager';

    return (
        <div className="space-y-6 pb-8">
            {/* Header Greeting & Quick Actions Bar */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 rounded-xl bg-gradient-to-r from-card via-card to-primary/[0.03] border border-border/70 shadow-xs">
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                            Welcome back, {userName}
                        </h1>
                        <Badge
                            variant="secondary"
                            className="bg-primary/10 text-primary border-primary/20 font-medium text-xs px-2 py-0.5"
                        >
                            {roleLabel}
                        </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                        <CalendarDays className="size-3.5" />
                        <span>{currentTime || 'Today'}</span>
                        <span className="text-muted-foreground/50">•</span>
                        <span>{isHRManager ? 'HR & Workforce Management Portal' : 'Executive Control Center'}</span>
                    </p>
                </div>

                {/* Quick Action Navigation Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="h-8 text-xs gap-1.5 border-border/80 hover:bg-muted"
                    >
                        <RefreshCw className={`size-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Refresh</span>
                    </Button>

                    <Link href="/leave/manage">
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                            <FileText className="size-3.5" />
                            <span>Leaves</span>
                            {leaveStats?.pending > 0 && (
                                <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                            )}
                        </Button>
                    </Link>

                    <Link href="/attendance">
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                            <UserCheck className="size-3.5" />
                            <span>Attendance</span>
                        </Button>
                    </Link>

                    <Link href="/staffs">
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                            <Users className="size-3.5" />
                            <span>Staffs</span>
                        </Button>
                    </Link>

                    <Link href="/overtime">
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                            <Timer className="size-3.5" />
                            <span>Overtime</span>
                            {overtimeSummary?.pending > 0 && (
                                <span className="size-2 rounded-full bg-blue-500 animate-pulse" />
                            )}
                        </Button>
                    </Link>

                    {!isHRManager && (
                        <>
                            <Link href="/orders">
                                <Button size="sm" className="h-8 text-xs gap-1.5 shadow-xs">
                                    <Plus className="size-3.5" />
                                    <span>New Order</span>
                                </Button>
                            </Link>

                            <Link href="/expense">
                                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                                    <Receipt className="size-3.5" />
                                    <span>Expense</span>
                                </Button>
                            </Link>

                            <Link href="/payroll">
                                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                                    <DollarSign className="size-3.5" />
                                    <span>Payroll</span>
                                </Button>
                            </Link>
                        </>
                    )}
                </div>
            </div>

            {/* Action Required Banner */}
            {hasPendingAlerts && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg bg-amber-500/[0.08] border border-amber-500/25 text-xs text-foreground">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span className="font-semibold text-amber-900 dark:text-amber-200">
                                Pending Action Items Requiring Attention:
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {leaveStats?.pending > 0 && (
                                <Link href="/leave/manage">
                                    <Badge
                                        variant="secondary"
                                        className="cursor-pointer gap-1 px-2.5 py-1 text-xs bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/30 transition-colors"
                                    >
                                        <FileText className="size-3" />
                                        {leaveStats.pending} Leave Requests Pending
                                    </Badge>
                                </Link>
                            )}

                            {overtimeSummary?.pending > 0 && (
                                <Link href="/overtime">
                                    <Badge
                                        variant="secondary"
                                        className="cursor-pointer gap-1 px-2.5 py-1 text-xs bg-blue-500/20 text-blue-800 dark:text-blue-300 border-blue-500/30 hover:bg-blue-500/30 transition-colors"
                                    >
                                        <Clock className="size-3" />
                                        {overtimeSummary.pending} Overtime Requests Pending
                                    </Badge>
                                </Link>
                            )}

                            {orderStats?.urgentCount > 0 && (
                                <Link href="/orders">
                                    <Badge
                                        variant="destructive"
                                        className="cursor-pointer gap-1 px-2.5 py-1 text-xs hover:opacity-90 transition-opacity"
                                    >
                                        <Flame className="size-3" />
                                        {orderStats.urgentCount} Urgent Orders
                                    </Badge>
                                </Link>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Personal Shift & Overtime Time Tracking for HR Manager */}
            {isHRManager && <StaffTracking />}

            {/* Top 4 Primary Core KPI Cards */}
            {isHRManager ? (
                /* HR-Focused Core KPI Cards */
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Today's Attendance Rate"
                        value={attendanceOverview?.presentPercentage || 0}
                        suffix="%"
                        decimals={1}
                        icon={UserCheck}
                        description={`${attendanceOverview?.present || 0} present of ${staffStats?.active || staffStats?.total || 0} active staff`}
                        variant="cyan"
                        href="/attendance"
                    />

                    <StatCard
                        title="Total Staff Workforce"
                        value={staffStats?.total || 0}
                        suffix=" staff"
                        icon={Users}
                        description={`${staffStats?.active || 0} active, ${staffStats?.inactive || 0} inactive`}
                        variant="primary"
                        href="/staffs"
                    />

                    <StatCard
                        title="Pending Leave Requests"
                        value={leaveStats?.pending || 0}
                        suffix=" requests"
                        icon={FileText}
                        description={`${leaveStats?.approvedThisMonth || 0} approved this month`}
                        variant={leaveStats?.pending > 0 ? 'warning' : 'default'}
                        href="/leave/manage"
                    />

                    <StatCard
                        title="Active Production Pipeline"
                        value={totalActiveOrders}
                        suffix=" orders"
                        icon={Package}
                        description={`${orderStats?.totalImagesThisMonth || 0} images processed this month`}
                        variant="indigo"
                        badge={orderStats?.urgentCount ? `${orderStats.urgentCount} urgent` : undefined}
                        href="/orders"
                    />
                </div>
            ) : (
                /* Admin & Super Admin Full Executive KPI Cards */
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="This Month's Earnings"
                        value={financialStats?.thisMonthEarnings || 0}
                        prefix="৳"
                        icon={DollarSign}
                        description={`All-time: ৳${(financialStats?.totalEarnings || 0).toLocaleString('en-BD')}`}
                        variant="success"
                        href="/earnings"
                    />

                    <StatCard
                        title="Net Operating Profit"
                        value={financialStats?.thisMonthProfit || 0}
                        prefix="৳"
                        icon={TrendingUp}
                        description={`Rev: ৳${(financialStats?.thisMonthEarnings || 0).toLocaleString('en-BD')} • Exp: ৳${(financialStats?.thisMonthExpenses || 0).toLocaleString('en-BD')}`}
                        variant="primary"
                        href="/analytics"
                    />

                    <StatCard
                        title="Active Order Pipeline"
                        value={totalActiveOrders}
                        suffix=" orders"
                        icon={Package}
                        description={`${orderStats?.totalImagesThisMonth || 0} images processed this month`}
                        variant="indigo"
                        badge={orderStats?.urgentCount ? `${orderStats.urgentCount} urgent` : undefined}
                        href="/orders"
                    />

                    <StatCard
                        title="Today's Attendance Rate"
                        value={attendanceOverview?.presentPercentage || 0}
                        suffix="%"
                        decimals={1}
                        icon={UserCheck}
                        description={`${attendanceOverview?.present || 0} present of ${staffStats?.active || staffStats?.total || 0} active staff`}
                        variant="cyan"
                        href="/attendance"
                    />
                </div>
            )}

            {/* Secondary 4 Mini Quick-Stat Pills */}
            {isHRManager ? (
                /* HR-Focused Secondary Metrics */
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Staff on Leave Today"
                        value={attendanceOverview?.onLeave || 0}
                        suffix=" on leave"
                        icon={CalendarDays}
                        description={`${leaveStats?.pending || 0} applications awaiting review`}
                        variant="purple"
                        href="/leave/manage"
                    />

                    <StatCard
                        title="Approved Overtime Hours"
                        value={overtimeSummary?.totalHours || 0}
                        suffix=" hrs"
                        decimals={1}
                        icon={Timer}
                        description={`${overtimeSummary?.approved || 0} overtime sessions approved`}
                        variant="indigo"
                        href="/overtime"
                    />

                    <StatCard
                        title="Pending Overtime"
                        value={overtimeSummary?.pending || 0}
                        suffix=" requests"
                        icon={Clock}
                        description={`${overtimeSummary?.rejected || 0} rejected requests`}
                        variant={overtimeSummary?.pending > 0 ? 'warning' : 'default'}
                        href="/overtime"
                    />

                    <StatCard
                        title="Active Departments"
                        value={staffStats?.byDepartment?.length || 0}
                        suffix=" depts"
                        icon={Building2}
                        description={`${staffStats?.active || 0} active employees assigned`}
                        variant="default"
                        href="/organization"
                    />
                </div>
            ) : (
                /* Admin & Super Admin Secondary Metrics */
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="This Month Expenses"
                        value={financialStats?.thisMonthExpenses || 0}
                        prefix="৳"
                        icon={Receipt}
                        description={`All-time: ৳${(financialStats?.totalExpenses || 0).toLocaleString('en-BD')}`}
                        variant="warning"
                        href="/expense"
                    />

                    <StatCard
                        title="Client Receivables (Due)"
                        value={financialStats?.unpaidRevenueUSD || 0}
                        prefix="$"
                        icon={Wallet}
                        description={`≈ ৳${(financialStats?.unpaidRevenue || 0).toLocaleString('en-BD')} BDT`}
                        variant="purple"
                        href="/earnings"
                    />

                    <StatCard
                        title="Staff on Leave Today"
                        value={attendanceOverview?.onLeave || 0}
                        suffix=" on leave"
                        icon={FileText}
                        description={`${leaveStats?.pending || 0} applications awaiting approval`}
                        variant="default"
                        href="/leave/manage"
                    />

                    <StatCard
                        title="Total Staff Workforce"
                        value={staffStats?.total || 0}
                        suffix=" staff"
                        icon={Users}
                        description={`${staffStats?.active || 0} active, ${staffStats?.inactive || 0} inactive`}
                        variant="default"
                        href="/staffs"
                    />
                </div>
            )}

            {/* Main Operational & Trends Visualizations Grid */}
            <div className="grid gap-4 lg:grid-cols-12">
                <div className="lg:col-span-7">
                    <FinancialTrendChart
                        data={monthlyTrends || []}
                        hideFinancials={isHRManager}
                    />
                </div>
                <div className="lg:col-span-5">
                    <OrderPipelineCard data={orderStats} />
                </div>
            </div>

            {/* Secondary Attendance & Overtime Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
                <div className="lg:col-span-6">
                    <AttendanceOverviewChart data={attendanceOverview} />
                </div>
                <div className="lg:col-span-6">
                    <OvertimeSummaryTable data={overtimeSummary} />
                </div>
            </div>

            {/* Department Workforce & Live Activities Bottom Grid */}
            <div className="grid gap-4 lg:grid-cols-12">
                {/* Department Capacity & Distribution */}
                <div className="lg:col-span-5">
                    <Card className="h-full border-border/60 shadow-xs flex flex-col justify-between">
                        <CardHeader className="pb-3 border-b">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                                        <Building2 className="size-4" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base font-semibold">
                                            Department Workforce
                                        </CardTitle>
                                        <CardDescription className="text-xs mt-0.5">
                                            Team size & active personnel distribution
                                        </CardDescription>
                                    </div>
                                </div>
                                <Link href="/organization">
                                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                                        Manage <ArrowRight className="size-3" />
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>

                        <CardContent className="pt-4 flex-1 space-y-3.5">
                            {staffStats?.byDepartment && staffStats.byDepartment.length > 0 ? (
                                staffStats.byDepartment.map((dept: { department: string; count: number }) => {
                                    const percent = Math.round(
                                        (dept.count / Math.max(1, staffStats.total)) * 100
                                    );
                                    return (
                                        <div key={dept.department} className="space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-medium text-foreground">
                                                    {dept.department || 'General / Unassigned'}
                                                </span>
                                                <span className="text-muted-foreground font-mono">
                                                    {dept.count} staff ({percent}%)
                                                </span>
                                            </div>
                                            <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${percent}%` }}
                                                    transition={{ duration: 0.6 }}
                                                    className="h-full bg-primary rounded-full"
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-xs text-muted-foreground text-center py-8">
                                    No department records available
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Live Activity & Audit Feed */}
                <div className="lg:col-span-7">
                    <RecentActivities activities={recentActivities || []} />
                </div>
            </div>
        </div>
    );
}
