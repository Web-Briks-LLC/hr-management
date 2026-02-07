'use client';

import { useGetAllAttendanceQuery } from '@/redux/features/attendance/attendanceApi';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export function StaffAttendanceTab({ staffId }: { staffId: string }) {
    const { data, isLoading } = useGetAllAttendanceQuery({
        staffId,
        page: 1,
        limit: 10,
    });

    const attendances = data?.data?.attendance || [];

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'present':
                return 'default';
            case 'absent':
                return 'destructive';
            case 'late':
                return 'secondary'; // yellow-ish usually, but shadcn secondary is gray
            case 'leave':
                return 'outline';
            default:
                return 'outline';
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                ))}
            </div>
        );
    }

    if (attendances.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                No attendance records found.
            </div>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Time</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {attendances.map((rec: any) => (
                    <TableRow key={rec._id}>
                        <TableCell>
                            {format(new Date(rec.date), 'PP')}
                        </TableCell>
                        <TableCell>
                            {rec.checkInAt
                                ? format(new Date(rec.checkInAt), 'hh:mm aa')
                                : '-'}
                        </TableCell>
                        <TableCell>
                            {rec.checkOutAt
                                ? format(new Date(rec.checkOutAt), 'hh:mm aa')
                                : '-'}
                        </TableCell>
                        <TableCell>
                            <Badge variant={getStatusVariant(rec.status)}>
                                {rec.status}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            {rec.totalMinutes
                                ? `${Math.floor(rec.totalMinutes / 60)}h ${rec.totalMinutes % 60}m`
                                : '-'}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
