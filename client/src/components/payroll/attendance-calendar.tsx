"use client";

import { useMemo, useState } from "react";
import { ICalendarDay } from "@/types/payroll.type";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { useSetAttendanceMutation } from "@/redux/features/payroll/payrollApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CalendarDays,
  Check,
  Clock,
  Loader2,
  LogIn,
  LogOut,
  X,
  Palmtree,
  CalendarOff,
} from "lucide-react";

// ── Config ────────────────────────────────────────────────────────────

interface AttendanceCalendarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffId: string;
  staffName: string;
  calendar: ICalendarDay[];
  month: string; // YYYY-MM
  branchId?: string;
}

const STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; label: string; icon?: React.ReactNode }
> = {
  present: { bg: "bg-green-500", text: "text-white", label: "Present" },
  late: { bg: "bg-yellow-400", text: "text-yellow-900", label: "Late" },
  absent: { bg: "bg-red-500", text: "text-white", label: "Absent" },
  half_day: { bg: "bg-orange-400", text: "text-white", label: "Half Day" },
  early_exit: { bg: "bg-green-400", text: "text-white", label: "Early Exit" },
  on_leave: { bg: "bg-blue-500", text: "text-white", label: "Leave" },
  holiday: { bg: "bg-blue-400", text: "text-white", label: "Holiday" },
  weekend: { bg: "bg-indigo-400", text: "text-white", label: "Weekend" },
  off_day: { bg: "bg-muted", text: "text-muted-foreground", label: "Off Day" },
  unemployed: {
    bg: "bg-muted/50",
    text: "text-muted-foreground/50",
    label: "N/A",
  },
  future: {
    bg: "bg-muted/30",
    text: "text-muted-foreground/40",
    label: "Upcoming",
  },
};

