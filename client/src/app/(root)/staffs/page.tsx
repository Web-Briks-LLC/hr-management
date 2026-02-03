'use client';

import { useState, useMemo } from 'react';
import { useGetStaffsQuery } from '@/redux/features/staff/staffApi';
import { useGetAllShiftsQuery } from '@/redux/features/shift/shiftApi';
import { useGetMetadataByTypeQuery } from '@/redux/features/metadata/metadataApi';
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Loader,
    Search,
    Eye,
    User,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Filter,
    X,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useDebounce } from '../../../hooks/use-debounce';

const statusColors: Record<string, string> = {
    active: 'bg-green-500',
    inactive: 'bg-red-500',
    present: 'bg-green-500',
    absent: 'bg-red-500',
    late: 'bg-yellow-500',
    half_day: 'bg-orange-500',
    early_exit: 'bg-purple-500',
    on_leave: 'bg-blue-500',
    weekend: 'bg-gray-500',
    holiday: 'bg-pink-500',
};

const statusLabels: Record<string, string> = {
    active: 'Active',
    inactive: 'Inactive',
    present: 'Present',
    absent: 'Absent',
    late: 'Late',
    half_day: 'Half Day',
    early_exit: 'Early Exit',
    on_leave: 'On Leave',
    weekend: 'Weekend',
    holiday: 'Holiday',
};

interface Staff {
    _id: string;
    staffId: string;
    phone: string;
    department: string;
    designation: string;
    joinDate: string;
    status: string;
    profileCompleted: boolean;
    user?: {
        _id: string;
        name: string;
        email: string;
        image?: string;
        role: string;
    };
    branch?: {
        _id: string;
        name: string;
    };
    todayAttendance?: {
        status: string;
        checkInAt?: string;
        checkOutAt?: string;
        lateMinutes?: number;
    };
    currentShift?: {
        name: string;
        startTime: string;
        endTime: string;
    };
}

