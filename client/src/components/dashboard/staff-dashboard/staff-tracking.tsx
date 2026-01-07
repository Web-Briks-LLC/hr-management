"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Clock, LogIn, FileText, Timer, LogOut } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import {
  useCheckInMutation,
  useCheckOutMutation,
  useGetTodayAttendanceQuery,
} from "@/redux/features/attendance/attendanceApi";
import {
  useGetMyOvertimeQuery,
  useStartOvertimeMutation,
  useStopOvertimeMutation,
  useGetScheduledOvertimeTodayQuery,
} from "@/redux/features/overtime/overtimeApi";
import { useGetMyShiftQuery } from "@/redux/features/shift/shiftApi";
import { toast } from "sonner";
import { format } from "date-fns";

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

  const [checkIn, { isLoading: isCheckingIn }] = useCheckInMutation();
  const [checkOut, { isLoading: isCheckingOut }] = useCheckOutMutation();
  const [startOvertime, { isLoading: isStartingOT }] =
    useStartOvertimeMutation();
  const [stopOvertime, { isLoading: isStoppingOT }] = useStopOvertimeMutation();

  const [countdown, setCountdown] = useState<string>("");

  // Early check-in countdown states
  const [showEarlyCheckInDialog, setShowEarlyCheckInDialog] = useState(false);
  const [earlyCheckInCountdown, setEarlyCheckInCountdown] =
    useState<string>("");
  const [earlyCheckInProgress, setEarlyCheckInProgress] = useState(0);
  const [isWaitingForCheckIn, setIsWaitingForCheckIn] = useState(false);
  const earlyCheckInIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialDiffRef = useRef<number>(0);

  // Find active OT (checked in but not ended)
  const activeOT = myOvertimeData?.find(
    (ot: any) => ot.actualStartTime && !ot.endTime
  );

  // Get shift start time for today
  const getShiftStartTime = useCallback(() => {
    if (!myShiftData?.shift?.shift?.startTime) return null;

    const now = new Date();
    const [h, m] = myShiftData.shift.shift.startTime.split(":");
    const shiftStart = new Date(now);
    shiftStart.setHours(Number(h), Number(m), 0, 0);
    return shiftStart;
  }, [myShiftData]);

  // Full cleanup function for early check-in (stops countdown completely)
  const cleanupEarlyCheckIn = useCallback(() => {
    if (earlyCheckInIntervalRef.current) {
      clearInterval(earlyCheckInIntervalRef.current);
      earlyCheckInIntervalRef.current = null;
    }
    setShowEarlyCheckInDialog(false);
    setIsWaitingForCheckIn(false);
    setEarlyCheckInCountdown("");
    setEarlyCheckInProgress(0);
    initialDiffRef.current = 0;
  }, []);

  // Just close the dialog without stopping countdown
  const closeDialogOnly = useCallback(() => {
    setShowEarlyCheckInDialog(false);
  }, []);

  // Perform actual check-in
  const performCheckIn = useCallback(async () => {
    try {
      const res = await checkIn({
        source: "web",
      }).unwrap();

      if (!res.success) {
        toast.error(res.message || "Failed to check in.");
        return false;
      }

      toast.success("🎉 Checked in successfully!", {
        description: `Time: ${format(new Date(), "hh:mm aa")}`,
      });
      return true;
    } catch (error: any) {
      const apiMessage =
        error?.data?.message ||
        error?.error ||
        "Failed to check in. Please try again.";

      if (
        apiMessage.includes("Shift has not started") ||
        apiMessage.includes("not a working day") ||
        apiMessage.includes("Shift time is over")
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
    // If already waiting, just reopen the dialog
    if (isWaitingForCheckIn) {
      setShowEarlyCheckInDialog(true);
      return;
    }

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
      toast.warning("Too early to check in", {
        description: `Shift starts at ${format(shiftStart, "hh:mm aa")}`,
      });
      return;
    }

    // Within 15 minutes window - start countdown
    setShowEarlyCheckInDialog(true);
    setIsWaitingForCheckIn(true);
    initialDiffRef.current = diffMs;

    toast.warning("⏰ Auto check-in will happen when shift starts", {
      description: "Please wait or cancel",
      duration: 5000,
    });

    // Start countdown interval
    earlyCheckInIntervalRef.current = setInterval(async () => {
      const currentNow = new Date();
      const currentDiff = shiftStart.getTime() - currentNow.getTime();

      if (currentDiff <= 0) {
        // Time to check in!
        cleanupEarlyCheckIn();
        const success = await performCheckIn();
        if (!success) {
          // If check-in failed, close dialog
          cleanupEarlyCheckIn();
        }
      } else {
        // Update countdown display
        const minutes = Math.floor(currentDiff / 1000 / 60);
        const seconds = Math.floor((currentDiff / 1000) % 60);
        setEarlyCheckInCountdown(
          `${minutes.toString().padStart(2, "0")}:${seconds
            .toString()
            .padStart(2, "0")}`
        );

        // Update progress (inverted - fills up as time passes)
        const progressPercent =
          ((initialDiffRef.current - currentDiff) / initialDiffRef.current) *
          100;
        setEarlyCheckInProgress(progressPercent);
      }
    }, 1000);
  };

  // Cancel early check-in completely (stops countdown)
  const handleCancelEarlyCheckIn = () => {
    cleanupEarlyCheckIn();
    toast.info("Early check-in cancelled");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (earlyCheckInIntervalRef.current) {
        clearInterval(earlyCheckInIntervalRef.current);
      }
    };
  }, []);

  // Update countdown every second if there's a scheduled OT
  useEffect(() => {
    if (!scheduledOT) return;

    const updateCountdown = () => {
      const now = new Date();
      const scheduledTime = new Date(scheduledOT.startTime);
      const diff = scheduledTime.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown("Ready to start");
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

  const handleCheckOut = async () => {
    try {
      const res = await checkOut({
        source: "web",
      }).unwrap();

      if (!res.success) {
        toast.error(res.message || "Failed to check out.");
        return;
      }

      if ((res.attendanceDay?.earlyExitMinutes ?? 0) > 0) {
        toast.warning("Checked out early!", {
          description: `You left ${res.attendanceDay.earlyExitMinutes} minutes early.`,
        });
      } else {
        toast.success("Checked out successfully!");
      }
    } catch (error: any) {
      console.log(error);
      const apiMessage =
        error?.data?.message ||
        error?.error ||
        "Failed to check out. Please try again.";

      toast.error(apiMessage);
    }
  };

  const handleStartOT = async () => {
    try {
      await startOvertime({}).unwrap();
      toast.success("Overtime started!");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to start overtime");
    }
  };

  const handleStopOT = async () => {
    try {
      const result = await stopOvertime({}).unwrap();

      // Check if stopped early
      if (result.data?.earlyStopMinutes > 0) {
        toast.warning("OT stopped early!", {
          description: `You stopped ${result.data.earlyStopMinutes} minutes before the scheduled duration.`,
        });
      } else {
        toast.success("Overtime stopped!");
      }
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to stop overtime");
    }
  };

  const router = useRouter();

  const handleApplyLeave = () => {
    router.push("/leave/apply");
  };

  const attendanceDay = todaysData?.attendance?.attendanceDay;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-xl font-bold">
              Time Tracking (Today)
            </CardTitle>
            <CardDescription className="text-sm">
              Date: {format(new Date(), "PPP")}
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
                    ? format(attendanceDay.checkInAt, "hh:mm aa")
                    : "..."}
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
                    ? format(attendanceDay.checkOutAt, "hh:mm aa")
                    : "..."}
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
                  {formatDuration(attendanceDay?.totalMinutes || 0)}
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
                disabled={isCheckingIn || isWaitingForCheckIn}
              >
                {isCheckingIn ? (
                  <Spinner />
                ) : isWaitingForCheckIn ? (
                  <>
                    <Clock className="h-5 w-5 animate-pulse" />
                    {earlyCheckInCountdown || "Waiting..."}
                  </>
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
                disabled={isCheckingOut || !!attendanceDay?.checkOutAt}
              >
                {isCheckingOut ? (
                  <Spinner />
                ) : (
                  <>
                    <LogOut className="h-5 w-5" />
                    {attendanceDay?.checkOutAt ? "Checked Out" : "Check Out"}
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
                disabled={isStartingOT || countdown !== "Ready to start"}
              >
                {isStartingOT ? (
                  <Spinner />
                ) : (
                  <>
                    <Clock className="h-5 w-5" />
                    {countdown || "Start OT"}
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

      {/* Early Check-in Countdown Dialog */}
      <Dialog
        open={showEarlyCheckInDialog}
        onOpenChange={(open) => {
          if (!open) closeDialogOnly();
        }}
      >
        <DialogContent className="sm:max-w-sm p-6">
          <div className="flex flex-col items-center gap-5">
            {/* Timer Circle - Minimal */}
            <div className="relative">
              <div className="flex items-center justify-center w-28 h-28 rounded-full bg-primary/10 border border-primary/20">
                <div className="text-center">
                  <div className="text-3xl font-bold font-mono text-primary">
                    {earlyCheckInCountdown || "--:--"}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                    remaining
                  </div>
                </div>
              </div>
              {/* Simple spinning ring */}
              <div
                className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin"
                style={{ animationDuration: '2s' }}
              />
            </div>

            {/* Info Text */}
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">Auto check-in at shift start</p>
              {myShiftData?.shift?.shift && (
                <p className="text-xs text-muted-foreground">
                  Shift starts at {format(getShiftStartTime()!, "hh:mm aa")}
                </p>
              )}
            </div>

            {/* Progress Bar - Thin */}
            <div className="w-full">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div 
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${earlyCheckInProgress}%` }}
                />
              </div>
            </div>

            {/* Buttons - Compact */}
            <div className="flex gap-2 w-full pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={closeDialogOnly}
                className="flex-1"
              >
                Close
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleCancelEarlyCheckIn}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
