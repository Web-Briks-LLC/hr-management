'use client';

import * as React from 'react';
import { useSession } from '@/lib/auth-client';
import { useGetMeQuery } from '@/redux/features/staff/staffApi';
import { useGetMonthlyStatsQuery } from '@/redux/features/attendance/attendanceApi';
import {
    useGetStaffPerformanceAnalyticsQuery,
    useGetActiveOrdersProgressQuery,
} from '@/redux/features/production/productionApi';
import { StatCard } from '../admin-dashboard/stat-card';
import StaffTracking from '../staff-dashboard/staff-tracking';
import { ProductionQuickWidget } from '../staff-dashboard/production-quick-widget';
import { ProfileCompletionDialog } from '@/components/account/profile-completion-dialog';
import ShiftOffNotice from '@/components/shifting/shift-off-notice';
import { SalaryPinDialog } from '@/components/staff/salary-pin-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Sparkles,
    Layers,
    Package,
    UserCheck,
    CalendarDays,
    ArrowRight,
    RefreshCw,
    Clock,
    Lock,
    Unlock,
    Flame,
    CheckCircle2,
    Calendar,
    Send,
    Play,
} from 'lucide-react';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
};

export default function TeamLeaderDashboard() {
    const { data: session } = useSession();
    const { data: meData, isLoading: isStaffLoading } = useGetMeQuery(undefined);
    const { data: monthlyStats, isLoading: isMonthlyLoading, refetch: refetchAttendance } =
        useGetMonthlyStatsQuery(undefined);
    const { data: analyticsData, refetch: refetchAnalytics } =
        useGetStaffPerformanceAnalyticsQuery({ filterType: 'today' });
    const { data: activeOrdersData, isLoading: isOrdersLoading, refetch: refetchOrders } =
        useGetActiveOrdersProgressQuery();

    const staff = meData?.staff;
    const todaySummary = analyticsData?.data?.summary;
    const activeOrders = activeOrdersData?.data || [];

    const [isSalaryUnlocked, setIsSalaryUnlocked] = React.useState(false);
    const [showPinDialog, setShowPinDialog] = React.useState(false);
    const autoLockTimerRef = React.useRef<NodeJS.Timeout | null>(null);

    // Auto-lock salary after 60 seconds
    React.useEffect(() => {
        if (isSalaryUnlocked) {
            autoLockTimerRef.current = setTimeout(() => {
                setIsSalaryUnlocked(false);
                toast.info('Salary view auto-locked');
            }, 60000);

            return () => {
                if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current);
            };
        }
    }, [isSalaryUnlocked]);

    const handleUnlockSuccess = () => {
        setIsSalaryUnlocked(true);
        setShowPinDialog(false);
    };

    const handleLock = () => {
        setIsSalaryUnlocked(false);
        if (autoLockTimerRef.current) {
            clearTimeout(autoLockTimerRef.current);
            autoLockTimerRef.current = null;
        }
    };

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

    const handleRefreshAll = () => {
        refetchAttendance();
        refetchAnalytics();
        refetchOrders();
        toast.success('Dashboard refreshed');
    };

    const userName = session?.user?.name || staff?.user?.name || 'Team Leader';
    const activeOrderCount = activeOrders.length;
    const todayImageCount = todaySummary?.totalImages || 0;
    const activeSessionsCount = todaySummary?.totalSessions || 0;

    return (
        <div className="space-y-6 pb-8">
            <ProfileCompletionDialog />
            <ShiftOffNotice />

            {/* Header Greeting & Quick Actions Bar */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 rounded-xl bg-gradient-to-r from-card via-card to-indigo-500/[0.04] border border-border/70 shadow-xs">
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                            Welcome back, {userName}
                        </h1>
                        <Badge
                            variant="secondary"
                            className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 font-medium text-xs px-2 py-0.5"
                        >
                            Team Leader
                        </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                        <CalendarDays className="size-3.5" />
                        <span>{currentTime || 'Today'}</span>
                        <span className="text-muted-foreground/50">•</span>
                        <span>Production & Team Operations Portal</span>
                    </p>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshAll}
                        className="h-8 text-xs gap-1.5 border-border/80 hover:bg-muted"
                    >
                        <RefreshCw className="size-3.5" />
                        <span className="hidden sm:inline">Refresh</span>
                    </Button>

                    <Link href="/production">
                        <Button size="sm" className="h-8 text-xs gap-1.5 shadow-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                            <Play className="size-3.5 fill-current" />
                            <span>Workstation</span>
                        </Button>
                    </Link>

                    <Link href="/shifting">
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                            <Calendar className="size-3.5" />
                            <span>Shifting</span>
                        </Button>
                    </Link>

                    <Link href="/overtime">
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                            <Clock className="size-3.5" />
                            <span>Overtime</span>
                        </Button>
                    </Link>

                    <Link href="/leave/apply">
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                            <Send className="size-3.5" />
                            <span>Apply Leave</span>
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Quick Production Workstation Launcher */}
            <ProductionQuickWidget staff={staff} />

            {/* Top 4 Core Team Leader KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Active Production Pipeline"
                    value={activeOrderCount}
                    suffix=" orders"
                    icon={Package}
                    description="Active orders currently in progress"
                    variant="indigo"
                    href="/production"
                />

                <StatCard
                    title="Today's Images Processed"
                    value={todayImageCount}
                    suffix=" images"
                    icon={Layers}
                    description={`${activeSessionsCount} work sessions recorded today`}
                    variant="success"
                    href="/production"
                />

                <StatCard
                    title="This Month's Attendance"
                    value={monthlyStats?.present || 0}
                    suffix=" days"
                    icon={UserCheck}
                    description={`${monthlyStats?.late || 0} late entries logged this month`}
                    variant="cyan"
                    href="/attendance"
                />

                <StatCard
                    title="Total Overtime Logged"
                    value={monthlyStats?.totalOvertimeMinutes ? Math.round(monthlyStats.totalOvertimeMinutes / 60) : 0}
                    suffix=" hrs"
                    icon={Clock}
                    description={formatDuration(monthlyStats?.totalOvertimeMinutes || 0)}
                    variant="warning"
                    href="/overtime"
                />
            </div>

            {/* Personal Shift & Overtime Time Tracking */}
            <StaffTracking />

            {/* Active Production Queue & Monthly Performance Grid */}
            <div className="grid gap-6 lg:grid-cols-12">
                {/* Left (7 cols): Active Orders Production Queue */}
                <div className="lg:col-span-7">
                    <Card className="border-border/60 shadow-xs h-full flex flex-col justify-between">
                        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
                            <div>
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                        <Sparkles className="size-4" />
                                    </div>
                                    <CardTitle className="text-base font-semibold">
                                        Active Orders & Production Progress
                                    </CardTitle>
                                </div>
                                <CardDescription className="text-xs mt-1">
                                    Live batch status, stages & QC checkpoints
                                </CardDescription>
                            </div>

                            <Link href="/production">
                                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                                    View All <ArrowRight className="size-3" />
                                </Button>
                            </Link>
                        </CardHeader>

                        <CardContent className="pt-4 flex-1 space-y-3">
                            {isOrdersLoading ? (
                                <p className="text-xs text-muted-foreground text-center py-8">
                                    Loading active orders...
                                </p>
                            ) : activeOrders.length === 0 ? (
                                <div className="text-center py-10 space-y-2">
                                    <CheckCircle2 className="size-8 text-emerald-500 mx-auto opacity-70" />
                                    <p className="text-sm font-medium text-foreground">
                                        All Orders Completed
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        No active orders waiting in the production queue.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                                    {activeOrders.map((order) => {
                                        const progress =
                                            order.productionProgress?.overallPercentage || 0;
                                        const isUrgent = order.priority === 'urgent';

                                        return (
                                            <div
                                                key={order._id}
                                                className="p-3 rounded-lg bg-muted/40 border border-border/50 hover:border-border/80 transition-all space-y-2"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-xs font-semibold text-foreground truncate">
                                                                {order.orderName}
                                                            </h4>
                                                            {isUrgent && (
                                                                <Badge
                                                                    variant="destructive"
                                                                    className="text-[9px] px-1 py-0 h-4"
                                                                >
                                                                    <Flame className="size-2.5 mr-0.5" />
                                                                    Urgent
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-muted-foreground mt-0.5">
                                                            {order.clientId?.name || 'Client'} •{' '}
                                                            {order.imageQuantity} images
                                                        </p>
                                                    </div>

                                                    <div className="text-right shrink-0">
                                                        {order.deadline && (
                                                            <span className="text-[10px] font-mono text-muted-foreground block">
                                                                {formatDistanceToNow(
                                                                    new Date(order.deadline),
                                                                    { addSuffix: true }
                                                                )}
                                                            </span>
                                                        )}
                                                        <span className="text-xs font-bold font-mono text-primary">
                                                            {progress}%
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${progress}%` }}
                                                        transition={{ duration: 0.5 }}
                                                        className="h-full bg-indigo-500 rounded-full"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right (5 cols): Monthly Performance & Salary Card */}
                <div className="lg:col-span-5 space-y-4">
                    {/* Monthly Attendance Overview */}
                    <Card className="border-border/60 shadow-xs">
                        <CardHeader className="pb-3 border-b">
                            <CardTitle className="text-base font-semibold">
                                Monthly Summary
                            </CardTitle>
                            <CardDescription className="text-xs">
                                {isMonthlyLoading
                                    ? 'Loading stats...'
                                    : monthlyStats?.month || format(new Date(), 'MMMM yyyy')}
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="pt-4">
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="p-2.5 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/10">
                                    <span className="text-[10px] text-muted-foreground block font-medium uppercase">
                                        Present
                                    </span>
                                    <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                        {monthlyStats?.present || 0}
                                    </span>
                                </div>

                                <div className="p-2.5 rounded-lg bg-amber-500/[0.06] border border-amber-500/10">
                                    <span className="text-[10px] text-muted-foreground block font-medium uppercase">
                                        Late In
                                    </span>
                                    <span className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono">
                                        {monthlyStats?.late || 0}
                                    </span>
                                </div>

                                <div className="p-2.5 rounded-lg bg-blue-500/[0.06] border border-blue-500/10">
                                    <span className="text-[10px] text-muted-foreground block font-medium uppercase">
                                        Overtime
                                    </span>
                                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono mt-1 block">
                                        {formatDuration(monthlyStats?.totalOvertimeMinutes || 0)}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Secure Salary & Compensation Card */}
                    <Card className="border-border/60 shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
                            <div>
                                <CardTitle className="text-base font-semibold">
                                    Salary & Compensation
                                </CardTitle>
                                <CardDescription className="text-xs mt-0.5">
                                    Protected personal compensation overview
                                </CardDescription>
                            </div>

                            {isSalaryUnlocked && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleLock}
                                    className="h-7 text-xs text-muted-foreground gap-1"
                                >
                                    <Lock className="size-3.5" />
                                    <span>Lock</span>
                                </Button>
                            )}
                        </CardHeader>

                        <CardContent className="pt-4 space-y-3">
                            <div className="p-3 rounded-lg bg-muted/40 border border-border/50 flex items-center justify-between">
                                <div>
                                    <span className="text-xs text-muted-foreground block">
                                        Monthly Base Salary
                                    </span>
                                    <div className="text-xl font-bold font-mono text-foreground mt-0.5">
                                        {isSalaryUnlocked ? (
                                            `৳ ${(staff?.salary || 0).toLocaleString('en-BD')}`
                                        ) : (
                                            <span className="text-muted-foreground tracking-widest">
                                                ••••••
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {!isSalaryUnlocked && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-xs gap-1.5"
                                        onClick={() => setShowPinDialog(true)}
                                        disabled={isStaffLoading}
                                    >
                                        <Unlock className="size-3.5" />
                                        {staff?.isSalaryPinSet ? 'Unlock' : 'Set PIN'}
                                    </Button>
                                )}
                            </div>

                            {isSalaryUnlocked && (
                                <div className="space-y-1.5 pt-1 text-xs text-muted-foreground">
                                    <div className="flex justify-between">
                                        <span>PF Contribution (0%):</span>
                                        <span className="font-mono font-medium text-foreground">৳ 0</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between">
                                        <span>Total PF Balance:</span>
                                        <span className="font-mono font-medium text-foreground">৳ 0</span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <SalaryPinDialog
                open={showPinDialog}
                onOpenChange={setShowPinDialog}
                staffId={staff?.staffId || ''}
                isPinSet={!!staff?.isSalaryPinSet}
                onSuccess={handleUnlockSuccess}
            />
        </div>
    );
}
