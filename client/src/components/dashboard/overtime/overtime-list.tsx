'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    useDeleteOvertimeMutation,
    useGetAllOvertimeQuery,
    useExtendOvertimeMutation,
} from '@/redux/features/overtime/overtimeApi';
import { useGetStaffsQuery } from '@/redux/features/staff/staffApi';
import {
    Edit,
    MoreHorizontal,
    Plus,
    Trash,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Clock,
    Filter,
    CheckCircle2,
    XCircle,
    Timer,
    Users,
    Check,
    ChevronsUpDown,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { OvertimeDialog } from './overtime-dialog';
import { IOvertime } from '@/types/overtime.type';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
};

export default function OvertimeList() {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [staffFilter, setStaffFilter] = useState<string>('all');
    const [staffPopoverOpen, setStaffPopoverOpen] = useState(false);

    const { data: staffsData } = useGetStaffsQuery({ limit: 500 });
    const staffList = useMemo(() => {
        const staffs = staffsData?.data || staffsData?.staffs || [];
        return staffs
            .map((s: any) => ({
                _id: s._id,
                name: s.userId?.name || s.name || '',
            }))
            .filter((s: any) => s.name);
    }, [staffsData]);

    const queryParams = useMemo(() => {
        const params: Record<string, any> = {
            page,
            limit,
            year: selectedYear,
        };
        if (selectedMonth !== 'all') params.month = selectedMonth;
        if (statusFilter !== 'all') params.status = statusFilter;
        if (typeFilter !== 'all') params.type = typeFilter;
        if (staffFilter !== 'all') params.staffId = staffFilter;
        return params;
    }, [page, limit, selectedMonth, selectedYear, statusFilter, typeFilter, staffFilter]);

    const {
        data: overtimeData,
        isLoading,
        isFetching,
        isError,
    } = useGetAllOvertimeQuery(queryParams);

    const [deleteOvertime] = useDeleteOvertimeMutation();
    const [extendOvertime] = useExtendOvertimeMutation();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedOvertime, setSelectedOvertime] = useState<IOvertime | null>(
        null,
    );

    const handleExtend = async (id: string, additionalMinutes: number) => {
        try {
            await extendOvertime({ id, additionalMinutes }).unwrap();
            toast.success(`Overtime extended by ${additionalMinutes} minutes`);
        } catch (error) {
            toast.error(
                (error as any)?.data?.message ||
                    (error as Error).message ||
                    'Failed to extend overtime',
            );
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this record?')) return;
        try {
            await deleteOvertime(id).unwrap();
            toast.success('Overtime deleted');
        } catch (error) {
            toast.error((error as Error).message || 'Failed to delete');
        }
    };

    const handleEdit = (ot: IOvertime) => {
        setSelectedOvertime(ot);
        setIsDialogOpen(true);
    };

    const handleCreate = () => {
        setSelectedOvertime(null);
        setIsDialogOpen(true);
    };

    if (isError)
        return <div className="text-red-500">Error loading records.</div>;

    const records = overtimeData?.overtimes || [];
    const totalPages = overtimeData?.totalPages || 1;
    const stats = overtimeData?.stats;

    const selectedStaffName = staffFilter === 'all'
        ? 'All Staff'
        : staffList.find((s: any) => s._id === staffFilter)?.name || 'Unknown';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">
                            Overtime Management
                        </h2>
                        <p className="text-muted-foreground mt-1">
                            Track and manage overtime records across your team.
                        </p>
                    </div>
                    <Button onClick={handleCreate}>
                        <Plus className="h-4 w-4" /> Add Overtime
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-slate-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-slate-500/5 hover:border-slate-500/30">
                    <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-slate-500/10 blur-2xl transition-all duration-300 group-hover:bg-slate-500/20" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/10 text-slate-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-slate-500/20">
                                <Users className="h-5 w-5" />
                            </div>
                            <Badge
                                variant="outline"
                                className="text-[10px] font-medium opacity-70 group-hover:opacity-100"
                            >
                                Total
                            </Badge>
                        </div>
                        {isLoading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <div>
                                <h3 className="text-3xl font-bold tracking-tight text-slate-600 dark:text-slate-300">
                                    {stats?.totalRecords || 0}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {formatDuration(stats?.totalMinutes || 0)} scheduled
                                </p>
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-slate-500/10 font-medium">
                            Total Records
                        </p>
                    </div>
                </div>

                <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-green-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/5 hover:border-green-500/30">
                    <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-green-500/10 blur-2xl transition-all duration-300 group-hover:bg-green-500/20" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-green-500/20">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <Badge
                                variant="outline"
                                className="text-[10px] font-medium bg-green-500/5 text-green-500 border-green-500/20 px-1.5 py-0 h-5"
                            >
                                Approved
                            </Badge>
                        </div>
                        {isLoading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <div>
                                <h3 className="text-3xl font-bold tracking-tight text-green-600 dark:text-green-400">
                                    {stats?.approvedCount || 0}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {formatDuration(stats?.approvedMinutes || 0)} total
                                </p>
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-green-500/10 font-medium">
                            Approved OT
                        </p>
                    </div>
                </div>

                <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-orange-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/5 hover:border-orange-500/30">
                    <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-orange-500/10 blur-2xl transition-all duration-300 group-hover:bg-orange-500/20" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-orange-500/20">
                                <Clock className="h-5 w-5" />
                            </div>
                            <Badge
                                variant="outline"
                                className="text-[10px] font-medium bg-orange-500/5 text-orange-500 border-orange-500/20 px-1.5 py-0 h-5"
                            >
                                Pending
                            </Badge>
                        </div>
                        {isLoading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <div>
                                <h3 className="text-3xl font-bold tracking-tight text-orange-600 dark:text-orange-400">
                                    {stats?.pendingCount || 0}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Awaiting approval
                                </p>
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-orange-500/10 font-medium">
                            Pending OT
                        </p>
                    </div>
                </div>

                <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-red-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-red-500/5 hover:border-red-500/30">
                    <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-red-500/10 blur-2xl transition-all duration-300 group-hover:bg-red-500/20" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-red-500/20">
                                <XCircle className="h-5 w-5" />
                            </div>
                            <Badge
                                variant="outline"
                                className="text-[10px] font-medium bg-red-500/5 text-red-500 border-red-500/20 px-1.5 py-0 h-5"
                            >
                                Rejected
                            </Badge>
                        </div>
                        {isLoading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <div>
                                <h3 className="text-3xl font-bold tracking-tight text-red-600 dark:text-red-400">
                                    {stats?.rejectedCount || 0}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {formatDuration(stats?.totalActualMinutes || 0)} worked
                                </p>
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-red-500/10 font-medium">
                            Rejected OT
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Table Card */}
            <Card className="border-border/60 shadow-md">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <Timer className="h-5 w-5 text-primary" />
                        Overtime Records
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Filters Toolbar */}
                    <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
                        <div className="flex items-center gap-2">
                            <div className="bg-primary/10 p-2 rounded-full">
                                <Filter className="h-4 w-4 text-primary" />
                            </div>
                            <span className="text-sm font-medium">Filters:</span>
                        </div>

                        {/* Month Select */}
                        <Select
                            value={selectedMonth}
                            onValueChange={(v) => {
                                setSelectedMonth(v);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-[140px] h-9 bg-background/60">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Months</SelectItem>
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

                        {/* Year Select */}
                        <Select
                            value={selectedYear.toString()}
                            onValueChange={(v) => {
                                setSelectedYear(parseInt(v));
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-[90px] h-9 bg-background/60">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {YEARS.map((y) => (
                                    <SelectItem key={y} value={y.toString()}>
                                        {y}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Status Filter */}
                        <Select
                            value={statusFilter}
                            onValueChange={(v) => {
                                setStatusFilter(v);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-[130px] h-9 bg-background/60">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Type Filter */}
                        <Select
                            value={typeFilter}
                            onValueChange={(v) => {
                                setTypeFilter(v);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-[140px] h-9 bg-background/60">
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="pre_shift">Pre Shift</SelectItem>
                                <SelectItem value="post_shift">Post Shift</SelectItem>
                                <SelectItem value="weekend">Weekend</SelectItem>
                                <SelectItem value="holiday">Holiday</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Staff Select with Search */}
                        <Popover
                            open={staffPopoverOpen}
                            onOpenChange={setStaffPopoverOpen}
                        >
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={staffPopoverOpen}
                                    className="w-[200px] h-9 justify-between bg-background/60 font-normal"
                                >
                                    <span className="truncate">
                                        {selectedStaffName}
                                    </span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[250px] p-0">
                                <Command>
                                    <CommandInput placeholder="Search staff..." />
                                    <CommandList>
                                        <CommandEmpty>
                                            No staff found.
                                        </CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem
                                                value="all"
                                                onSelect={() => {
                                                    setStaffFilter('all');
                                                    setStaffPopoverOpen(false);
                                                    setPage(1);
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        'mr-2 h-4 w-4',
                                                        staffFilter === 'all'
                                                            ? 'opacity-100'
                                                            : 'opacity-0',
                                                    )}
                                                />
                                                All Staff
                                            </CommandItem>
                                            {staffList.map((staff: any) => (
                                                <CommandItem
                                                    key={staff._id}
                                                    value={staff.name}
                                                    onSelect={() => {
                                                        setStaffFilter(staff._id);
                                                        setStaffPopoverOpen(false);
                                                        setPage(1);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            'mr-2 h-4 w-4',
                                                            staffFilter === staff._id
                                                                ? 'opacity-100'
                                                                : 'opacity-0',
                                                        )}
                                                    />
                                                    {staff.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Table */}
                    <div className="rounded-md border border-border/60 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow className="hover:bg-muted/40 border-b-border/60">
                                    <TableHead className="font-semibold">
                                        Staff
                                    </TableHead>
                                    <TableHead className="font-semibold">
                                        Date
                                    </TableHead>
                                    <TableHead className="font-semibold">
                                        Type
                                    </TableHead>
                                    <TableHead className="font-semibold">
                                        Scheduled
                                    </TableHead>
                                    <TableHead className="font-semibold">
                                        Actual
                                    </TableHead>
                                    <TableHead className="font-semibold">
                                        Status
                                    </TableHead>
                                    <TableHead className="text-right font-semibold">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading || isFetching ? (
                                    Array.from({ length: 8 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell>
                                                <div className="space-y-2">
                                                    <Skeleton className="h-4 w-[120px]" />
                                                    <Skeleton className="h-3 w-[80px]" />
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-4 w-[100px]" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-4 w-[80px]" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-4 w-[60px]" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-4 w-[60px]" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-6 w-[70px] rounded-full" />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Skeleton className="h-8 w-[40px] ml-auto" />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : records.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={7}
                                            className="h-48 text-center"
                                        >
                                            <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                                                <div className="bg-muted/50 p-3 rounded-full">
                                                    <Clock className="h-6 w-6 opacity-30" />
                                                </div>
                                                <p className="text-lg font-medium">
                                                    No overtime records found
                                                </p>
                                                <p className="text-sm">
                                                    Try adjusting your filters or
                                                    add a new overtime record.
                                                </p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    records.map((ot: IOvertime) => (
                                        <TableRow
                                            key={ot._id}
                                            className="hover:bg-muted/20 transition-colors"
                                        >
                                            <TableCell>
                                                <div className="font-medium">
                                                    {ot.staffId?.name || 'N/A'}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {ot.staffId?.staffId}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {format(
                                                    new Date(ot.date),
                                                    'MMM dd, yyyy',
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className="capitalize font-normal"
                                                >
                                                    {ot.type.replace(/_/g, ' ')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {formatDuration(
                                                    ot.durationMinutes,
                                                )}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {ot.actualDurationMinutes
                                                    ? formatDuration(
                                                          ot.actualDurationMinutes,
                                                      )
                                                    : ot.actualStartTime && !ot.endTime
                                                      ? 'In progress'
                                                      : '--'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        'capitalize',
                                                        ot.status === 'approved' &&
                                                            'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400',
                                                        ot.status === 'pending' &&
                                                            'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400',
                                                        ot.status === 'rejected' &&
                                                            'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400',
                                                    )}
                                                >
                                                    {ot.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            <span className="sr-only">
                                                                Open menu
                                                            </span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>
                                                            Actions
                                                        </DropdownMenuLabel>
                                                        {ot.actualStartTime &&
                                                            !ot.endTime && (
                                                                <>
                                                                    <DropdownMenuItem
                                                                        onClick={() =>
                                                                            handleExtend(
                                                                                ot._id,
                                                                                30,
                                                                            )
                                                                        }
                                                                    >
                                                                        <Clock className="h-4 w-4" />
                                                                        Extend by
                                                                        30m
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() =>
                                                                            handleExtend(
                                                                                ot._id,
                                                                                60,
                                                                            )
                                                                        }
                                                                    >
                                                                        <Clock className="h-4 w-4" />
                                                                        Extend by
                                                                        1h
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                handleEdit(ot)
                                                            }
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                handleDelete(
                                                                    ot._id,
                                                                )
                                                            }
                                                            className="text-red-600"
                                                        >
                                                            <Trash className="h-4 w-4" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {overtimeData && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                            <div className="flex items-center gap-2">
                                <p className="text-sm text-muted-foreground">
                                    Showing{' '}
                                    {records.length > 0
                                        ? (page - 1) * limit + 1
                                        : 0}{' '}
                                    to{' '}
                                    {Math.min(
                                        page * limit,
                                        overtimeData?.total || 0,
                                    )}{' '}
                                    of {overtimeData?.total || 0} entries
                                </p>
                                <Select
                                    value={limit.toString()}
                                    onValueChange={(val) => {
                                        setLimit(Number(val));
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger className="h-8 w-[70px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[10, 20, 50, 100].map((pageSize) => (
                                            <SelectItem
                                                key={pageSize}
                                                value={pageSize.toString()}
                                            >
                                                {pageSize}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {totalPages > 1 && (
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

                                    {(() => {
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
                                                Math.min(totalPages, p + 1),
                                            )
                                        }
                                        disabled={
                                            page === totalPages || isFetching
                                        }
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setPage(totalPages)}
                                        disabled={
                                            page === totalPages || isFetching
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

            <OvertimeDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                data={selectedOvertime}
            />
        </div>
    );
}
