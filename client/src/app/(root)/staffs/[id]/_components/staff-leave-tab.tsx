'use client';

import { useGetLeaveApplicationsQuery } from '@/redux/features/leave/leaveApi';
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

export function StaffLeaveTab({ staffId }: { staffId: string }) {
    const { data: response, isLoading } = useGetLeaveApplicationsQuery({
        staffId,
        page: 1,
        limit: 10,
    });

    const leaves = response?.data || [];

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'approved':
                return 'default'; // green usually
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

    if (leaves.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                No leave applications found.
            </div>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {leaves.map((leave: any) => (
                    <TableRow key={leave._id}>
                        <TableCell className="font-medium capitalize">
                            {leave.leaveType.replace('_', ' ')}
                        </TableCell>
                        <TableCell>
                            {format(new Date(leave.startDate), 'PP')}
                        </TableCell>
                        <TableCell>
                            {format(new Date(leave.endDate), 'PP')}
                        </TableCell>
                        <TableCell
                            className="max-w-[200px] truncate"
                            title={leave.reason}
                        >
                            {leave.reason}
                        </TableCell>
                        <TableCell>
                            <Badge variant={getStatusVariant(leave.status)}>
                                {leave.status}
                            </Badge>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
