'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogTitle,
    AlertDialogHeader,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { Clock, LogIn, FileText, Timer, LogOut } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import {
    useCheckInMutation,
    useCheckOutMutation,
    useGetTodayAttendanceQuery,
} from '@/redux/features/attendance/attendanceApi';
import {
    useGetMyOvertimeQuery,
    useStartOvertimeMutation,
    useStopOvertimeMutation,
    useGetScheduledOvertimeTodayQuery,
} from '@/redux/features/overtime/overtimeApi';
import { useGetMyShiftQuery } from '@/redux/features/shift/shiftApi';
import { toast } from 'sonner';
import { format } from 'date-fns';

const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
};

const EARLY_CHECKIN_WINDOW_MINUTES = 15;

export default function StaffTracking() {
    const { data: todaysData, isLoading: isLoadingToday } =
        useGetTodayAttendanceQuery({});
    const { data: myOvertimeData, isLoading: isLoadingOT } =
        useGetMyOvertimeQuery({});
    const { data: scheduledOT } = useGetScheduledOvertimeTodayQuery({});
    const { data: myShiftData } = useGetMyShiftQuery({});

    const attendanceDay = todaysData?.attendance?.attendanceDay;

    const [checkIn, { isLoading: isCheckingIn }] = useCheckInMutation();
    const [checkOut, { isLoading: isCheckingOut }] = useCheckOutMutation();
    const [startOvertime, { isLoading: isStartingOT }] =
        useStartOvertimeMutation();
    const [stopOvertime, { isLoading: isStoppingOT }] =
        useStopOvertimeMutation();

    const [countdown, setCountdown] = useState<string>('');

    // Find active OT (checked in but not ended)
    const activeOT = myOvertimeData?.find(
        (ot: any) => ot.actualStartTime && !ot.endTime,
    );

    // Get shift start time for today
    const getShiftStartTime = useCallback(() => {
        if (!myShiftData?.shift?.shift?.startTime) return null;

        const now = new Date();
        const [h, m] = myShiftData.shift.shift.startTime.split(':');
        const shiftStart = new Date(now);
        shiftStart.setHours(Number(h), Number(m), 0, 0);
        return shiftStart;
    }, [myShiftData]);

    // Perform actual check-in
    const performCheckIn = useCallback(async () => {
        try {
            const res = await checkIn({
                source: 'web',
            }).unwrap();

            if (!res.success) {
                toast.error(res.message || 'Failed to check in.');
                return false;
            }

            const officialTime = res.attendanceDay?.checkInAt
                ? new Date(res.attendanceDay.checkInAt)
                : new Date();

            toast.success('🎉 Checked in successfully!', {
                description: `Time: ${format(officialTime, 'hh:mm aa')}`,
            });
            return true;
        } catch (error: any) {
            const apiMessage =
                error?.data?.message ||
                error?.error ||
                'Failed to check in. Please try again.';

            if (
                apiMessage.includes('Shift has not started') ||
                apiMessage.includes('not a working day') ||
                apiMessage.includes('Shift time is over')
            ) {
                toast.warning(apiMessage);
            } else {
                toast.error(apiMessage);
            }
            return false;
        }
    }, [checkIn]);

    // Handle check-in button click
    const handleCheckIn = async () => {
        const shiftStart = getShiftStartTime();

        if (!shiftStart) {
            // No shift info, try direct check-in
            await performCheckIn();
            return;
        }

        const now = new Date();
        const diffMs = shiftStart.getTime() - now.getTime();
        const diffMinutes = diffMs / 1000 / 60;

        // If shift has already started, do direct check-in
        if (diffMinutes <= 0) {
            await performCheckIn();
            return;
        }

        // If more than 15 minutes before shift, show error
        if (diffMinutes > EARLY_CHECKIN_WINDOW_MINUTES) {
            toast.warning('Too early to check in', {
                description: `Shift starts at ${format(shiftStart, 'hh:mm aa')}`,
            });
            return;
        }

        // Within 15 minutes window - Direct Check In (Backend handles snapping)
        await performCheckIn();
    };

    // Update countdown every second if there's a scheduled OT
    useEffect(() => {
        if (!scheduledOT) return;

        const updateCountdown = () => {
            const now = new Date();
            const scheduledTime = new Date(scheduledOT.startTime);
            const diff = scheduledTime.getTime() - now.getTime();

            if (diff <= 0) {
                setCountdown('Ready to start');
            } else {
                const minutes = Math.floor(diff / 1000 / 60);
                const seconds = Math.floor((diff / 1000) % 60);
                setCountdown(`Starts in ${minutes}m ${seconds}s`);
            }
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);

        return () => clearInterval(interval);
    }, [scheduledOT]);

    // Calculate current OT minutes
    const getCurrentOTMinutes = () => {
        if (activeOT && activeOT.actualStartTime) {
            // OT is running - calculate live duration
            const now = new Date();
            const startTime = new Date(activeOT.actualStartTime);
            const durationMs = now.getTime() - startTime.getTime();
            return Math.floor(durationMs / 1000 / 60);
        }

        // Check for completed OT today
        const today = new Date();
        const completedOTToday = myOvertimeData?.find((ot: any) => {
            const otDate = new Date(ot.date);
            return (
                otDate.getDate() === today.getDate() &&
                otDate.getMonth() === today.getMonth() &&
                otDate.getFullYear() === today.getFullYear() &&
                ot.endTime // Completed
            );
        });

        return completedOTToday?.durationMinutes || 0;
    };

    const [currentOTMinutes, setCurrentOTMinutes] = useState(0);

    // Update OT minutes every second if OT is active
    useEffect(() => {
        const updateOTMinutes = () => {
            setCurrentOTMinutes(getCurrentOTMinutes());
        };

        updateOTMinutes();
        const interval = setInterval(updateOTMinutes, 1000);

        return () => clearInterval(interval);
    }, [activeOT, myOvertimeData]);

    // Live Duration Ticker
    const [currentDuration, setCurrentDuration] = useState(0);

    const calculateDuration = useCallback(() => {
        if (!attendanceDay?.checkInAt) return 0;

        if (attendanceDay.checkOutAt) {
            return attendanceDay.totalMinutes || 0;
        }

        const start = new Date(attendanceDay.checkInAt);
        const now = new Date();
        const diffMs = now.getTime() - start.getTime();
        return Math.floor(diffMs / 1000 / 60);
    }, [attendanceDay]);

    useEffect(() => {
        setCurrentDuration(calculateDuration());

        // Only set interval if checked in but not checked out
        if (attendanceDay?.checkInAt && !attendanceDay?.checkOutAt) {
            const interval = setInterval(() => {
                setCurrentDuration(calculateDuration());
            }, 60000); // Update every minute
            return () => clearInterval(interval);
        }
    }, [attendanceDay, calculateDuration]);

    const handleCheckOut = async () => {
        try {
            const res = await checkOut({
                source: 'web',
            }).unwrap();

            if (!res.success) {
                toast.error(res.message || 'Failed to check out.');
                return;
            }

            if ((res.attendanceDay?.earlyExitMinutes ?? 0) > 0) {
                toast.warning('Checked out early!', {
                    description: `You left ${res.attendanceDay.earlyExitMinutes} minutes early.`,
                });
            } else {
                toast.success('Checked out successfully!');
            }
        } catch (error: any) {
            console.log(error);
            const apiMessage =
                error?.data?.message ||
                error?.error ||
                'Failed to check out. Please try again.';

            toast.error(apiMessage);
        }
    };

    const handleStartOT = async () => {
        try {
            await startOvertime({}).unwrap();
            toast.success('Overtime started!');
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to start overtime');
        }
    };

    const handleStopOT = async () => {
        try {
            const result = await stopOvertime({}).unwrap();

            // Check if stopped early
            if (result.data?.earlyStopMinutes > 0) {
                toast.warning('OT stopped early!', {
                    description: `You stopped ${result.data.earlyStopMinutes} minutes before the scheduled duration.`,
                });
            } else {
                toast.success('Overtime stopped!');
            }
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to stop overtime');
        }
    };

    const router = useRouter();

    const handleApplyLeave = () => {
        router.push('/leave/apply');
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-3">
                            <CardTitle className="text-xl font-bold">
                                Time Tracking (Today)
                            </CardTitle>
                            {attendanceDay?.status && (
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        'capitalize font-medium px-2.5 py-0.5',
                                        attendanceDay.status === 'present' &&
                                            'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
                                        attendanceDay.status === 'late' &&
                                            'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
                                        attendanceDay.status === 'half_day' &&
                                            'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
                                        attendanceDay.status === 'absent' &&
                                            'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
                                        attendanceDay.status === 'early_exit' &&
                                            'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
                                    )}
                                >
                                    {attendanceDay.status.replace(/_/g, ' ')}
                                </Badge>
                            )}
                        </div>
                        <CardDescription className="text-sm">
                            Date: {format(new Date(), 'PPP')}
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <Card>
                            <CardContent className="p-4 flex flex-col gap-1">
                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                    <span>Start Time</span>
                                    <LogIn className="h-4 w-4 text-primary" />
                                </div>
                                <div className="text-2xl font-bold">
                                    {attendanceDay?.checkInAt
                                        ? format(
                                              attendanceDay.checkInAt,
                                              'hh:mm aa',
                                          )
                                        : '--:--'}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-4 flex flex-col gap-1">
                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                    <span>End Time</span>
                                    <Clock className="h-4 w-4 text-primary" />
                                </div>
                                <div className="text-2xl font-bold">
                                    {attendanceDay?.checkOutAt
                                        ? format(
                                              attendanceDay.checkOutAt,
                                              'hh:mm aa',
                                          )
                                        : '--:--'}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-4 flex flex-col gap-1">
                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                    <span>Duration</span>
                                    <Timer className="h-4 w-4 text-green-500" />
                                </div>
                                <div className="text-2xl font-bold">
                                    {formatDuration(currentDuration)}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-4 flex flex-col gap-1">
                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                    <span>Overtime</span>
                                    <Timer className="h-4 w-4 text-orange-500" />
                                </div>
                                <div className="text-2xl font-bold">
                                    {formatDuration(currentOTMinutes)}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        {!attendanceDay?.checkInAt ? (
                            <Button
                                size="lg"
                                className="flex-1 shadow-md"
                                onClick={handleCheckIn}
                                disabled={isCheckingIn}
                            >
                                {isCheckingIn ? (
                                    <Spinner />
                                ) : (
                                    <>
                                        <LogIn className="h-5 w-5" />
                                        Check In
                                    </>
                                )}
                            </Button>
                        ) : attendanceDay?.checkOutAt ? (
                            <Button
                                size="lg"
                                variant="default"
                                className="flex-1 shadow-md"
                                disabled
                            >
                                <LogOut className="h-5 w-5" />
                                Checked Out
                            </Button>
                        ) : (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        size="lg"
                                        variant="destructive"
                                        className="flex-1 shadow-md"
                                        disabled={isCheckingOut}
                                    >
                                        {isCheckingOut ? (
                                            <Spinner />
                                        ) : (
                                            <>
                                                <LogOut className="h-5 w-5" />
                                                Check Out
                                            </>
                                        )}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>
                                            Are you sure?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will end your shift for today.
                                            You won't be able to check in again
                                            until your next shift.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>
                                            Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleCheckOut}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                            Confirm Check Out
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}

                        {activeOT ? (
                            <Button
                                size="lg"
                                variant="destructive"
                                className="flex-1 shadow-md"
                                onClick={handleStopOT}
                                disabled={isStoppingOT}
                            >
                                {isStoppingOT ? (
                                    <Spinner />
                                ) : (
                                    <>
                                        <Clock className="h-5 w-5" />
                                        Stop OT
                                    </>
                                )}
                            </Button>
                        ) : scheduledOT ? (
                            <Button
                                size="lg"
                                variant="secondary"
                                className="flex-1 shadow-md"
                                onClick={handleStartOT}
                                disabled={
                                    isStartingOT ||
                                    countdown !== 'Ready to start'
                                }
                            >
                                {isStartingOT ? (
                                    <Spinner />
                                ) : (
                                    <>
                                        <Clock className="h-5 w-5" />
                                        {countdown || 'Start OT'}
                                    </>
                                )}
                            </Button>
                        ) : (
                            <Button
                                size="lg"
                                variant="secondary"
                                className="flex-1 shadow-md opacity-50 cursor-not-allowed"
                                disabled={true}
                            >
                                <Clock className="h-5 w-5" />
                                No OT Scheduled
                            </Button>
                        )}

                        <Button
                            size="lg"
                            variant="outline"
                            className="flex-1 shadow-md"
                            onClick={handleApplyLeave}
                        >
                            <FileText className="h-5 w-5" />
                            Apply for Leave
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </>
    );
}
