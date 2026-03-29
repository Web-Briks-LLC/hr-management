'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
    TrendingUp,
    AlertCircle,
    LogOut,
} from 'lucide-react';
import StaffHeader from './staff-header';
import StaffTracking from './staff-tracking';

import { useGetMonthlyStatsQuery } from '@/redux/features/attendance/attendanceApi';
import { useGetMeQuery } from '@/redux/features/staff/staffApi';
import { Skeleton } from '@/components/ui/skeleton';
import StaffAttendanceTable from './staff-attendance-table';
import { SalaryPinDialog } from '@/components/staff/salary-pin-dialog';
import { ProfileCompletionDialog } from '@/components/account/profile-completion-dialog';
import { toast } from 'sonner';
import ShiftOffNotice from '@/components/shifting/shift-off-notice';

const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
};

export default function StaffDashboard() {
    const { data: monthlyStats, isLoading } = useGetMonthlyStatsQuery(undefined);
    const { data: meData, isLoading: isStaffLoading } = useGetMeQuery(undefined);
    const staff = meData?.staff;

    const [isSalaryUnlocked, setIsSalaryUnlocked] = useState(false);
    const [showPinDialog, setShowPinDialog] = useState(false);
    const autoLockTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Auto-lock after 1 minute
    useEffect(() => {
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

    return (
        <div className="min-h-screen bg-background space-y-6">
            <ProfileCompletionDialog />
            <ShiftOffNotice />
            <StaffHeader />

            <StaffTracking />

            {/* This Month & Salary */}
            <div className="grid lg:grid-cols-2 gap-6 items-start">
                {/* This Month Stats */}
                <Card>
                    <CardHeader>
                        <CardTitle>This Month</CardTitle>
                        <CardDescription>
                            {isLoading ? (
                                <Skeleton className="h-4 w-20" />
                            ) : (
                                monthlyStats?.month || 'Loading...'
                            )}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <div className="text-sm text-muted-foreground mb-2">
                                        Present
                                    </div>
                                    <div className="text-3xl font-bold text-green-600">
                                        {isLoading ? (
                                            <Skeleton className="h-8 w-12 mx-auto" />
                                        ) : (
                                            monthlyStats?.present || 0
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <div className="text-sm text-muted-foreground mb-2">
                                        Late In
                                    </div>
                                    <div className="text-3xl font-bold text-orange-600">
                                        {isLoading ? (
                                            <Skeleton className="h-8 w-12 mx-auto" />
                                        ) : (
                                            monthlyStats?.late || 0
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <div className="text-sm text-muted-foreground mb-2">
                                        Total OT
                                    </div>
                                    <div className="text-xl font-bold text-blue-600">
                                        {isLoading ? (
                                            <Skeleton className="h-8 w-16 mx-auto" />
                                        ) : (
                                            formatDuration(
                                                monthlyStats?.totalOvertimeMinutes ||
                                                    0,
                                            )
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                            <TrendingUp className="h-4 w-4" />
                            <span>Updated now</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Salary & PF */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle>Salary & PF</CardTitle>
                        {isSalaryUnlocked && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleLock}
                                className="h-8 w-8 p-0"
                            >
                                <LogOut className="h-4 w-4" />
                                <span className="sr-only">Lock</span>
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <Card>
                                <CardContent className="p-4">
                                    <div className="text-sm text-muted-foreground mb-2">
                                        Monthly Salary
                                    </div>
                                    <div className="text-3xl font-bold mb-2">
                                        {isSalaryUnlocked ? (
                                            `৳ ${staff?.salary?.toLocaleString() || 0}`
                                        ) : (
                                            <span className="text-muted-foreground tracking-widest">
                                                ••••
                                            </span>
                                        )}
                                    </div>
                                    {!isSalaryUnlocked && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full"
                                            onClick={() =>
                                                setShowPinDialog(true)
                                            }
                                            disabled={isStaffLoading}
                                        >
                                            <AlertCircle className="mr-2 h-4 w-4" />
                                            {staff?.isSalaryPinSet
                                                ? 'Unlock'
                                                : 'Set PIN'}
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="text-sm text-muted-foreground mb-2">
                                        PF Status
                                    </div>
                                    <Badge variant="outline" className="mb-4">
                                        N/A
                                    </Badge>
                                    {/* Placeholder for future PF logic */}
                                </CardContent>
                            </Card>
                            {isSalaryUnlocked && (
                                <Card className="col-span-2">
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm text-muted-foreground">
                                                Monthly PF (0%)
                                            </span>
                                            <span className="font-bold">
                                                ৳ 0
                                            </span>
                                        </div>
                                        <Separator className="my-2" />
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">
                                                Total PF Balance
                                            </span>
                                            <span className="font-bold">
                                                ৳ 0
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <SalaryPinDialog
                open={showPinDialog}
                onOpenChange={setShowPinDialog}
                staffId={staff?.staffId || ''}
                isPinSet={!!staff?.isSalaryPinSet}
                onSuccess={handleUnlockSuccess}
            />

            <StaffAttendanceTable />

            {/* Notifications */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Notifications</CardTitle>
                        <Button variant="ghost" size="sm">
                            Recent
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Your account has been de-activated. You can no
                            longer access the portal.
                            <span className="text-xs text-muted-foreground ml-2">
                                3 months ago
                            </span>
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        </div>
    );
}