export default function StaffsPage() {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 500);

    // Filters
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [designationFilter, setDesignationFilter] = useState('');
    const [shiftFilter, setShiftFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    const queryParams: any = {
        page,
        limit,
        search: debouncedSearch || undefined,
        department: departmentFilter || undefined,
        designation: designationFilter || undefined,
        shiftId: shiftFilter !== 'all' ? shiftFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
    };

    const { data, isLoading, isFetching } = useGetStaffsQuery(queryParams);
    const { data: shiftsData } = useGetAllShiftsQuery({});
    const { data: departmentsData } = useGetMetadataByTypeQuery('department');
    const { data: designationsData } = useGetMetadataByTypeQuery('designation');

    const staffs: Staff[] = data?.staffs || [];
    const meta = data?.meta;
    const perPageOptions = [10, 20, 50, 100];
    const shifts = shiftsData?.shifts || [];

    const handleViewDetails = (staff: Staff) => {
        setSelectedStaff(staff);
        setIsDetailOpen(true);
    };

    const getStatusBadge = (status?: string) => {
        if (!status) {
            return <Badge variant="outline">No Record</Badge>;
        }
        return (
            <Badge
                className={`${statusColors[status] || 'bg-gray-400'} text-white hover:${statusColors[status]}`}
            >
                {statusLabels[status] || status}
            </Badge>
        );
    };

    const clearFilters = () => {
        setSearchQuery('');
        setDepartmentFilter('');
        setDesignationFilter('');
        setShiftFilter('all');
        setStatusFilter('all');
        setPage(1);
    };

    return (
        <div className="p-6 space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle>Staff Management</CardTitle>
                            <CardDescription>
                                View and manage staff members, attendance, and
                                details.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
                        {/* Search */}
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search Name, ID..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setPage(1);
                                }}
                                className="pl-9 h-9 bg-background/60"
                            />
                        </div>

                        {/* Department Filter */}
                        <Select
                            value={departmentFilter}
                            onValueChange={(v) => {
                                setDepartmentFilter(v === 'all' ? '' : v);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-full sm:w-40 h-9 bg-background/60">
                                <SelectValue placeholder="Department" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    All Departments
                                </SelectItem>
                                {departmentsData?.data?.map((dept) => (
                                    <SelectItem
                                        key={dept._id}
                                        value={dept.value}
                                    >
                                        {dept.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Designation Filter */}
                        <Select
                            value={designationFilter}
                            onValueChange={(v) => {
                                setDesignationFilter(v === 'all' ? '' : v);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-full sm:w-40 h-9 bg-background/60">
                                <SelectValue placeholder="Designation" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    All Designations
                                </SelectItem>
                                {designationsData?.data?.map((desig) => (
                                    <SelectItem
                                        key={desig._id}
                                        value={desig.value}
                                    >
                                        {desig.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Shift Filter */}
                        <Select
                            value={shiftFilter}
                            onValueChange={(v) => {
                                setShiftFilter(v);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-full sm:w-36 h-9 bg-background/60">
                                <SelectValue placeholder="Shift" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Shifts</SelectItem>
                                {shifts.map((shift: any) => (
                                    <SelectItem
                                        key={shift._id}
                                        value={shift._id}
                                    >
                                        {shift.name} - {shift.title}
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
                            <SelectTrigger className="w-full sm:w-36 h-9 bg-background/60">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">
                                    Inactive
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        {(searchQuery ||
                            departmentFilter ||
                            designationFilter ||
                            shiftFilter !== 'all' ||
                            statusFilter !== 'all') && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                                className="h-9 px-2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4 mr-1" />
                                Clear
                            </Button>
                        )}
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow>
                                    <TableHead>Staff Name</TableHead>
                                    <TableHead>Staff ID</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Designation</TableHead>
                                    <TableHead>Shift</TableHead>
                                    <TableHead>Today Status</TableHead>
                                    <TableHead>Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading || isFetching ? (
                                    [...Array(limit)].map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell>
                                                <Skeleton className="h-4 w-32" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-4 w-20" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-4 w-24" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-4 w-24" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-8 w-full max-w-[150px]" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-6 w-20 rounded-full" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-8 w-16" />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : staffs.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={7}
                                            className="text-center py-12 text-muted-foreground"
                                        >
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <User className="h-8 w-8 opacity-20" />
                                                <p>
                                                    No staff members found
                                                    matching your criteria.
                                                </p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    staffs.map((staff) => (
                                        <TableRow
                                            key={staff._id}
                                            className="hover:bg-muted/20"
                                        >
                                            <TableCell className="font-medium">
                                                {staff.user?.name || 'N/A'}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                {staff.staffId}
                                            </TableCell>
                                            <TableCell>
                                                {staff.department || 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                {staff.designation || 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                {staff.currentShift ? (
                                                    <div className="flex flex-col text-xs">
                                                        <span className="font-medium">
                                                            {
                                                                staff
                                                                    .currentShift
                                                                    .name
                                                            }
                                                        </span>
                                                        <span className="text-muted-foreground">
                                                            {
                                                                staff
                                                                    .currentShift
                                                                    .startTime
                                                            }{' '}
                                                            -{' '}
                                                            {
                                                                staff
                                                                    .currentShift
                                                                    .endTime
                                                            }
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">
                                                        No Shift
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(
                                                    staff.todayAttendance
                                                        ?.status,
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleViewDetails(staff)
                                                    }
                                                    className="h-8"
                                                >
                                                    <Eye className="h-3.5 w-3.5 mr-1.5" />
                                                    Details
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {meta && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>Rows per page</span>
                                <Select
                                    value={limit.toString()}
                                    onValueChange={(value) => {
                                        setLimit(parseInt(value));
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger className="h-8 w-[70px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {perPageOptions.map((option) => (
                                            <SelectItem
                                                key={option}
                                                value={option.toString()}
                                            >
                                                {option}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <span>
                                    Showing {(page - 1) * limit + 1} to{' '}
                                    {Math.min(page * limit, meta.total)} of{' '}
                                    {meta.total} entries
                                </span>
                            </div>

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

                                <span className="text-sm font-medium px-2">
                                    Page {meta.page} of {meta.totalPage}
                                </span>

                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() =>
                                        setPage((p) =>
                                            Math.min(meta.totalPage, p + 1),
                                        )
                                    }
                                    disabled={
                                        page === meta.totalPage || isFetching
                                    }
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setPage(meta.totalPage)}
                                    disabled={
                                        page === meta.totalPage || isFetching
                                    }
                                >
                                    <ChevronsRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Staff Details Dialog - Keeping existing structure but using selectedStaff */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Staff Details</DialogTitle>
                        <DialogDescription>
                            Complete information about the staff member
                        </DialogDescription>
                    </DialogHeader>
                    {selectedStaff && (
                        <div className="space-y-6">
                            {/* Profile Section */}
                            <div className="flex items-center gap-4">
                                <Avatar className="h-20 w-20">
                                    <AvatarImage
                                        src={selectedStaff.user?.image || ''}
                                    />
                                    <AvatarFallback>
                                        <User className="h-8 w-8" />
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="text-xl font-semibold">
                                        {selectedStaff.user?.name || 'N/A'}
                                    </h3>
                                    <p className="text-muted-foreground">
                                        {selectedStaff.user?.email}
                                    </p>
                                    <Badge variant="outline" className="mt-1">
                                        {selectedStaff.user?.role}
                                    </Badge>
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">
                                        Staff ID
                                    </p>
                                    <p className="font-medium">
                                        {selectedStaff.staffId}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">
                                        Phone
                                    </p>
                                    <p className="font-medium">
                                        {selectedStaff.phone || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">
                                        Department
                                    </p>
                                    <p className="font-medium">
                                        {selectedStaff.department || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">
                                        Designation
                                    </p>
                                    <p className="font-medium">
                                        {selectedStaff.designation || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">
                                        Branch
                                    </p>
                                    <p className="font-medium">
                                        {selectedStaff.branch?.name || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">
                                        Join Date
                                    </p>
                                    <p className="font-medium">
                                        {selectedStaff.joinDate
                                            ? format(
                                                  new Date(
                                                      selectedStaff.joinDate,
                                                  ),
                                                  'PPP',
                                              )
                                            : 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">
                                        Status
                                    </p>
                                    <Badge
                                        variant={
                                            selectedStaff.status === 'active'
                                                ? 'default'
                                                : 'destructive'
                                        }
                                    >
                                        {selectedStaff.status}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">
                                        Profile Completed
                                    </p>
                                    <Badge variant="outline">
                                        {selectedStaff.profileCompleted
                                            ? 'Yes'
                                            : 'No'}
                                    </Badge>
                                </div>
                            </div>

                            {/* Today's Attendance */}
                            <div className="border-t pt-4">
                                <h4 className="font-semibold mb-3">
                                    Today&apos;s Attendance
                                </h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">
                                            Status
                                        </p>
                                        {getStatusBadge(
                                            selectedStaff.todayAttendance
                                                ?.status,
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">
                                            Current Shift
                                        </p>
                                        <p className="font-medium">
                                            {selectedStaff.currentShift
                                                ? `${selectedStaff.currentShift.name} (${selectedStaff.currentShift.startTime} - ${selectedStaff.currentShift.endTime})`
                                                : 'No Shift Assigned'}
                                        </p>
                                    </div>
                                    {selectedStaff.todayAttendance
                                        ?.checkInAt && (
                                        <div>
                                            <p className="text-muted-foreground">
                                                Check In
                                            </p>
                                            <p className="font-medium">
                                                {format(
                                                    new Date(
                                                        selectedStaff
                                                            .todayAttendance
                                                            .checkInAt,
                                                    ),
                                                    'hh:mm aa',
                                                )}
                                            </p>
                                        </div>
                                    )}
                                    {selectedStaff.todayAttendance
                                        ?.checkOutAt && (
                                        <div>
                                            <p className="text-muted-foreground">
                                                Check Out
                                            </p>
                                            <p className="font-medium">
                                                {format(
                                                    new Date(
                                                        selectedStaff
                                                            .todayAttendance
                                                            .checkOutAt,
                                                    ),
                                                    'hh:mm aa',
                                                )}
                                            </p>
                                        </div>
                                    )}
                                    {(selectedStaff.todayAttendance
                                        ?.lateMinutes ?? 0) > 0 && (
                                        <div>
                                            <p className="text-muted-foreground">
                                                Late By
                                            </p>
                                            <p className="font-medium text-yellow-600">
                                                {
                                                    selectedStaff
                                                        .todayAttendance
                                                        ?.lateMinutes
                                                }{' '}
                                                minutes
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
