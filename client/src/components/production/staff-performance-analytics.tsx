'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function StaffPerformanceAnalytics() {
    const [filterType, setFilterType] = useState<string>('month');

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
    const staffList = data?.staffPerformance || [];
    const stepBreakdown = data?.stepBreakdown || [];
    const shiftList = data?.shiftPerformance || [];

    // Export to CSV for HR appraisal/salary review
    const handleExportCSV = () => {
        if (staffList.length === 0) {
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

        const rows = staffList.map((s) => [
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
            {/* Header & Filter Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Award className="h-5 w-5 text-primary" />
                        Staff Performance &amp; Productivity Analytics
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Track daily and monthly image deliveries, active work sessions, and speed metrics for photo editors.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="w-[150px]">
                        <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger className="h-9 text-xs bg-background">
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

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportCSV}
                        className="h-9 text-xs gap-1.5 font-semibold"
                    >
                        <Download className="h-3.5 w-3.5" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-border/60 shadow-xs">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase">
                                Total Images Processed
                            </span>
                            <p className="text-2xl font-black text-foreground">
                                {isLoading ? <Skeleton className="h-8 w-20" /> : summary.totalImages.toLocaleString()}
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-primary/10 text-primary">
                            <Layers className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-xs">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase">
                                Total Work Sessions
                            </span>
                            <p className="text-2xl font-black text-foreground">
                                {isLoading ? <Skeleton className="h-8 w-16" /> : summary.totalSessions.toLocaleString()}
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-xs">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase">
                                Total Editor Hours
                            </span>
                            <p className="text-2xl font-black text-foreground">
                                {isLoading ? <Skeleton className="h-8 w-16" /> : `${summary.totalHours} hrs`}
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <Clock className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-xs">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase">
                                Active Editors
                            </span>
                            <p className="text-2xl font-black text-foreground">
                                {isLoading ? <Skeleton className="h-8 w-12" /> : summary.activeStaffCount}
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <Users className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Staff Leaderboard & Breakdown Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Staff Output Table (2 cols) */}
                <Card className="lg:col-span-2 border-border/60 shadow-sm">
                    <CardHeader className="pb-3">
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
                            <TableHeader className="bg-muted/30">
                                <TableRow className="text-xs">
                                    <TableHead className="font-bold">Staff Name &amp; ID</TableHead>
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
                                ) : staffList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-xs">
                                            No staff performance records found for this timeframe.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    staffList.map((staff, idx) => (
                                        <TableRow key={staff.staffId} className="hover:bg-muted/20 text-xs">
                                            <TableCell className="font-bold">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold">
                                                        {idx + 1}
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
                    </CardContent>
                </Card>

                {/* Sub-Service Breakdown & Shift Output (1 col) */}
                <div className="space-y-6">
                    {/* Step Breakdown */}
                    <Card className="border-border/60 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Zap className="h-4 w-4 text-amber-500" />
                                Sub-Service Distribution
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
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
                    <Card className="border-border/60 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Clock className="h-4 w-4 text-blue-500" />
                                Shift Output Comparison
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2.5">
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
