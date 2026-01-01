"use client"

import { useState, useEffect } from 'react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { toast } from 'sonner';
import { format } from 'date-fns';

const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
};

export default function StaffTracking() {
    const { data: todaysData, isLoading: isLoadingToday } =
        useGetTodayAttendanceQuery({});
    const { data: myOvertimeData, isLoading: isLoadingOT } = useGetMyOvertimeQuery({});
    const { data: scheduledOT } = useGetScheduledOvertimeTodayQuery({});

    const [checkIn, { isLoading: isCheckingIn }] = useCheckInMutation();
    const [checkOut, { isLoading: isCheckingOut }] = useCheckOutMutation();
    const [startOvertime, { isLoading: isStartingOT }] = useStartOvertimeMutation();
    const [stopOvertime, { isLoading: isStoppingOT }] = useStopOvertimeMutation();

    const [countdown, setCountdown] = useState<string>('');

    // Find active OT (checked in but not ended)
    const activeOT = myOvertimeData?.find((ot: any) => ot.actualStartTime && !ot.endTime);

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

    const handleCheckIn = async () => {
        try {
            const res = await checkIn({
                source: 'web',
            }).unwrap();

            if (!res.success) {
                toast.error(res.message || 'Failed to check in.');
                return;
            }

            toast.message('Checked in successfully!', {
                description: format(new Date(), 'hh:mm aa'),
            });
        } catch (error: any) {
            const apiMessage =
                error?.data?.message ||
                error?.error ||
                'Failed to check in. Please try again.';

            // Show warning for shift timing issues, error for other issues
            if (apiMessage.includes('Shift has not started') ||
                apiMessage.includes('not a working day') ||
                apiMessage.includes('Shift time is over')) {
                toast.warning(apiMessage);
            } else {
                toast.error(apiMessage);
            }
        }
    };

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

    const handleApplyLeave = () => {
        toast.warning('Leave application page coming soon!');
    };

    const attendanceDay = todaysData?.attendance?.attendanceDay;
    console.log(attendanceDay);

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <CardTitle className="text-xl font-bold">
                        Time Tracking (Today)
                    </CardTitle>
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
                                <span>Check-in</span>
                                <LogIn className="h-4 w-4 text-primary" />
                            </div>
                            <div className="text-2xl font-bold">
                                {attendanceDay?.checkInAt
                                    ? format(attendanceDay.checkInAt, 'hh:mm aa')
                                    : '...'}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4 flex flex-col gap-1">
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>Check-out</span>
                                <Clock className="h-4 w-4 text-primary" />
                            </div>
                            <div className="text-2xl font-bold">
                                {attendanceDay?.checkOutAt
                                    ? format(attendanceDay.checkOutAt, 'hh:mm aa')
                                    : '...'}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4 flex flex-col gap-1">
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>Worked</span>
                                <Timer className="h-4 w-4 text-green-500" />
                            </div>
                            <div className="text-2xl font-bold">
                                {formatDuration(
                                    attendanceDay?.totalMinutes || 0
                                )}
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
                    ) : (
                        <Button
                            size="lg"
                            variant={attendanceDay?.checkOutAt ? "default" : "destructive"}
                            className="flex-1 shadow-md"
                            onClick={handleCheckOut}
                            disabled={
                                isCheckingOut || !!attendanceDay?.checkOutAt
                            }
                        >
                            {isCheckingOut ? (
                                <Spinner />
                            ) : (
                                <>
                                    <LogOut className="h-5 w-5" />
                                    {attendanceDay?.checkOutAt
                                        ? 'Checked Out'
                                        : 'Check Out'}
                                </>
                            )}
                        </Button>
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
                            disabled={isStartingOT || countdown !== 'Ready to start'}
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
    );
}
