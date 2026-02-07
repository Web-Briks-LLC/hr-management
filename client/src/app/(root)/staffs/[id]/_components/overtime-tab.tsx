'use client';

import { useState } from 'react';
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

export function StaffOvertimeTab({ staffId }: { staffId: string }) {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);

    const {
        data: response,
        isLoading,
        isFetching,
    } = useGetAllOvertimeQuery({
        staffId,
        page,
        limit,
    });

    const overtimes = response?.data?.records || [];
    const pagination = response?.data?.pagination;

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
            <div className="space-y-4">
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
        <div className="space-y-4">
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
                            <TableCell>
                                {format(new Date(ot.date), 'PP')}
                            </TableCell>
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
