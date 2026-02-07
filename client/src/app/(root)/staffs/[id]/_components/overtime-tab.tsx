'use client';

import { useGetAllOvertimeQuery } from '@/redux/features/overtime/overtimeApi';
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

export function StaffOvertimeTab({ staffId }: { staffId: string }) {
    const { data: response, isLoading } = useGetAllOvertimeQuery({
        staffId,
        page: 1,
        limit: 10,
    });

    const overtimes = response?.data?.overtimes || [];

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'approved':
                return 'default';
            case 'rejected':
                return 'destructive';
            case 'pending':
                return 'secondary';
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

    if (overtimes.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                No overtime records found.
            </div>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>End Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {overtimes.map((ot: any) => (
                    <TableRow key={ot._id}>
                        <TableCell>{format(new Date(ot.date), 'PP')}</TableCell>
                        <TableCell>
                            {ot.startTime
                                ? format(new Date(ot.startTime), 'hh:mm aa')
                                : '-'}
                        </TableCell>
                        <TableCell>
                            {ot.endTime
                                ? format(new Date(ot.endTime), 'hh:mm aa')
                                : '-'}
                        </TableCell>
                        <TableCell>
                            {ot.durationMinutes
                                ? `${Math.floor(ot.durationMinutes / 60)}h ${ot.durationMinutes % 60}m`
                                : '-'}
                        </TableCell>
                        <TableCell>
                            <Badge variant={getStatusVariant(ot.status)}>
                                {ot.status}
                            </Badge>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
