'use client';

import { useState } from 'react';
import {
    useGetAllAttendanceQuery,
    useUpdateAttendanceStatusMutation,
} from '@/redux/features/attendance/attendanceApi';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Loader, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const statusOptions = [
    { value: 'present', label: 'Present', color: 'text-green-600' },
    { value: 'absent', label: 'Absent', color: 'text-red-600' },
    { value: 'late', label: 'Late', color: 'text-yellow-600' },
    { value: 'half_day', label: 'Half Day', color: 'text-orange-600' },
    { value: 'early_exit', label: 'Early Exit', color: 'text-purple-600' },
    { value: 'on_leave', label: 'On Leave', color: 'text-blue-600' },
    { value: 'weekend', label: 'Weekend', color: 'text-gray-600' },
    { value: 'holiday', label: 'Holiday', color: 'text-pink-600' },
];

export default function AttendancePage() {
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        status: '',
        staffId: '',
    });

    const { data, isLoading, isFetching } = useGetAllAttendanceQuery({
        ...filters,
        page,
        limit: 50,
    });

    const [updateStatus] = useUpdateAttendanceStatusMutation();

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            await updateStatus({ id, status: newStatus }).unwrap();
            toast.success('Attendance status updated successfully');
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to update status');
        }
    };

    const handleFilterChange = (key: string, value: string) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
        setPage(1); // Reset to first page when filtering
    };

    console.log('Full API response:', data);
    console.log('Data structure:', data?.data);
    console.log('Records:', data?.data?.records);

    const records = data?.data?.records || [];
    const pagination = data?.data?.pagination;

    return (
        <div className="p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Attendance Management</CardTitle>
                    <CardDescription>
                        View and manage staff attendance records
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">
                                Start Date
                            </label>
                            <Input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) =>
                                    handleFilterChange(
                                        'startDate',
                                        e.target.value,
                                    )
                                }
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">
                                End Date
                            </label>
                            <Input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) =>
                                    handleFilterChange(
                                        'endDate',
                                        e.target.value,
                                    )
                                }
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">
                                Status
                            </label>
                            <Select
                                value={filters.status}
                                onValueChange={(value) =>
                                    handleFilterChange('status', value)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    {statusOptions.map((option) => (
                                        <SelectItem
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-end">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setFilters({
                                        startDate: '',
                                        endDate: '',
                                        status: '',
                                        staffId: '',
                                    });
                                    setPage(1);
                                }}
                            >
                                Clear Filters
                            </Button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="border rounded-lg">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader className="h-8 w-8 animate-spin" />
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Staff ID</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Designation</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Check In</TableHead>
                                        <TableHead>Check Out</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Late (min)</TableHead>
                                        <TableHead>Total (min)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {records.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={9}
                                                className="text-center py-8 text-muted-foreground"
                                            >
                                                No attendance records found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        records.map((record: any) => (
                                            <TableRow key={record._id}>
                                                <TableCell className="font-medium">
                                                    {record.staffId?.staffId ||
                                                        'N/A'}
                                                </TableCell>
                                                <TableCell>
                                                    {record.staffId?.staffId ||
                                                        'N/A'}
                                                </TableCell>
                                                <TableCell>
                                                    {record.staffId
                                                        ?.designation || 'N/A'}
                                                </TableCell>
                                                <TableCell>
                                                    {format(
                                                        new Date(record.date),
                                                        'MMM dd, yyyy',
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {record.checkInAt
                                                        ? format(
                                                              new Date(
                                                                  record.checkInAt,
                                                              ),
                                                              'HH:mm',
                                                          )
                                                        : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {record.checkOutAt
                                                        ? format(
                                                              new Date(
                                                                  record.checkOutAt,
                                                              ),
                                                              'HH:mm',
                                                          )
                                                        : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <Select
                                                        value={record.status}
                                                        onValueChange={(
                                                            value,
                                                        ) =>
                                                            handleStatusChange(
                                                                record._id,
                                                                value,
                                                            )
                                                        }
                                                        disabled={isFetching}
                                                    >
                                                        <SelectTrigger className="w-32">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {statusOptions.map(
                                                                (option) => (
                                                                    <SelectItem
                                                                        key={
                                                                            option.value
                                                                        }
                                                                        value={
                                                                            option.value
                                                                        }
                                                                    >
                                                                        <span
                                                                            className={
                                                                                option.color
                                                                            }
                                                                        >
                                                                            {
                                                                                option.label
                                                                            }
                                                                        </span>
                                                                    </SelectItem>
                                                                ),
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    {record.lateMinutes || 0}
                                                </TableCell>
                                                <TableCell>
                                                    {record.totalMinutes || 0}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </div>

                    {/* Pagination */}
                    {pagination && pagination.pages > 1 && (
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                                Page {pagination.page} of {pagination.pages} (
                                {pagination.total} total records)
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setPage((p) => Math.max(1, p - 1))
                                    }
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
                                    disabled={
                                        page === pagination.pages || isFetching
                                    }
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
