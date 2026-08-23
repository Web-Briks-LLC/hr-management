'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useGetStaffPerformanceAnalyticsQuery } from '@/redux/features/production/productionApi';
import {
    Award,
    TrendingUp,
    Clock,
    Layers,
    Users,
    Download,
    Calendar,
    Sparkles,
    CheckCircle2,
    Zap,
    Filter,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function StaffPerformanceAnalytics() {
    const [filterType, setFilterType] = useState<string>('month');
    const [page, setPage] = useState<number>(1);
    const [limit, setLimit] = useState<number>(10);

    const { data: analyticsData, isLoading } = useGetStaffPerformanceAnalyticsQuery({
        filterType,
    });

    const data = analyticsData?.data;
    const summary = data?.summary || {
        totalImages: 0,
        totalSessions: 0,
        totalHours: 0,
        activeStaffCount: 0,
    };
    const allStaff = data?.staffPerformance || [];
    const stepBreakdown = data?.stepBreakdown || [];
    const shiftList = data?.shiftPerformance || [];

    // Paginated Staff List
    const totalPages = Math.max(1, Math.ceil(allStaff.length / limit));
    const safePage = Math.min(page, totalPages);
    const paginatedStaff = useMemo(() => {
        const start = (safePage - 1) * limit;
        return allStaff.slice(start, start + limit);
    }, [allStaff, safePage, limit]);

    // Export to CSV for HR appraisal/salary review
    const handleExportCSV = () => {
        if (allStaff.length === 0) {
            toast.error('No staff analytics data to export');
            return;
        }

        const headers = [
            'Staff ID',
            'Staff Name',
            'Designation',
            'Total Sessions',
            'Total Images Completed',
            'Total Work Hours',
            'Avg Sec Per Image',
        ];

        const rows = allStaff.map((s) => [
            s.employeeId,
            `"${s.staffName}"`,
            `"${s.designation}"`,
            s.totalSessions,
            s.totalImages,
            s.totalHours,
            s.avgSecondsPerImage,
        ]);

        const csvContent =
            'data:text/csv;charset=utf-8,' +
            [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute(
            'download',
            `production_staff_performance_${filterType}_${format(new Date(), 'yyyyMMdd')}.csv`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success('Performance report exported to CSV');
    };

    return (
        <div className="space-y-6">
            {/* Filter Toolbar (Matching Orders/Earnings style) */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary/10 p-2 rounded-full">
                            <Filter className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm font-medium">Time Period:</span>
                    </div>

                    <div className="w-[150px]">
                        <Select
                            value={filterType}
                            onValueChange={(v) => {
                                setFilterType(v);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="h-9 text-xs bg-background/60">
                                <SelectValue placeholder="Time Period" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="week">This Week</SelectItem>
                                <SelectItem value="month">This Month</SelectItem>
                                <SelectItem value="year">This Year</SelectItem>
                                <SelectItem value="all">All Time</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCSV}
                    className="h-9 text-xs font-semibold border-border/80 shadow-xs"
                >
                    <Download className="h-3.5 w-3.5" />
                    Export CSV
                </Button>
            </div>

            {/* KPI Summary Cards (Matching Orders/Earnings Glassmorphism Design) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Images Processed */}
                <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-primary/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30">
                    <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-primary/10 blur-2xl transition-all duration-300 group-hover:bg-primary/20" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/20">
                                <Layers className="h-5 w-5" />
                            </div>
                            <Badge variant="outline" className="text-[10px] font-medium opacity-70">
                                Output
                            </Badge>
                        </div>
                        <h3 className="text-3xl font-bold tracking-tight text-foreground">
                            {isLoading ? <Skeleton className="h-8 w-20" /> : summary.totalImages.toLocaleString()}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-primary/10 font-medium">
                            Total Images Processed
                        </p>
                    </div>
                </div>

                {/* Total Work Sessions */}
                <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-emerald-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/5 hover:border-emerald-500/30">
                    <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-emerald-500/10 blur-2xl transition-all duration-300 group-hover:bg-emerald-500/20" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-all duration-300 group-hover:scale-110 group-hover:bg-emerald-500/20">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <Badge variant="outline" className="text-[10px] font-medium bg-emerald-500/5 text-emerald-500 border-emerald-500/20">
                                Batches
                            </Badge>
                        </div>
                        <h3 className="text-3xl font-bold tracking-tight text-foreground">
                            {isLoading ? <Skeleton className="h-8 w-16" /> : summary.totalSessions.toLocaleString()}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-emerald-500/10 font-medium">
                            Completed Work Sessions
                        </p>
                    </div>
                </div>

                {/* Total Editor Hours */}
                <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-amber-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/5 hover:border-amber-500/30">
                    <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-amber-500/10 blur-2xl transition-all duration-300 group-hover:bg-amber-500/20" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 transition-all duration-300 group-hover:scale-110 group-hover:bg-amber-500/20">
                                <Clock className="h-5 w-5" />
                            </div>
                            <Badge variant="outline" className="text-[10px] font-medium bg-amber-500/5 text-amber-500 border-amber-500/20">
                                Time
                            </Badge>
                        </div>
                        <h3 className="text-3xl font-bold tracking-tight text-foreground">
                            {isLoading ? <Skeleton className="h-8 w-16" /> : `${summary.totalHours} hrs`}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-amber-500/10 font-medium">
                            Total Editor Working Hours
                        </p>
                    </div>
                </div>

                {/* Active Editors */}
                <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-blue-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-500/30">
                    <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-blue-500/10 blur-2xl transition-all duration-300 group-hover:bg-blue-500/20" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-500/20">
                                <Users className="h-5 w-5" />
                            </div>
                            <Badge variant="outline" className="text-[10px] font-medium opacity-70">
                                Staff
                            </Badge>
                        </div>
                        <h3 className="text-3xl font-bold tracking-tight text-foreground">
                            {isLoading ? <Skeleton className="h-8 w-12" /> : summary.activeStaffCount}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-blue-500/10 font-medium">
                            Active Photo Editors
                        </p>
                    </div>
                </div>
            </div>

            {/* Staff Leaderboard & Breakdown Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Staff Output Table (2 cols) */}
                <Card className="lg:col-span-2 border-border/60 shadow-xs">
                    <CardHeader className="pb-3 border-b border-border/60">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            Photo Editor Leaderboard
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Individual performance scorecard, output volume, and processing efficiency.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow className="text-xs border-b-border/60">
                                    <TableHead className="font-bold">Staff Member</TableHead>
                                    <TableHead className="font-bold">Designation</TableHead>
                                    <TableHead className="font-bold text-center">Sessions</TableHead>
                                    <TableHead className="font-bold text-right">Images Done</TableHead>
                                    <TableHead className="font-bold text-right">Total Hours</TableHead>
                                    <TableHead className="font-bold text-right">Avg Speed</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    [...Array(5)].map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : paginatedStaff.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-xs">
                                            No staff performance records found for this timeframe.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedStaff.map((staff, idx) => (
                                        <TableRow key={staff.staffId} className="hover:bg-muted/20 text-xs py-3">
                                            <TableCell className="font-bold">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold">
                                                        {(safePage - 1) * limit + idx + 1}
                                                    </span>
                                                    <div>
                                                        <p className="text-foreground">{staff.staffName}</p>
                                                        <p className="text-[10px] text-muted-foreground font-mono">
                                                            {staff.employeeId}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {staff.designation}
                                            </TableCell>
                                            <TableCell className="text-center font-mono">
                                                {staff.totalSessions}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                {staff.totalImages.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-muted-foreground">
                                                {staff.totalHours} hrs
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-foreground">
                                                <Badge variant="outline" className="text-[10px] font-mono">
                                                    {staff.avgSecondsPerImage}s / img
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        {/* Pagination Footer */}
                        {allStaff.length > 0 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border/60 bg-muted/10">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>Rows per page:</span>
                                    <Select
                                        value={limit.toString()}
                                        onValueChange={(v) => {
                                            setLimit(Number(v));
                                            setPage(1);
                                        }}
                                    >
                                        <SelectTrigger className="h-8 w-16 text-xs bg-background">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[10, 20, 50].map((l) => (
                                                <SelectItem key={l} value={l.toString()} className="text-xs">
                                                    {l}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <span className="ml-2">
                                        Showing {Math.min((safePage - 1) * limit + 1, allStaff.length)} to{' '}
                                        {Math.min(safePage * limit, allStaff.length)} of {allStaff.length} editors
                                    </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setPage(1)}
                                        disabled={safePage === 1}
                                    >
                                        <ChevronsLeft className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={safePage === 1}
                                    >
                                        <ChevronLeft className="h-3.5 w-3.5" />
                                    </Button>
                                    <span className="text-xs font-medium px-2">
                                        Page {safePage} of {totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={safePage >= totalPages}
                                    >
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setPage(totalPages)}
                                        disabled={safePage >= totalPages}
                                    >
                                        <ChevronsRight className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Sub-Service Breakdown & Shift Output (1 col) */}
                <div className="space-y-6">
                    {/* Step Breakdown */}
                    <Card className="border-border/60 shadow-xs">
                        <CardHeader className="pb-3 border-b border-border/60">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Zap className="h-4 w-4 text-amber-500" />
                                Sub-Service Distribution
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-4">
                            {stepBreakdown.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-4">
                                    No step data available
                                </p>
                            ) : (
                                stepBreakdown.map((step, idx) => (
                                    <div key={idx} className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="font-semibold text-foreground">
                                                {step.stepName}
                                            </span>
                                            <span className="font-mono text-muted-foreground font-bold">
                                                {step.count.toLocaleString()} imgs
                                            </span>
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                            <div
                                                className="bg-primary h-2 rounded-full"
                                                style={{
                                                    width: `${Math.min(
                                                        100,
                                                        (step.count /
                                                            Math.max(1, summary.totalImages)) *
                                                            100
                                                    )}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Shift Performance */}
                    <Card className="border-border/60 shadow-xs">
                        <CardHeader className="pb-3 border-b border-border/60">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Clock className="h-4 w-4 text-blue-500" />
                                Shift Output Comparison
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2.5 pt-4">
                            {shiftList.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-4">
                                    No shift records available
                                </p>
                            ) : (
                                shiftList.map((shift, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20 text-xs"
                                    >
                                        <div className="font-semibold text-foreground">
                                            {shift.shiftName}
                                        </div>
                                        <div className="flex items-center gap-2 font-mono">
                                            <Badge variant="secondary" className="text-[10px]">
                                                {shift.totalSessions} Sessions
                                            </Badge>
                                            <span className="font-bold text-primary">
                                                {shift.totalImages.toLocaleString()} imgs
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
