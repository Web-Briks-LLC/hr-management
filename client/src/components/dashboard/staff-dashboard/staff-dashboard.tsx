'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    UserCheck,
    Clock,
    Timer,
    Layers,
    Lock,
    Unlock,
    Megaphone,
    ArrowRight,
    CalendarDays,
} from 'lucide-react';
import StaffHeader from './staff-header';
import StaffTracking from './staff-tracking';
import { ProductionQuickWidget } from './production-quick-widget';
import StaffAttendanceTable from './staff-attendance-table';
import { StatCard } from '../admin-dashboard/stat-card';
import { SalaryPinDialog } from '@/components/staff/salary-pin-dialog';
import { ProfileCompletionDialog } from '@/components/account/profile-completion-dialog';
import ShiftOffNotice from '@/components/shifting/shift-off-notice';
import { useGetMonthlyStatsQuery } from '@/redux/features/attendance/attendanceApi';
import { useGetMeQuery } from '@/redux/features/staff/staffApi';
import { useGetStaffPerformanceAnalyticsQuery } from '@/redux/features/production/productionApi';
import { useGetPublishedNoticesQuery } from '@/redux/features/notice/noticeApi';
import { useGetMyShiftQuery } from '@/redux/features/shift/shiftApi';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';

const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
};

export default function StaffDashboard() {
    const { data: monthlyStats } = useGetMonthlyStatsQuery(undefined);
    const { data: meData, isLoading: isStaffLoading } = useGetMeQuery(undefined);
    const { data: analyticsData } = useGetStaffPerformanceAnalyticsQuery({ filterType: 'today' });
    const { data: noticesData } = useGetPublishedNoticesQuery({ page: 1, limit: 3 });
    const { data: shiftData } = useGetMyShiftQuery(undefined);

    const staff = meData?.staff;
    const todaySummary = analyticsData?.data?.summary;
    const recentNotices = noticesData?.data || [];
    const assignedShiftName = shiftData?.shift?.shift?.name || 'Standard Shift';

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

    const isProductionStaff =
        !staff?.designation?.toLowerCase()?.includes('telemarketer');

    const totalOtHours = monthlyStats?.totalOvertimeMinutes
        ? Math.round((monthlyStats.totalOvertimeMinutes / 60) * 10) / 10
        : 0;

    return (
        <div className="space-y-6 pb-8">
            <ProfileCompletionDialog />
            <ShiftOffNotice />

            {/* Staff Profile Header with Live Clock & Shift Badge */}
            <StaffHeader />

            {/* Photo Editing Workstation Hub for Production Staff */}
            <ProductionQuickWidget staff={staff} />

            {/* Top 4 Staff Core KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="This Month Attendance"
                    value={monthlyStats?.present || 0}
                    suffix=" days"
                    icon={UserCheck}
                    description={`${monthlyStats?.late || 0} late in entries logged`}
                    variant="success"
                    href="/attendance"
                />

                <StatCard
                    title="Total Overtime Logged"
                    value={totalOtHours}
                    suffix=" hrs"
                    decimals={1}
                    icon={Timer}
                    description={formatDuration(monthlyStats?.totalOvertimeMinutes || 0)}
                    variant="warning"
                    href="/overtime"
                />

                {isProductionStaff ? (
                    <StatCard
                        title="Today's Images Processed"
                        value={todaySummary?.totalImages || 0}
                        suffix=" imgs"
                        icon={Layers}
                        description={`${todaySummary?.totalSessions || 0} live sessions logged today`}
                        variant="indigo"
                        href="/production"
                    />
                ) : (
                    <StatCard
                        title="Late Arrivals"
                        value={monthlyStats?.late || 0}
                        suffix=" days"
                        icon={Clock}
                        description="Late in entries this month"
                        variant="danger"
                        href="/attendance"
                    />
                )}

                <StatCard
                    title="Assigned Work Shift"
                    value={1}
                    suffix=" active"
                    icon={CalendarDays}
                    description={assignedShiftName}
                    variant="primary"
                    href="/shifting"
                />
            </div>

            {/* Personal Shift & Overtime Time Tracker */}
            <StaffTracking />

            {/* Main Operations Grid */}
            <div className="grid gap-6 lg:grid-cols-12">
                {/* Left (7 cols): Attendance & Overtime 7-Day History */}
                <div className="lg:col-span-7">
                    <StaffAttendanceTable />
                </div>

                {/* Right (5 cols): Secure Salary Card & Company Announcements */}
                <div className="lg:col-span-5 space-y-4">
                    {/* Protected Salary & Compensation Card */}
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

                    {/* Company Announcements & Notices Card */}
                    <Card className="border-border/60 shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                    <Megaphone className="size-4" />
                                </div>
                                <div>
                                    <CardTitle className="text-base font-semibold">
                                        Company Notices
                                    </CardTitle>
                                    <CardDescription className="text-xs mt-0.5">
                                        Latest organizational announcements
                                    </CardDescription>
                                </div>
                            </div>

                            <Link href="/notices">
                                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                                    All <ArrowRight className="size-3" />
                                </Button>
                            </Link>
                        </CardHeader>

                        <CardContent className="pt-4">
                            {recentNotices.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-6">
                                    No new notices published
                                </p>
                            ) : (
                                <div className="space-y-2.5">
                                    {recentNotices.map((notice) => (
                                        <Link
                                            key={notice._id}
                                            href="/notices"
                                            className="block p-2.5 rounded-lg bg-muted/30 border border-border/40 hover:border-border hover:bg-muted/60 transition-all text-xs group"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <h4 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                                    {notice.title}
                                                </h4>
                                                {notice.priority && (
                                                    <Badge
                                                        variant={
                                                            notice.priority === 'urgent'
                                                                ? 'destructive'
                                                                : 'secondary'
                                                        }
                                                        className="text-[9px] px-1.5 py-0 h-4 capitalize"
                                                    >
                                                        {notice.priority}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-1">
                                                {notice.content}
                                            </p>
                                            <span className="text-[10px] text-muted-foreground/70 block mt-1">
                                                {notice.createdAt
                                                    ? formatDistanceToNow(new Date(notice.createdAt), {
                                                          addSuffix: true,
                                                      })
                                                    : 'Recently'}
                                            </span>
                                        </Link>
                                    ))}
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
