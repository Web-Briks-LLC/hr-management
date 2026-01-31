'use client';

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import {
    Briefcase,
    Trash2,
    Users,
    FileText,
    Download,
    Eye,
    UserCheck,
    UserX,
    Clock,
    CheckCircle,
    Loader,
    Search,
    X,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    useGetAllApplicationsQuery,
    useDeleteApplicationMutation,
    useGetApplicationsStatsQuery,
    useUpdateApplicationStatusMutation,
    useGetAllPositionsQuery,
} from '@/redux/features/career/careerApi';
import { ApplicationDetailsModal } from '@/components/careers/ApplicationDetailsModal';
import type { IJobApplication, ApplicationStatus } from '@/types/career.type';
import {
    APPLICATION_STATUS_LABELS,
    APPLICATION_STATUS_COLORS,
} from '@/types/career.type';
import { toast } from 'sonner';

// Custom hook for debounced value
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

// Inline status select component
function StatusSelect({
    application,
    onStatusChange,
}: {
    application: IJobApplication;
    onStatusChange: (id: string, status: ApplicationStatus) => Promise<void>;
}) {
    const [isUpdating, setIsUpdating] = useState(false);

    const handleChange = async (newStatus: string) => {
        if (newStatus === application.status) return;
        setIsUpdating(true);
        try {
            await onStatusChange(
                application._id,
                newStatus as ApplicationStatus,
            );
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="relative">
            <Select
                value={application.status}
                onValueChange={handleChange}
                disabled={isUpdating}
            >
                <SelectTrigger
                    className={`w-[130px] h-8 text-xs ${
                        APPLICATION_STATUS_COLORS[application.status]
                    }`}
                >
                    {isUpdating ? (
                        <Loader className="h-3 w-3 animate-spin" />
                    ) : (
                        <SelectValue />
                    )}
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="pending">
                        <span className="flex items-center gap-2">
                            <Clock className="h-3 w-3" /> Pending
                        </span>
                    </SelectItem>
                    <SelectItem value="reviewed">
                        <span className="flex items-center gap-2">
                            <FileText className="h-3 w-3" /> Reviewed
                        </span>
                    </SelectItem>
                    <SelectItem value="shortlisted">
                        <span className="flex items-center gap-2">
                            <UserCheck className="h-3 w-3 text-green-500" />{' '}
                            Shortlisted
                        </span>
                    </SelectItem>
                    <SelectItem value="rejected">
                        <span className="flex items-center gap-2">
                            <UserX className="h-3 w-3 text-red-500" /> Rejected
                        </span>
                    </SelectItem>
                    <SelectItem value="hired">
                        <span className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-purple-500" />{' '}
                            Hired
                        </span>
                    </SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}

// Pagination component
function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    totalItems,
    itemsPerPage,
}: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalItems: number;
    itemsPerPage: number;
}) {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    // Generate page numbers to display
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 3; i <= totalPages; i++)
                    pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++)
                    pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    };

    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{startItem}</span> to{' '}
                <span className="font-medium">{endItem}</span> of{' '}
                <span className="font-medium">{totalItems}</span> applications
            </div>
            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                >
                    <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                {getPageNumbers().map((page, index) =>
                    typeof page === 'number' ? (
                        <Button
                            key={index}
                            variant={
                                currentPage === page ? 'default' : 'outline'
                            }
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onPageChange(page)}
                        >
                            {page}
                        </Button>
                    ) : (
                        <span
                            key={index}
                            className="px-2 text-muted-foreground"
                        >
                            {page}
                        </span>
                    ),
                )}

                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                >
                    <ChevronsRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

