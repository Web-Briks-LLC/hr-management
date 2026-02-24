import { useState } from "react";
import { isToday, isFuture, startOfDay } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
    EllipsisVertical,
    Pencil,
    Clock,
    CalendarDays,
    Timer,
    CalendarOff,
} from "lucide-react";
import { toast } from "sonner";

import {
    useUpdateShiftMutation,
    useGetShiftOffDatesQuery,
} from "@/redux/features/shift/shiftApi";
import UpdateShift from "./update-shift";
import { IShift } from "@/types/shift.type";
import { useSession } from "@/lib/auth-client";
import { Role } from "@/constants/role";
import ShiftDeleteAlert from "./shift-delete-alert";
import ShiftOffDialog from "./shift-off-dialog";
import AssignedStaffDialog from "./assigned-staff-dialog";

interface ShiftCardProps {
    shift: IShift;
}

const DAY_MAP: Record<number, string> = {
    0: "Sun",
    1: "Mon",
    2: "Tue",
    3: "Wed",
    4: "Thu",
    5: "Fri",
    6: "Sat",
};

export default function ShiftCard({ shift }: ShiftCardProps) {
    const { data: session, isPending, isRefetching } = useSession();
    const [openEdit, setOpenEdit] = useState(false);
    const [updateShift, { isLoading: isUpdating }] = useUpdateShiftMutation();

    const { data: offDatesData } = useGetShiftOffDatesQuery(shift._id);
    const isLoading = isPending || isRefetching;

    const offDates = offDatesData?.data?.dates || [];
    const upcomingOffDates = offDates
        .map((d: string) => new Date(d))
        .filter((d: Date) => isToday(d) || isFuture(startOfDay(d)))
        .slice(0, 5);

    const handleToggleStatus = async (value: boolean) => {
        try {
            await updateShift({
                id: shift._id,
                data: { isActive: value },
            }).unwrap();
            toast.success("Shift status updated");
        } catch (err: unknown) {
            const error = err as { data?: { message?: string } };
            toast.error(error?.data?.message || "Failed to update status");
        }
    };

    return (
        <>
            <div className="group relative flex flex-col p-5 gap-4 rounded-xl border bg-card transition-all hover:shadow-md hover:border-primary/20">
                {/* Top Row: Name, Branch, Status, Off Banner, Actions */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 w-full">
                    {/* Left section: Name & Status */}
                    <div className="flex flex-wrap items-center gap-3 lg:gap-4">
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold tracking-tight text-foreground">
                                {shift.name}
                            </h3>
                            <Badge
                                variant="outline"
                                className="font-mono text-[10px] px-1.5 py-0 h-5"
                            >
                                {shift.code}
                            </Badge>
                        </div>
                        <div className="h-4 w-px bg-border hidden sm:block" />
                        <p className="text-sm font-medium text-muted-foreground mr-1">
                            {shift.branchId?.name || "Global"}
                        </p>

                        <div className="flex items-center gap-2 border-l pl-3 ml-1 lg:border-none lg:pl-0 lg:ml-0">
                            <Badge
                                variant={
                                    shift.isActive ? "default" : "secondary"
                                }
                                className="w-fit"
                            >
                                {shift.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <Switch
                                checked={shift.isActive}
                                disabled={isUpdating}
                                onCheckedChange={handleToggleStatus}
                                className="scale-75 origin-left"
                            />
                        </div>

                        {upcomingOffDates.length > 0 && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-500/10 border border-orange-500/20 rounded-md">
                                <CalendarOff className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                                <span className="text-[11px] font-medium text-orange-600 dark:text-orange-400 mt-px tracking-wide">
                                    OFF: {upcomingOffDates.length} UPCOMING
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end lg:self-auto mt-2 lg:mt-0">
                        <AssignedStaffDialog
                            shiftId={shift._id}
                            shiftName={shift.name}
                        />

                        {session?.user.role !== Role.TEAM_LEADER && (
                            <ShiftOffDialog
                                shiftId={shift._id}
                                shiftName={shift.name}
                            />
                        )}

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    disabled={
                                        isLoading ||
                                        session?.user.role === Role.TEAM_LEADER
                                    }
                                    className="h-8 w-8 focus-visible:ring-0"
                                >
                                    <EllipsisVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="end"
                                className="w-[160px]"
                            >
                                <DropdownMenuItem
                                    onClick={() => setOpenEdit(true)}
                                >
                                    <Pencil className="mr-2 h-4 w-4 text-muted-foreground" />
                                    Edit Details
                                </DropdownMenuItem>
                                <ShiftDeleteAlert shiftId={shift._id} />
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Bottom Row: Timings, Days, Constraints */}
                <div className="flex flex-col xl:flex-row items-start xl:items-center gap-4 xl:gap-6 p-4 bg-muted/30 rounded-lg border">
                    {/* Time block */}
                    <div className="flex items-center gap-4 bg-background px-3 py-2 rounded-md border shadow-sm shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="p-1 bg-muted rounded">
                                <Clock className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider leading-none mb-1">
                                    Start
                                </p>
                                <p className="font-medium text-sm font-mono leading-none">
                                    {shift.startTime}
                                </p>
                            </div>
                        </div>
                        <div className="w-px h-6 bg-border" />
                        <div className="flex items-center gap-2">
                            <div className="p-1 bg-muted rounded">
                                <Timer className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider leading-none mb-1">
                                    End
                                </p>
                                <p className="font-medium text-sm font-mono leading-none">
                                    {shift.endTime}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Working Days Block */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground whitespace-nowrap">
                            <CalendarDays className="h-3.5 w-3.5" />
                            Days
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {shift.workDays?.map((day) => (
                                <Badge
                                    key={day}
                                    variant="secondary"
                                    className="px-1.5 py-0 text-xs font-normal"
                                >
                                    {DAY_MAP[day]}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <div className="hidden xl:block w-px h-8 bg-border shrink-0" />

                    {/* Specs */}
                    <div className="flex flex-wrap items-center gap-4 text-sm whitespace-nowrap bg-background xl:bg-transparent px-3 py-2 xl:p-0 rounded-md border xl:border-none shadow-sm xl:shadow-none">
                        <div>
                            <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider leading-none mb-1">
                                Grace
                            </p>
                            <p className="font-medium leading-none">
                                {shift.gracePeriodMinutes}m
                            </p>
                        </div>
                        <div className="w-px h-6 bg-border" />
                        <div>
                            <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider leading-none mb-1">
                                Late
                            </p>
                            <p className="font-medium leading-none">
                                {shift.lateAfterMinutes}m
                            </p>
                        </div>
                        <div className="w-px h-6 bg-border" />
                        <div>
                            <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider leading-none mb-1">
                                Half-day
                            </p>
                            <p className="font-medium leading-none">
                                {shift.halfDayAfterMinutes / 60}h
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <UpdateShift open={openEdit} setOpen={setOpenEdit} shift={shift} />
        </>
    );
}
