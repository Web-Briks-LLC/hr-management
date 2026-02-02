'use client';

import { useState, useEffect } from 'react';
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
import {
    ChevronLeft,
    ChevronRight,
    Search,
    ChevronsLeft,
    ChevronsRight,
    Calendar as CalendarIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfYear,
    endOfYear,
} from 'date-fns';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { Skeleton } from '@/components/ui/skeleton';

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

const FILTER_TYPES = {
    ALL: 'all',
    TODAY: 'today',
    MONTHLY: 'monthly',
    YEARLY: 'yearly',
    CUSTOM: 'custom',
};

const MONTHS = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
];

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
const perPageOptions = [10, 20, 50, 100];

export default function AttendancePage() {
    // UI State
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [searchTerm, setSearchTerm] = useState('');

    // Filter State
    const [filterType, setFilterType] = useState(FILTER_TYPES.ALL);
    const [selectedMonth, setSelectedMonth] = useState(
        new Date().getMonth() + 1,
    );
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [dateRange, setDateRange] = useState<DateRange | undefined>(
        undefined,
    );
    const [statusFilter, setStatusFilter] = useState('');

    // Computed Filters for API
    const [apiFilters, setApiFilters] = useState({
        startDate: '',
        endDate: '',
        search: '',
        status: '',
    });

    // Update API filters when UI state changes
    useEffect(() => {
        let start = '';
        let end = '';

        const now = new Date();

        switch (filterType) {
            case FILTER_TYPES.TODAY:
                start = format(now, 'yyyy-MM-dd');
                end = format(now, 'yyyy-MM-dd');
                break;
            case FILTER_TYPES.MONTHLY:
                const mStart = startOfMonth(
                    new Date(selectedYear, selectedMonth - 1),
                );
                const mEnd = endOfMonth(
                    new Date(selectedYear, selectedMonth - 1),
                );
                start = format(mStart, 'yyyy-MM-dd');
                end = format(mEnd, 'yyyy-MM-dd');
                break;
            case FILTER_TYPES.YEARLY:
                const yStart = startOfYear(new Date(selectedYear, 0));
                const yEnd = endOfYear(new Date(selectedYear, 0));
                start = format(yStart, 'yyyy-MM-dd');
                end = format(yEnd, 'yyyy-MM-dd');
                break;
            case FILTER_TYPES.CUSTOM:
                if (dateRange && dateRange.from)
                    start = format(dateRange.from, 'yyyy-MM-dd');
                if (dateRange && dateRange.to)
                    end = format(dateRange.to, 'yyyy-MM-dd');
                break;
        }

        // Debounce search
        const timeoutId = setTimeout(() => {
            setApiFilters({
                startDate: start,
                endDate: end,
                search: searchTerm,
                status: statusFilter === 'all' ? '' : statusFilter,
            });
            setPage(1); // Reset page on filter change
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [
        filterType,
        selectedMonth,
        selectedYear,
        dateRange,
        searchTerm,
        statusFilter,
    ]);

    const { data, isLoading, isFetching } = useGetAllAttendanceQuery({
        ...apiFilters,
        page,
        limit,
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
                <CardContent className="space-y-6">
                    {/* Filters Toolbar */}
                    <div className="flex flex-col gap-4">
                        {/* Top Row: Search & Type */}
                        <div className="flex flex-col xl:flex-row gap-4 justify-between">
                            <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
                                <div className="relative w-full sm:w-72">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by staff name..."
                                        className="pl-8"
                                        value={searchTerm}
                                        onChange={(e) =>
                                            setSearchTerm(e.target.value)
                                        }
                                    />
                                </div>

                                <Select
                                    value={limit.toString()}
                                    onValueChange={(value) => {
                                        setLimit(parseInt(value));
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger className="w-[100px] whitespace-nowrap">
                                        <SelectValue placeholder="Limit" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {perPageOptions.map((option) => (
                                            <SelectItem
                                                key={option}
                                                value={option.toString()}
                                            >
                                                {option} / page
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex gap-2 items-center flex-wrap">
                                <Select
                                    value={filterType}
                                    onValueChange={setFilterType}
                                >
                                    <SelectTrigger className="w-[130px]">
                                        <SelectValue placeholder="Filter Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={FILTER_TYPES.ALL}>
                                            All Time
                                        </SelectItem>
                                        <SelectItem value={FILTER_TYPES.TODAY}>
                                            Today
                                        </SelectItem>
                                        <SelectItem
                                            value={FILTER_TYPES.MONTHLY}
                                        >
                                            Monthly
                                        </SelectItem>
                                        <SelectItem value={FILTER_TYPES.YEARLY}>
                                            Yearly
                                        </SelectItem>
                                        <SelectItem value={FILTER_TYPES.CUSTOM}>
                                            Custom Range
                                        </SelectItem>
                                    </SelectContent>
                                </Select>

                                {filterType === FILTER_TYPES.MONTHLY && (
                                    <>
                                        <Select
                                            value={selectedMonth.toString()}
                                            onValueChange={(v) =>
                                                setSelectedMonth(Number(v))
                                            }
                                        >
                                            <SelectTrigger className="w-[120px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {MONTHS.map((m) => (
                                                    <SelectItem
                                                        key={m.value}
                                                        value={m.value.toString()}
                                                    >
                                                        {m.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select
                                            value={selectedYear.toString()}
                                            onValueChange={(v) =>
                                                setSelectedYear(Number(v))
                                            }
                                        >
                                            <SelectTrigger className="w-[100px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {YEARS.map((y) => (
                                                    <SelectItem
                                                        key={y}
                                                        value={y.toString()}
                                                    >
                                                        {y}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </>
                                )}

                                {filterType === FILTER_TYPES.YEARLY && (
                                    <Select
                                        value={selectedYear.toString()}
                                        onValueChange={(v) =>
                                            setSelectedYear(Number(v))
                                        }
                                    >
                                        <SelectTrigger className="w-[100px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {YEARS.map((y) => (
                                                <SelectItem
                                                    key={y}
                                                    value={y.toString()}
                                                >
                                                    {y}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}

                                {filterType === FILTER_TYPES.CUSTOM && (
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                id="date"
                                                variant={'outline'}
                                                className={cn(
                                                    'w-[240px] justify-start text-left font-normal',
                                                    !dateRange?.from &&
                                                        'text-muted-foreground',
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {dateRange?.from ? (
                                                    dateRange.to ? (
                                                        <>
                                                            {format(
                                                                dateRange.from,
                                                                'LLL dd, y',
                                                            )}{' '}
                                                            -{' '}
                                                            {format(
                                                                dateRange.to,
                                                                'LLL dd, y',
                                                            )}
                                                        </>
                                                    ) : (
                                                        format(
                                                            dateRange.from,
                                                            'LLL dd, y',
                                                        )
                                                    )
                                                ) : (
                                                    <span>Pick a date</span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            className="w-auto p-0"
                                            align="end"
                                        >
                                            <Calendar
                                                initialFocus
                                                mode="range"
                                                defaultMonth={dateRange?.from}
                                                selected={dateRange}
                                                onSelect={setDateRange}
                                                numberOfMonths={2}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                )}

                                <Select
                                    value={statusFilter}
                                    onValueChange={setStatusFilter}
                                >
                                    <SelectTrigger className="w-[130px]">
                                        <SelectValue placeholder="All Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All Status
                                        </SelectItem>
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

                                {(searchTerm ||
                                    statusFilter ||
                                    filterType !== FILTER_TYPES.ALL) && (
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            setSearchTerm('');
                                            setFilterType(FILTER_TYPES.ALL);
                                            setStatusFilter('');
                                            setDateRange({
                                                from: undefined,
                                                to: undefined,
                                            });
                                        }}
                                        className="h-10 px-3"
                                    >
                                        Clear
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead>Staff Name</TableHead>
                                    <TableHead>Designation</TableHead>
                                    <TableHead>Shift</TableHead>
                                    <TableHead>Branch</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Check In</TableHead>
                                    <TableHead>Check Out</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">
                                        Late (min)
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Total (min)
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading || isFetching ? (
                                    Array.from({ length: 10 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell>
                                                <div className="space-y-2">
                                                    <Skeleton className="h-4 w-[150px]" />
                                                    <Skeleton className="h-3 w-[100px]" />
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-4 w-[100px]" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-4 w-[80px]" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-4 w-[80px]" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-4 w-[100px]" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-4 w-[80px]" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-4 w-[80px]" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-8 w-[100px]" />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Skeleton className="h-4 w-[50px] ml-auto" />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Skeleton className="h-4 w-[60px] ml-auto" />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : records.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={10}
                                            className="text-center py-12 text-muted-foreground"
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <Search className="h-8 w-8 opacity-20" />
                                                <p>
                                                    No attendance records found
                                                </p>
                                                <p className="text-xs">
                                                    Try adjusting your filters
                                                </p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    records.map((record: any) => (
                                        <TableRow
                                            key={record._id}
                                            className="hover:bg-muted/20"
                                        >
                                            <TableCell className="font-medium">
                                                <div>
                                                    {record.staffId?.name ||
                                                        'Unknown Staff'}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {record.staffId?.staffId ||
                                                        'N/A'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {record.staffId?.designation ||
                                                    '-'}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {record.shiftId?.name || '-'}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {record.staffId?.branchId
                                                    ?.name || '-'}
                                            </TableCell>
                                            <TableCell>
                                                {format(
                                                    new Date(record.date),
                                                    'MMM dd, yyyy',
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm font-mono text-muted-foreground">
                                                {record.checkInAt
                                                    ? format(
                                                          new Date(
                                                              record.checkInAt,
                                                          ),
                                                          'hh:mm a',
                                                      )
                                                    : '-'}
                                            </TableCell>
                                            <TableCell className="text-sm font-mono text-muted-foreground">
                                                {record.checkOutAt
                                                    ? format(
                                                          new Date(
                                                              record.checkOutAt,
                                                          ),
                                                          'hh:mm a',
                                                      )
                                                    : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={record.status}
                                                    onValueChange={(value) =>
                                                        handleStatusChange(
                                                            record._id,
                                                            value,
                                                        )
                                                    }
                                                    disabled={isFetching}
                                                >
                                                    <SelectTrigger
                                                        className={cn(
                                                            'h-8 text-xs font-medium w-[110px]',
                                                            statusOptions.find(
                                                                (o) =>
                                                                    o.value ===
                                                                    record.status,
                                                            )?.color,
                                                        )}
                                                    >
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
                                            <TableCell className="text-right font-mono text-orange-600/80">
                                                {record.lateMinutes > 0
                                                    ? `${record.lateMinutes}m`
                                                    : '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-medium">
                                                {record.totalMinutes > 0
                                                    ? `${Math.floor(record.totalMinutes / 60)}h ${record.totalMinutes % 60}m`
                                                    : '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {pagination && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                            <p className="text-sm text-muted-foreground">
                                Showing {(page - 1) * limit + 1} to{' '}
                                {Math.min(page * limit, pagination.total)} of{' '}
                                {pagination.total} entries
                            </p>

                            {pagination.pages > 1 && (
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setPage(1)}
                                        disabled={page === 1 || isFetching}
                                    >
                                        <ChevronsLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() =>
                                            setPage((p) => Math.max(1, p - 1))
                                        }
                                        disabled={page === 1 || isFetching}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>

                                    {/* Page Numbers Logic */}
                                    {(() => {
                                        const totalPages = pagination.pages;
                                        const pageNumbers: (number | string)[] =
                                            [];

                                        if (totalPages <= 7) {
                                            for (
                                                let i = 1;
                                                i <= totalPages;
                                                i++
                                            )
                                                pageNumbers.push(i);
                                        } else {
                                            if (page <= 3) {
                                                pageNumbers.push(
                                                    1,
                                                    2,
                                                    3,
                                                    4,
                                                    '...',
                                                    totalPages,
                                                );
                                            } else if (page >= totalPages - 2) {
                                                pageNumbers.push(
                                                    1,
                                                    '...',
                                                    totalPages - 3,
                                                    totalPages - 2,
                                                    totalPages - 1,
                                                    totalPages,
                                                );
                                            } else {
                                                pageNumbers.push(
                                                    1,
                                                    '...',
                                                    page - 1,
                                                    page,
                                                    page + 1,
                                                    '...',
                                                    totalPages,
                                                );
                                            }
                                        }

                                        return pageNumbers.map((num, idx) =>
                                            num === '...' ? (
                                                <span
                                                    key={`ellipsis-${idx}`}
                                                    className="px-2 text-muted-foreground"
                                                >
                                                    ...
                                                </span>
                                            ) : (
                                                <Button
                                                    key={num}
                                                    variant={
                                                        page === num
                                                            ? 'default'
                                                            : 'outline'
                                                    }
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() =>
                                                        setPage(num as number)
                                                    }
                                                    disabled={isFetching}
                                                >
                                                    {num}
                                                </Button>
                                            ),
                                        );
                                    })()}

                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() =>
                                            setPage((p) =>
                                                Math.min(
                                                    pagination.pages,
                                                    p + 1,
                                                ),
                                            )
                                        }
                                        disabled={
                                            page === pagination.pages ||
                                            isFetching
                                        }
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() =>
                                            setPage(pagination.pages)
                                        }
                                        disabled={
                                            page === pagination.pages ||
                                            isFetching
                                        }
                                    >
                                        <ChevronsRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