const STATUS_OPTIONS = [
  {
    value: "present",
    label: "Present",
    icon: <Check className="h-4 w-4 text-green-500" />,
  },
  {
    value: "late",
    label: "Late",
    icon: <Clock className="h-4 w-4 text-yellow-500" />,
  },
  {
    value: "absent",
    label: "Absent",
    icon: <X className="h-4 w-4 text-red-500" />,
  },
  {
    value: "weekend",
    label: "Weekend",
    icon: <CalendarOff className="h-4 w-4 text-indigo-400" />,
  },
  {
    value: "on_leave",
    label: "Leave",
    icon: <Palmtree className="h-4 w-4 text-blue-500" />,
  },
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const LEGEND_ITEMS = [
  { key: "present", label: "Present" },
  { key: "late", label: "Late" },
  { key: "absent", label: "Absent" },
  { key: "on_leave", label: "Leave" },
  { key: "holiday", label: "Holiday" },
  { key: "weekend", label: "Weekend" },
  { key: "off_day", label: "Off Day" },
];

function formatTime12h(time24: string | null | undefined): string {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const ampm = h! >= 12 ? "PM" : "AM";
  const hour12 = h! % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatCheckTime(isoStr: string | null | undefined): string {
  if (!isoStr) return "";
  try {
    return format(new Date(isoStr), "hh:mm a");
  } catch {
    return "";
  }
}

// ── Component ─────────────────────────────────────────────────────────

export default function AttendanceCalendar({
  open,
  onOpenChange,
  staffId,
  staffName,
  calendar,
  month,
  branchId,
}: AttendanceCalendarProps) {
  const [setAttendance] = useSetAttendanceMutation();
  const [loadingDates, setLoadingDates] = useState<Set<string>>(new Set());

  const { paddingDays, monthLabel } = useMemo(() => {
    const [year, mon] = month.split("-").map(Number);
    const firstDay = new Date(year!, mon! - 1, 1);
    return {
      paddingDays: firstDay.getDay(),
      monthLabel: format(firstDay, "MMMM yyyy"),
    };
  }, [month]);

  const handleStatusChange = async (date: string, status: string) => {
    setLoadingDates((prev) => new Set(prev).add(date));
    try {
      await setAttendance({
        staffId,
        date,
        status,
        month,
        branchId,
      }).unwrap();
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ||
        (err as Error)?.message ||
        "Failed to update attendance";
      toast.error(message);
    } finally {
      setLoadingDates((prev) => {
        const next = new Set(prev);
        next.delete(date);
        return next;
      });
    }
  };

  const isEditable = (day: ICalendarDay) => {
    return !["future", "unemployed"].includes(day.status);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            <span>{staffName}</span>
            <span className="text-muted-foreground font-normal">
              — {monthLabel}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1">
            {DAY_NAMES.map((d) => (
              <div
                key={d}
                className="text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Padding */}
            {Array.from({ length: paddingDays }).map((_, i) => (
              <div key={`pad-${i}`} className="h-10" />
            ))}

            {/* Day cells */}
            {calendar.map((day) => {
              const dayNum = parseInt(day.date.split("-")[2]!, 10);
              const config = STATUS_CONFIG[day.status] || STATUS_CONFIG.future!;
              const editable = isEditable(day);
              const isLoading = loadingDates.has(day.date);

              if (!editable) {
                return (
                  <div
                    key={day.date}
                    title={`${day.date}: ${config.label}`}
                    className={cn(
                      "h-10 flex items-center justify-center rounded-md text-xs font-semibold cursor-default",
                      config.bg,
                      config.text,
                    )}
                  >
                    {dayNum}
                  </div>
                );
              }

              return (
                <DropdownMenu key={day.date}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        "h-10 w-full flex items-center justify-center rounded-md text-xs font-semibold transition-all",
                        "hover:ring-2 hover:ring-primary/50 hover:scale-105 cursor-pointer",
                        isLoading && "opacity-70 pointer-events-none",
                        config.bg,
                        config.text,
                      )}
                      title={`${day.date}: ${config.label}`}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        dayNum
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-56">
                    {/* Shift & Check-in info header */}
                    <DropdownMenuLabel className="space-y-1 pb-2">
                      <div className="flex items-center gap-2 text-xs">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Shift:</span>
                        <span className="font-semibold">
                          {day.shiftStart && day.shiftEnd
                            ? `${formatTime12h(day.shiftStart)} — ${formatTime12h(day.shiftEnd)}`
                            : "No shift"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <LogIn className="h-3 w-3 text-green-500" />
                        <span className="text-muted-foreground">In:</span>
                        <span
                          className={cn(
                            "font-medium",
                            day.checkInAt ? "" : "text-muted-foreground italic",
                          )}
                        >
                          {day.checkInAt
                            ? formatCheckTime(day.checkInAt)
                            : "No check-in"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <LogOut className="h-3 w-3 text-red-500" />
                        <span className="text-muted-foreground">Out:</span>
                        <span
                          className={cn(
                            "font-medium",
                            day.checkOutAt
                              ? ""
                              : "text-muted-foreground italic",
                          )}
                        >
                          {day.checkOutAt
                            ? formatCheckTime(day.checkOutAt)
                            : "No check-out"}
                        </span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {/* Status options */}
                    {STATUS_OPTIONS.map((opt) => (
                      <DropdownMenuItem
                        key={opt.value}
                        className={cn(
                          "gap-2 cursor-pointer",
                          day.status === opt.value && "bg-muted font-semibold",
                        )}
                        onClick={() => handleStatusChange(day.date, opt.value)}
                      >
                        {opt.icon}
                        {opt.label}
                        {day.status === opt.value && (
                          <Check className="h-3 w-3 ml-auto text-primary" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
            {LEGEND_ITEMS.map((item) => {
              const config = STATUS_CONFIG[item.key]!;
              return (
                <div key={item.key} className="flex items-center gap-1.5">
                  <div className={cn("h-3 w-3 rounded-sm", config.bg)} />
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