export default function CareersPage() {
    // Filter states
    const [searchInput, setSearchInput] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [experienceFilter, setExperienceFilter] = useState<string>('all');
    const [positionFilter, setPositionFilter] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    // Debounce search input
    const debouncedSearch = useDebounce(searchInput, 300);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, statusFilter, experienceFilter, positionFilter]);

    // Modals state
    const [selectedApplication, setSelectedApplication] =
        useState<IJobApplication | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

    // Build query params
    const queryParams = useMemo(() => {
        const params: Record<string, unknown> = {
            page: currentPage,
            limit: pageSize,
        };
        if (debouncedSearch) params.search = debouncedSearch;
        if (statusFilter !== 'all')
            params.status = statusFilter as ApplicationStatus;
        if (experienceFilter !== 'all')
            params.hasExperience = experienceFilter === 'experienced';
        if (positionFilter !== 'all') params.jobPosition = positionFilter;
        return params;
    }, [
        currentPage,
        pageSize,
        debouncedSearch,
        statusFilter,
        experienceFilter,
        positionFilter,
    ]);

    // API queries
    const {
        data: applicationsData,
        isLoading: applicationsLoading,
        isFetching,
    } = useGetAllApplicationsQuery(queryParams);
    const { data: statsData } = useGetApplicationsStatsQuery();
    const { data: positionsData } = useGetAllPositionsQuery();

    // Mutations
    const [deleteApplication] = useDeleteApplicationMutation();
    const [updateStatus] = useUpdateApplicationStatusMutation();

    const applications = applicationsData?.data || [];
    const meta = applicationsData?.meta;
    const stats = statsData?.data;
    const positions = positionsData?.data || [];

    const totalApplications = stats
        ? Object.values(stats.byStatus).reduce(
              (a: number, b: number) => a + b,
              0,
          )
        : 0;

    // Check if any filters are active
    const hasActiveFilters =
        debouncedSearch ||
        statusFilter !== 'all' ||
        experienceFilter !== 'all' ||
        positionFilter !== 'all';

    const clearAllFilters = () => {
        setSearchInput('');
        setStatusFilter('all');
        setExperienceFilter('all');
        setPositionFilter('all');
        setCurrentPage(1);
    };

    const handleStatusChange = async (
        id: string,
        status: ApplicationStatus,
    ) => {
        try {
            await updateStatus({ id, status }).unwrap();
            toast.success(
                `Status updated to ${APPLICATION_STATUS_LABELS[status]}`,
            );
        } catch {
            toast.error('Failed to update status');
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteApplication(deleteTarget).unwrap();
            toast.success('Application deleted successfully');
        } catch {
            toast.error('Failed to delete application');
        } finally {
            setDeleteTarget(null);
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Briefcase className="h-6 w-6" />
                        Careers
                    </h1>
                    <p className="text-muted-foreground">
                        Manage and review job applications
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-blue-500" />
                            <div>
                                <div className="text-2xl font-bold">
                                    {totalApplications}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Total
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-yellow-500" />
                            <div>
                                <div className="text-2xl font-bold">
                                    {stats?.byStatus.pending || 0}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Pending
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-500" />
                            <div>
                                <div className="text-2xl font-bold">
                                    {stats?.byStatus.reviewed || 0}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Reviewed
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                            <UserCheck className="h-5 w-5 text-green-500" />
                            <div>
                                <div className="text-2xl font-bold">
                                    {stats?.byStatus.shortlisted || 0}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Shortlisted
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-purple-500" />
                            <div>
                                <div className="text-2xl font-bold">
                                    {stats?.byStatus.hired || 0}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Hired
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Filters */}
            <Card>
                <CardContent className="py-4">
                    <div className="flex flex-col gap-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, email, or phone..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="pl-10 pr-10"
                            />
                            {searchInput && (
                                <button
                                    onClick={() => setSearchInput('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* Filters Row */}
                        <div className="flex items-center gap-3 flex-wrap">
                            <Select
                                value={statusFilter}
                                onValueChange={setStatusFilter}
                            >
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Status
                                    </SelectItem>
                                    <SelectItem value="pending">
                                        Pending
                                    </SelectItem>
                                    <SelectItem value="reviewed">
                                        Reviewed
                                    </SelectItem>
                                    <SelectItem value="shortlisted">
                                        Shortlisted
                                    </SelectItem>
                                    <SelectItem value="rejected">
                                        Rejected
                                    </SelectItem>
                                    <SelectItem value="hired">Hired</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={experienceFilter}
                                onValueChange={setExperienceFilter}
                            >
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="Experience" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Experience
                                    </SelectItem>
                                    <SelectItem value="experienced">
                                        Experienced
                                    </SelectItem>
                                    <SelectItem value="fresher">
                                        Fresher
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={positionFilter}
                                onValueChange={setPositionFilter}
                            >
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Position" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Positions
                                    </SelectItem>
                                    {positions.map((pos) => (
                                        <SelectItem
                                            key={pos._id}
                                            value={pos._id}
                                        >
                                            {pos.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={String(pageSize)}
                                onValueChange={(v) => {
                                    setPageSize(Number(v));
                                    setCurrentPage(1);
                                }}
                            >
                                <SelectTrigger className="w-[120px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">
                                        10 / page
                                    </SelectItem>
                                    <SelectItem value="20">
                                        20 / page
                                    </SelectItem>
                                    <SelectItem value="50">
                                        50 / page
                                    </SelectItem>
                                    <SelectItem value="100">
                                        100 / page
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            {hasActiveFilters && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearAllFilters}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-4 w-4 mr-1" />
                                    Clear filters
                                </Button>
                            )}

                            {isFetching && (
                                <div className="ml-auto flex items-center gap-2 text-muted-foreground">
                                    <Loader className="h-4 w-4 animate-spin" />
                                    <span className="text-sm">Loading...</span>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Applications Table */}
            <Card>
                <CardContent className="p-0">
                    {applicationsLoading ? (
                        <div className="p-6 space-y-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Skeleton key={i} className="h-16 w-full" />
                            ))}
                        </div>
                    ) : applications.length === 0 ? (
                        <div className="p-12 text-center">
                            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                            <h3 className="text-lg font-medium">
                                {hasActiveFilters
                                    ? 'No applications found'
                                    : 'No applications yet'}
                            </h3>
                            <p className="text-muted-foreground text-sm mt-1">
                                {hasActiveFilters
                                    ? 'Try adjusting your search or filter criteria'
                                    : 'Applications will appear here when candidates apply'}
                            </p>
                            {hasActiveFilters && (
                                <Button
                                    variant="outline"
                                    className="mt-4"
                                    onClick={clearAllFilters}
                                >
                                    Clear all filters
                                </Button>
                            )}
                        </div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Applicant</TableHead>
                                        <TableHead>Position</TableHead>
                                        <TableHead>Experience</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Applied</TableHead>
                                        <TableHead className="text-right">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {applications.map((app) => (
                                        <TableRow key={app._id}>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">
                                                        {app.firstName}{' '}
                                                        {app.lastName}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {app.email}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    {app.jobPosition?.title ||
                                                        'Unknown'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {app.hasExperience
                                                        ? 'Experienced'
                                                        : 'Fresher'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <StatusSelect
                                                    application={app}
                                                    onStatusChange={
                                                        handleStatusChange
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {format(
                                                    new Date(app.createdAt),
                                                    'MMM dd, yyyy',
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            setSelectedApplication(
                                                                app,
                                                            )
                                                        }
                                                        title="View Details"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        asChild
                                                        title="Download CV"
                                                    >
                                                        <a
                                                            href={
                                                                app.cvFile?.url
                                                            }
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            <Download className="h-4 w-4" />
                                                        </a>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            setDeleteTarget(
                                                                app._id,
                                                            )
                                                        }
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {/* Pagination */}
                            {meta && (
                                <Pagination
                                    currentPage={meta.page}
                                    totalPages={meta.totalPages}
                                    totalItems={meta.total}
                                    itemsPerPage={pageSize}
                                    onPageChange={setCurrentPage}
                                />
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Application Details Modal */}
            {selectedApplication && (
                <ApplicationDetailsModal
                    application={selectedApplication}
                    onClose={() => setSelectedApplication(null)}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete the application.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
