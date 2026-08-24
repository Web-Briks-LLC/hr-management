'use client';

import * as React from 'react';
import { useGetStaffEditedImagesQuery } from '@/redux/features/production/productionApi';
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
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    ChevronLeft,
    ChevronRight,
    Search,
    RefreshCw,
    Layers,
    Clock,
    CheckCircle2,
    AlertTriangle,
    FileImage,
    Flame,
    Eye,
    Sparkles,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import type { IStaffEditedImageItem } from '@/types/production.type';

const formatSeconds = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0s';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
};

export function StaffProductionTab({ staffId }: { staffId: string }) {
    const [page, setPage] = React.useState(1);
    const [limit, setLimit] = React.useState(20);
    const [search, setSearch] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('all');
    const [timeFilter, setTimeFilter] = React.useState('all');

    // Selected image for revision / step inspection dialog
    const [selectedImage, setSelectedImage] = React.useState<IStaffEditedImageItem | null>(null);

    const { data, isLoading, isFetching, refetch } = useGetStaffEditedImagesQuery({
        staffId,
        page,
        limit,
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        filterType: timeFilter !== 'all' ? timeFilter : undefined,
    });

    const summary = data?.data?.summary;
    const images = data?.data?.images || [];
    const meta = data?.data?.meta;

    const getStatusBadge = (status: string, isRevision: boolean) => {
        if (isRevision || status === 'in_revision') {
            return (
                <Badge
                    variant="destructive"
                    className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 capitalize font-medium text-[11px] gap-1"
                >
                    <AlertTriangle className="size-3" />
                    In Revision
                </Badge>
            );
        }
        switch (status) {
            case 'completed':
                return (
                    <Badge
                        variant="secondary"
                        className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 capitalize font-medium text-[11px] gap-1"
                    >
                        <CheckCircle2 className="size-3" />
                        QC Approved
                    </Badge>
                );
            case 'pending_qc':
                return (
                    <Badge
                        variant="secondary"
                        className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 capitalize font-medium text-[11px] gap-1"
                    >
                        <Clock className="size-3" />
                        Pending QC
                    </Badge>
                );
            case 'partially_completed':
                return (
                    <Badge
                        variant="outline"
                        className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 capitalize font-medium text-[11px]"
                    >
                        Partially Done
                    </Badge>
                );
            case 'in_progress':
                return (
                    <Badge
                        variant="outline"
                        className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 capitalize font-medium text-[11px]"
                    >
                        In Progress
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="capitalize text-[11px]">
                        {status}
                    </Badge>
                );
        }
    };

    return (
        <div className="space-y-6">
            {/* Top 4 KPI Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl border border-border/70 bg-linear-to-br from-card to-indigo-500/[0.04] shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                            Total Images
                        </span>
                        <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            <Layers className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-bold font-mono text-foreground">
                        {isLoading ? <Skeleton className="h-7 w-16" /> : summary?.totalImagesWorked || 0}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                        Lifetime output records
                    </p>
                </div>

                <div className="p-4 rounded-xl border border-border/70 bg-linear-to-br from-card to-emerald-500/[0.04] shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                            Today&apos;s Done
                        </span>
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <Sparkles className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {isLoading ? <Skeleton className="h-7 w-16" /> : summary?.todayImagesWorked || 0}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                        Completed today
                    </p>
                </div>

                <div className="p-4 rounded-xl border border-border/70 bg-linear-to-br from-card to-blue-500/[0.04] shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                            Avg Velocity
                        </span>
                        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <Clock className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
                        {isLoading ? (
                            <Skeleton className="h-7 w-16" />
                        ) : (
                            formatSeconds(summary?.avgSecondsPerImage || 0)
                        )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                        Per image average
                    </p>
                </div>

                <div className="p-4 rounded-xl border border-border/70 bg-linear-to-br from-card to-purple-500/[0.04] shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                            QC Approval
                        </span>
                        <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            <CheckCircle2 className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
                        {isLoading ? (
                            <Skeleton className="h-7 w-16" />
                        ) : summary?.totalImagesWorked ? (
                            `${Math.round(((summary.qcApprovedCount || 0) / summary.totalImagesWorked) * 100)}%`
                        ) : (
                            '100%'
                        )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                        {summary?.revisionCount || 0} revision(s) flagged
                    </p>
                </div>
            </div>

            {/* Smart Filters & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                    <Input
                        placeholder="Search image or order..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        className="pl-9 h-9 text-xs"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                    <Select
                        value={statusFilter}
                        onValueChange={(val) => {
                            setStatusFilter(val);
                            setPage(1);
                        }}
                    >
                        <SelectTrigger className="h-9 text-xs w-[140px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="completed">QC Approved</SelectItem>
                            <SelectItem value="pending_qc">Pending QC</SelectItem>
                            <SelectItem value="in_revision">In Revision</SelectItem>
                            <SelectItem value="partially_completed">Partially Done</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        value={timeFilter}
                        onValueChange={(val) => {
                            setTimeFilter(val);
                            setPage(1);
                        }}
                    >
                        <SelectTrigger className="h-9 text-xs w-[130px]">
                            <SelectValue placeholder="Time Range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Time</SelectItem>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="week">This Week</SelectItem>
                            <SelectItem value="month">This Month</SelectItem>
                            <SelectItem value="year">This Year</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        className="h-9 text-xs gap-1"
                        disabled={isFetching}
                    >
                        <RefreshCw className={`size-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Refresh</span>
                    </Button>
                </div>
            </div>

            {/* Edited Images Table */}
            <div className="rounded-md border border-border/70 overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/40">
                        <TableRow>
                            <TableHead className="w-[180px]">Image File</TableHead>
                            <TableHead className="w-[200px]">Order & Client</TableHead>
                            <TableHead>Completed Steps</TableHead>
                            <TableHead className="w-[120px]">Time & Shift</TableHead>
                            <TableHead className="w-[130px]">Status</TableHead>
                            <TableHead className="w-[80px] text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={6}>
                                        <Skeleton className="h-8 w-full" />
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : images.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                    <FileImage className="size-8 mx-auto opacity-40 mb-2" />
                                    <p className="text-sm font-medium text-foreground">No image logs found</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        No edited image records matched the selected filters.
                                    </p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            images.map((img) => {
                                const mySteps = (img.completedSteps || []).filter(
                                    (s) => s.completedBy?.staffId === staffId || s.completedBy?._id === staffId
                                );
                                const latestStep = mySteps[mySteps.length - 1] || img.completedSteps?.[0];

                                return (
                                    <TableRow key={img._id} className="hover:bg-muted/30 transition-colors">
                                        {/* Image File */}
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                                                    <FileImage className="size-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="text-xs font-semibold font-mono text-foreground block truncate">
                                                        {img.imageName}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground block">
                                                        {img.updatedAt
                                                            ? format(new Date(img.updatedAt), 'MMM d, yyyy')
                                                            : '-'}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* Order & Client */}
                                        <TableCell>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs font-medium text-foreground truncate block">
                                                        {img.orderId?.orderName || 'Unknown Order'}
                                                    </span>
                                                    {img.orderId?.priority === 'urgent' && (
                                                        <Badge
                                                            variant="destructive"
                                                            className="text-[9px] px-1 py-0 h-4"
                                                        >
                                                            <Flame className="size-2.5 mr-0.5" />
                                                            Urgent
                                                        </Badge>
                                                    )}
                                                </div>
                                                <span className="text-[11px] text-muted-foreground block truncate">
                                                    {img.orderId?.clientId?.name || 'Client'}
                                                </span>
                                            </div>
                                        </TableCell>

                                        {/* Completed Steps */}
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {(img.completedSteps || []).map((step, idx) => (
                                                    <Badge
                                                        key={idx}
                                                        variant="secondary"
                                                        className="text-[10px] bg-primary/10 text-primary border-primary/20 font-medium px-1.5 py-0"
                                                    >
                                                        {step.stepName}
                                                    </Badge>
                                                ))}
                                                {(img.completedSteps || []).length === 0 && (
                                                    <span className="text-xs text-muted-foreground">-</span>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* Time & Shift */}
                                        <TableCell>
                                            <div className="text-xs">
                                                <span className="font-mono text-foreground block">
                                                    {latestStep?.durationSeconds
                                                        ? formatSeconds(latestStep.durationSeconds)
                                                        : '-'}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground block">
                                                    {latestStep?.shiftId?.name || 'General Shift'}
                                                </span>
                                            </div>
                                        </TableCell>

                                        {/* Status */}
                                        <TableCell>
                                            {getStatusBadge(img.status, img.isRevision)}
                                        </TableCell>

                                        {/* Actions / Details */}
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0"
                                                onClick={() => setSelectedImage(img)}
                                                title="View Image Log Details"
                                            >
                                                <Eye className="size-3.5" />
                                                <span className="sr-only">Details</span>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Bar */}
            {meta && meta.total > 0 && (
                <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-6 text-xs text-muted-foreground">
                        <span>
                            Page {meta.page} of {meta.totalPages} ({meta.total} images)
                        </span>
                        <div className="flex items-center gap-2">
                            <span>Per page:</span>
                            <Select
                                value={`${limit}`}
                                onValueChange={(val) => {
                                    setLimit(Number(val));
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="h-7 w-[65px] text-xs">
                                    <SelectValue placeholder={limit} />
                                </SelectTrigger>
                                <SelectContent side="top">
                                    {[10, 20, 30, 50].map((size) => (
                                        <SelectItem key={size} value={`${size}`} className="text-xs">
                                            {size}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex gap-1.5">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1 || isFetching}
                            className="h-7 text-xs px-2"
                        >
                            <ChevronLeft className="size-3.5 mr-1" />
                            Prev
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                            disabled={page >= meta.totalPages || isFetching}
                            className="h-7 text-xs px-2"
                        >
                            Next
                            <ChevronRight className="size-3.5 ml-1" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Image Log Details Dialog */}
            {selectedImage && (
                <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-base">
                                <FileImage className="size-4 text-primary" />
                                {selectedImage.imageName}
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                Order: {selectedImage.orderId?.orderName || 'Order'} • Client:{' '}
                                {selectedImage.orderId?.clientId?.name || 'N/A'}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 pt-2 text-xs">
                            {/* Status & QC Checkpoints */}
                            <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground font-medium">QC Status:</span>
                                    {getStatusBadge(selectedImage.status, selectedImage.isRevision)}
                                </div>
                                {selectedImage.qcApprovedBy && (
                                    <div className="flex items-center justify-between text-muted-foreground">
                                        <span>Approved By:</span>
                                        <span className="text-foreground font-medium">
                                            {selectedImage.qcApprovedBy.name}
                                        </span>
                                    </div>
                                )}
                                {selectedImage.qcApprovedAt && (
                                    <div className="flex items-center justify-between text-muted-foreground">
                                        <span>Approved At:</span>
                                        <span className="text-foreground font-medium">
                                            {format(new Date(selectedImage.qcApprovedAt), 'PPpp')}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Completed Steps Log */}
                            <div>
                                <h5 className="font-semibold text-foreground mb-2 flex items-center gap-1.5">
                                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                                    Completed Steps Log
                                </h5>
                                <div className="space-y-2">
                                    {(selectedImage.completedSteps || []).map((step, idx) => (
                                        <div
                                            key={idx}
                                            className="p-2.5 rounded-lg border border-border/50 bg-background flex items-center justify-between"
                                        >
                                            <div>
                                                <span className="font-semibold text-foreground block">
                                                    {step.stepName}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {step.completedAt
                                                        ? format(new Date(step.completedAt), 'PPpp')
                                                        : '-'}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-mono text-primary font-medium block">
                                                    {step.durationSeconds ? formatSeconds(step.durationSeconds) : '-'}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {step.shiftId?.name || 'Shift'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Revision History (if any) */}
                            {(selectedImage.revisionHistory || []).length > 0 && (
                                <div>
                                    <h5 className="font-semibold text-foreground mb-2 flex items-center gap-1.5 text-red-600 dark:text-red-400">
                                        <AlertTriangle className="size-3.5" />
                                        Revision History ({(selectedImage.revisionHistory || []).length})
                                    </h5>
                                    <div className="space-y-2">
                                        {selectedImage.revisionHistory.map((rev, idx) => (
                                            <div
                                                key={idx}
                                                className="p-2.5 rounded-lg border border-red-500/20 bg-red-500/[0.03] space-y-1"
                                            >
                                                <p className="text-foreground font-medium">
                                                    &ldquo;{rev.instruction}&rdquo;
                                                </p>
                                                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                                    <span>
                                                        Flagged by {rev.requestedBy?.name || 'Supervisor'}
                                                    </span>
                                                    <span>
                                                        {rev.createdAt
                                                            ? formatDistanceToNow(new Date(rev.createdAt), {
                                                                  addSuffix: true,
                                                              })
                                                            : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
