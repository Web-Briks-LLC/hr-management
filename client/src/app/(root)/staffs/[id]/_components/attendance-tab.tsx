'use client';

import { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export function StaffAttendanceTab({ staffId }: { staffId: string }) {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);

    const { data, isLoading, isFetching } = useGetAllAttendanceQuery({
        staffId,
        page,
        limit,
    });

    const attendances = data?.data?.records || [];
    const pagination = data?.data?.pagination;

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
            <div className="space-y-4">
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
        <div className="space-y-4">
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
                                    ? format(
                                          new Date(rec.checkInAt),
                                          'hh:mm aa',
                                      )
                                    : '-'}
                            </TableCell>
                            <TableCell>
                                {rec.checkOutAt
                                    ? format(
                                          new Date(rec.checkOutAt),
                                          'hh:mm aa',
                                      )
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

            {/* Pagination */}
            {pagination && (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="text-sm text-muted-foreground">
                            Page {pagination.page} of{' '}
                            {Math.max(1, pagination.pages)} ({pagination.total}{' '}
                            total)
                        </div>
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">Rows per page</p>
                            <Select
                                value={`${limit}`}
                                onValueChange={(value) => {
                                    setLimit(Number(value));
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="h-8 w-[70px]">
                                    <SelectValue placeholder={limit} />
                                </SelectTrigger>
                                <SelectContent side="top">
                                    {[10, 20, 30, 40, 50].map((pageSize) => (
                                        <SelectItem
                                            key={pageSize}
                                            value={`${pageSize}`}
                                        >
                                            {pageSize}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1 || isFetching}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                setPage((p) =>
                                    Math.min(pagination.pages, p + 1),
                                )
                            }
                            disabled={page >= pagination.pages || isFetching}
                        >
                            Next
                            <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
