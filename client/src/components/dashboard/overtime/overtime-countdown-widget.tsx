"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, StopCircle } from "lucide-react";
import {
  useGetMyOvertimeQuery,
  useStopOvertimeMutation,
} from "@/redux/features/overtime/overtimeApi";
import { IOvertime } from "@/types/overtime.type";
import { toast } from "sonner";

export default function OvertimeCountdownWidget() {
  const { data: overtimeData } = useGetMyOvertimeQuery({});
  const [stopOvertime, { isLoading: isStopping }] = useStopOvertimeMutation();
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [progress, setProgress] = useState(0);

  // Find the active overtime
  const records = (overtimeData?.data as IOvertime[]) || [];
  const activeOT = records.find((ot) => ot.actualStartTime && !ot.endTime);

  useEffect(() => {
    if (!activeOT || !activeOT.actualStartTime) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const start = new Date(activeOT.actualStartTime!).getTime();
      const allowedDurationMs = activeOT.durationMinutes * 60 * 1000;
      const end = start + allowedDurationMs;

      const remaining = end - now;

      if (remaining <= 0) {
        setTimeLeft("00:00:00");
        setProgress(100);
      } else {
        const h = Math.floor((remaining / (1000 * 60 * 60)) % 24);
        const m = Math.floor((remaining / 1000 / 60) % 60);
        const s = Math.floor((remaining / 1000) % 60);
        setTimeLeft(
          `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`,
        );

        const elapsed = now - start;
        setProgress(
          Math.min(100, Math.max(0, (elapsed / allowedDurationMs) * 100)),
        );
      }
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);

    return () => clearInterval(intervalId);
  }, [activeOT]);

  if (!activeOT) return null;

  const handleStop = async () => {
    if (!confirm("Are you sure you want to stop your overtime early?")) return;
    try {
      await stopOvertime({}).unwrap();
      toast.success("Overtime stopped successfully");
    } catch (error) {
      toast.error((error as Error).message || "Failed to stop overtime");
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5 shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-primary animate-pulse" />
          Active Overtime Session
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 space-y-3 w-full">
            <div className="flex items-center justify-between font-mono text-3xl font-bold tracking-tight text-primary">
              <span>{timeLeft || "00:00:00"}</span>
            </div>
            <div className="h-2 w-full bg-primary/20 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${progress > 90 ? "bg-red-500" : "bg-primary"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground flex justify-between">
              <span>
                Started:{" "}
                {new Date(activeOT.actualStartTime!).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span>
                Limit: {Math.floor(activeOT.durationMinutes / 60)}h{" "}
                {activeOT.durationMinutes % 60}m
              </span>
            </p>
          </div>
          <Button
            variant="destructive"
            size="lg"
            onClick={handleStop}
            disabled={isStopping}
            className="w-full sm:w-auto font-medium"
          >
            <StopCircle className="h-5 w-5 mr-2" />
            End Early
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
