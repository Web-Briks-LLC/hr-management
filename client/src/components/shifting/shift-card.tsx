'use client';

import { useState } from 'react';
import { format, isToday, isFuture, startOfDay } from 'date-fns';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';

import {
    EllipsisVertical,
    Pencil,
    Clock,
    CalendarDays,
    Timer,
    CalendarOff,
} from 'lucide-react';
import { toast } from 'sonner';

import {
    useUpdateShiftMutation,
    useGetShiftOffDatesQuery,
} from '@/redux/features/shift/shiftApi';
import UpdateShift from './update-shift';
import { IShift } from '@/types/shift.type';
import { useSession } from '@/lib/auth-client';
import { Role } from '@/constants/role';
import ShiftDeleteAlert from './shift-delete-alert';
import ShiftOffDialog from './shift-off-dialog';

interface ShiftCardProps {
    shift: IShift;
}

const DAY_MAP: Record<number, string> = {
    0: 'Sun',
    1: 'Mon',
    2: 'Tue',
    3: 'Wed',
    4: 'Thu',
    5: 'Fri',
    6: 'Sat',
};

export default function ShiftCard({ shift }: ShiftCardProps) {
    const { data: session, isPending, isRefetching } = useSession();
    const [openEdit, setOpenEdit] = useState(false);
    const [updateShift, { isLoading: isUpdating }] = useUpdateShiftMutation();

    // Fetch off dates for this shift
    const { data: offDatesData } = useGetShiftOffDatesQuery(shift._id);

    const isLoading = isPending || isRefetching;

    const offDates = offDatesData?.data?.dates || [];
    const upcomingOffDates = offDates
        .map((d: string) => new Date(d))
        .filter((d: Date) => isToday(d) || isFuture(startOfDay(d)))
        .slice(0, 5); // Show max 5 upcoming off dates

    const handleToggleStatus = async (value: boolean) => {
        try {
            await updateShift({
                id: shift._id,
                data: { isActive: value },
            }).unwrap();

            toast.success('Shift status updated');
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to update status');
        }
    };

    return (
        <>
            <Card className="relative transition hover:shadow-lg">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-semibold">
                                {shift.name}
                            </CardTitle>
                            <CardDescription>
                                {shift.branchId.name}
                            </CardDescription>
                        </div>

                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="mt-1">
                                {shift.code}
                            </Badge>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        disabled={
                                            isLoading ||
                                            session?.user.role ===
                                                Role.TEAM_LEADER
                                        }
                                    >
                                        <EllipsisVertical />
                                    </Button>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                        onClick={() => setOpenEdit(true)}
                                    >
                                        <Pencil className=" h-4 w-4" />
                                        Edit
                                    </DropdownMenuItem>

                                    <ShiftDeleteAlert shiftId={shift._id} />
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2 rounded-md border p-3">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">
                                    Start
                                </p>
                                <p className="font-medium">{shift.startTime}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 rounded-md border p-3">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">
                                    End
                                </p>
                                <p className="font-medium">{shift.endTime}</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-md border p-3 space-y-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <CalendarDays className="h-4 w-4" />
                            Working Days
                        </div>

                        <div className="flex flex-wrap flex-1 items-center gap-2">
                            {shift.workDays?.map((day) => (
                                <Badge key={day}>{DAY_MAP[day]}</Badge>
                            ))}
                        </div>
                    </div>

                    {/* Scheduled Off Days */}
                    {upcomingOffDates.length > 0 && (
                        <div className="rounded-md border border-orange-500/30 bg-orange-500/5 p-3 space-y-2">
                            <div className="flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400">
                                <CalendarOff className="h-4 w-4" />
                                Scheduled Off Days
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {upcomingOffDates.map((d: Date) => (
                                    <Badge
                                        key={d.toISOString()}
                                        variant="outline"
                                        className={`text-xs ${isToday(d) ? 'border-red-500 text-red-500 bg-red-500/10' : 'border-orange-500/50 text-orange-600 dark:text-orange-400'}`}
                                    >
                                        {isToday(d)
                                            ? 'Today'
                                            : format(d, 'dd MMM')}
                                    </Badge>
                                ))}
                                {offDates.length > 5 && (
                                    <Badge
                                        variant="outline"
                                        className="text-xs"
                                    >
                                        +{offDates.length - 5} more
                                    </Badge>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-md border p-3 text-center">
                            <p className="text-xs text-muted-foreground">
                                Grace
                            </p>
                            <p className="font-medium">
                                {shift.gracePeriodMinutes}m
                            </p>
                        </div>

                        <div className="rounded-md border p-3 text-center">
                            <p className="text-xs text-muted-foreground">
                                Late After
                            </p>
                            <p className="font-medium">
                                {shift.lateAfterMinutes}m
                            </p>
                        </div>

                        <div className="rounded-md border p-3 text-center">
                            <p className="text-xs text-muted-foreground">
                                Half Day
                            </p>
                            <p className="font-medium">
                                {shift.halfDayAfterMinutes / 60}h
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-beetween gap-2">
                        {/* Set Off Days Button */}
                        {session?.user.role !== Role.TEAM_LEADER && (
                            <div className="flex justify-end">
                                <ShiftOffDialog
                                    shiftId={shift._id}
                                    shiftName={shift.name}
                                />
                            </div>
                        )}

                        {/* ✅ OT + STATUS */}
                        <div className="flex items-center justify-between gap-2 rounded-md border p-[9px] w-full">
                            <div className="flex items-center gap-2">
                                <Timer className="h-4 w-4 text-muted-foreground" />
                                <span>OT</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <Badge
                                    variant={
                                        shift.isActive ? 'default' : 'secondary'
                                    }
                                >
                                    {shift.isActive ? 'Active' : 'Inactive'}
                                </Badge>

                                <Switch
                                    checked={shift.isActive}
                                    disabled={isUpdating}
                                    onCheckedChange={handleToggleStatus}
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <UpdateShift open={openEdit} setOpen={setOpenEdit} shift={shift} />
        </>
    );
}
