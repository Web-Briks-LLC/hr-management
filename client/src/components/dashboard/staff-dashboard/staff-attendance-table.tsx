import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useGetMyOvertimeQuery } from '@/redux/features/overtime/overtimeApi';
import { useGetMyAttendanceHistoryQuery } from '@/redux/features/attendance/attendanceApi';
import { format } from 'date-fns';
import { Clock, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { IAttendanceDay } from '@/types/attendance.type';
import { IOvertime } from '@/types/overtime.type';

const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
};

const formatTime = (date: string | Date | null | undefined) => {
    if (!date) return '-';
    return format(new Date(date), 'hh:mm aa');
};

export default function StaffAttendanceTable() {
    const { data: attendanceHistory } = useGetMyAttendanceHistoryQuery(7);
    const { data: overtimeData } = useGetMyOvertimeQuery(undefined);

    // Generate last 7 days (most recent first)
    const getLast7Days = () => {
        const days = [];
        for (let i = 0; i <= 6; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date);
        }
        return days;
    };

    const last7Days = getLast7Days();

    // Get attendance for a specific date
    const getAttendanceForDate = (date: Date) => {
        // Find attendance record for this date
        const attendance = attendanceHistory?.find((record: IAttendanceDay) => {
            const recordDate = new Date(record.date);
            return (
                recordDate.getDate() === date.getDate() &&
                recordDate.getMonth() === date.getMonth() &&
                recordDate.getFullYear() === date.getFullYear()
            );
        });

        if (!attendance) return null;

        // Find OT for this date
        const otForDate = overtimeData?.find((ot: IOvertime) => {
            const otDate = new Date(ot.date);
            return (
                otDate.getDate() === date.getDate() &&
                otDate.getMonth() === date.getMonth() &&
                otDate.getFullYear() === date.getFullYear() &&
                ot.endTime // Completed OT
            );
        });

        return {
            date,
            shiftName: (typeof attendance.shiftId === 'object' && attendance.shiftId !== null) ? attendance.shiftId.name : 'N/A',
            checkIn: attendance.checkInAt,
            checkOut: attendance.checkOutAt,
            workHours: attendance.totalMinutes || 0,
            otMinutes: otForDate?.durationMinutes || 0,
            status: attendance.status,
        };
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'present':
                return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case 'late':
                return <Clock className="h-4 w-4 text-orange-500" />;
            case 'absent':
                return <XCircle className="h-4 w-4 text-red-500" />;
            default:
                return <MinusCircle className="h-4 w-4 text-gray-400" />;
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            present: 'default',
            late: 'secondary',
            absent: 'destructive',
        };

        return (
            <Badge variant={variants[status] || 'outline'} className="capitalize">
                {status}
            </Badge>
        );
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-xl font-bold">
                    Attendance History (Last 7 Days)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Shift</TableHead>
                                <TableHead>Check In</TableHead>
                                <TableHead>Check Out</TableHead>
                                <TableHead>Work Hours</TableHead>
                                <TableHead>OT Time</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {last7Days.map((date) => {
                                const attendance = getAttendanceForDate(new Date(date));

                                if (!attendance) {
                                    return (
                                        <TableRow key={date.toISOString()}>
                                            <TableCell className="font-medium">
                                                {format(date, 'MMM dd, yyyy')}
                                                <div className="text-xs text-muted-foreground">
                                                    {format(date, 'EEEE')}
                                                </div>
                                            </TableCell>
                                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                                                Weekend
                                            </TableCell>
                                        </TableRow>
                                    );
                                }

                                return (
                                    <TableRow key={date.toISOString()}>
                                        <TableCell className="font-medium">
                                            {format(attendance.date, 'MMM dd, yyyy')}
                                            <div className="text-xs text-muted-foreground">
                                                {format(attendance.date, 'EEEE')}
                                            </div>
                                        </TableCell>
                                        <TableCell>{attendance.shiftName}</TableCell>
                                        <TableCell>{formatTime(attendance.checkIn)}</TableCell>
                                        <TableCell>{formatTime(attendance.checkOut)}</TableCell>
                                        <TableCell>{formatDuration(attendance.workHours)}</TableCell>
                                        <TableCell>
                                            {attendance.otMinutes > 0 ? (
                                                <span className="text-orange-600 font-medium">
                                                    {formatDuration(attendance.otMinutes)}
                                                </span>
                                            ) : (
                                                '-'
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(attendance.status)}
                                                {getStatusBadge(attendance.status)}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
