'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { toast } from 'sonner';
import { useSession } from '@/lib/auth-client';
import { Role } from '@/constants/role';
import { useGetMeQuery } from '@/redux/features/staff/staffApi';
import { useGetAllShiftsQuery } from '@/redux/features/shift/shiftApi';
import {
    useGetProductionLogsQuery,
    useGetActiveOrdersProgressQuery,
    useGetProductionStatsQuery,
    useDeleteProductionLogMutation,
} from '@/redux/features/production/productionApi';
import { OrderProgressTable } from '@/components/production/order-progress-table';
import { ShiftHandoverFeed } from '@/components/production/shift-handover-feed';
import { ProductionStatsView } from '@/components/production/production-stats-view';
import { LogProductionDialog } from '@/components/production/log-production-dialog';
import { QCReviewDialog } from '@/components/production/qc-review-dialog';
import { OrderWorkflowDrawer } from '@/components/production/order-workflow-drawer';
import { useSocket } from '@/contexts/SocketContext';
import {
    IShiftProduction,
    ProductionStatus,
    STAGE_LABELS,
    STATUS_LABELS,
} from '@/types/production.type';
import {
    Layers,
    Plus,
    Filter,
    RefreshCw,
    Clock,
    CheckCircle2,
    AlertTriangle,
    Search,
    BarChart3,
    FileText,
    ShieldAlert,
} from 'lucide-react';

type DateFilterType = 'all' | 'today' | 'week' | 'month' | 'year';

const currentYear = new Date().getFullYear();
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

function ProductionContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const { data: session, isPending: isSessionLoading } = useSession();
    const { data: meData, isLoading: isMeLoading } = useGetMeQuery({});
    const { socket } = useSocket();

    const userRole = session?.user?.role as Role | undefined;
    const staff = meData?.staff;
    const isTelemarketer = staff?.designation?.toLowerCase() === 'telemarketer';

    const isAdmin = [Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER].includes(
        userRole as Role
    );

    // Read active tab from URL query params (default to 'orders')
    const activeTab = searchParams.get('tab') || 'orders';

    const handleTabChange = (newTab: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', newTab);
        router.replace(`${pathname}?${params.toString()}`);
    };

    // Filter states matching Earnings pattern
    const [filterType, setFilterType] = useState<DateFilterType>('all');
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number>(currentYear);
    const [shiftFilter, setShiftFilter] = useState<string>('all');
    const [stageFilter, setStageFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Dialog states
    const [isLogDialogOpen, setIsLogDialogOpen] = useState<boolean>(false);
    const [selectedOrderIdForLog, setSelectedOrderIdForLog] = useState<string | undefined>();
    const [editingLog, setEditingLog] = useState<IShiftProduction | null>(null);

    const [isQCDialogOpen, setIsQCDialogOpen] = useState<boolean>(false);
    const [selectedLogForQC, setSelectedLogForQC] = useState<IShiftProduction | null>(null);

    const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
    const [selectedOrderIdForDrawer, setSelectedOrderIdForDrawer] = useState<string | null>(null);

    const [deleteLogId, setDeleteLogId] = useState<string | null>(null);

    // Queries
    const { data: shiftsData } = useGetAllShiftsQuery({});
    const shifts = useMemo(() => {
        return (
            shiftsData?.shifts ||
            shiftsData?.data ||
            (Array.isArray(shiftsData) ? shiftsData : [])
        );
    }, [shiftsData]);

    const {
        data: activeOrdersData,
        isLoading: isOrdersLoading,
        refetch: refetchOrders,
    } = useGetActiveOrdersProgressQuery({ search: searchQuery || undefined });

    const {
        data: logsData,
        isLoading: isLogsLoading,
        refetch: refetchLogs,
    } = useGetProductionLogsQuery({
        shiftId: shiftFilter !== 'all' ? shiftFilter : undefined,
        stage: stageFilter !== 'all' ? stageFilter : undefined,
        status: statusFilter !== 'all' ? (statusFilter as ProductionStatus) : undefined,
        search: searchQuery || undefined,
        limit: 100,
    });

    const {
        data: statsData,
        isLoading: isStatsLoading,
        refetch: refetchStats,
    } = useGetProductionStatsQuery();

    const [deleteLog, { isLoading: isDeleting }] = useDeleteProductionLogMutation();

    const handleRefetchAll = () => {
        refetchOrders();
        refetchLogs();
        refetchStats();
    };

    // Socket.io Real-time event listeners
    useEffect(() => {
        if (!socket) return;

        const handleProductionUpdate = () => {
            handleRefetchAll();
        };

        socket.on('production:log_created', handleProductionUpdate);
        socket.on('production:log_updated', handleProductionUpdate);
        socket.on('production:qc_submitted', handleProductionUpdate);
        socket.on('production:log_deleted', handleProductionUpdate);

        return () => {
            socket.off('production:log_created', handleProductionUpdate);
            socket.off('production:log_updated', handleProductionUpdate);
            socket.off('production:qc_submitted', handleProductionUpdate);
            socket.off('production:log_deleted', handleProductionUpdate);
        };
    }, [socket, refetchOrders, refetchLogs, refetchStats]);

    const handleOpenCreateLog = (orderId?: string) => {
        setEditingLog(null);
        setSelectedOrderIdForLog(orderId);
        setIsLogDialogOpen(true);
    };

    const handleOpenEditLog = (log: IShiftProduction) => {
        setEditingLog(log);
        setSelectedOrderIdForLog(undefined);
        setIsLogDialogOpen(true);
    };

    const handleOpenQC = (log: IShiftProduction) => {
        setSelectedLogForQC(log);
        setIsQCDialogOpen(true);
    };

    const handleOpenTimeline = (orderId: string) => {
        setSelectedOrderIdForDrawer(orderId);
        setIsDrawerOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteLogId) return;

        try {
            await deleteLog(deleteLogId).unwrap();
            toast.success('Production log deleted successfully');
            setDeleteLogId(null);
            handleRefetchAll();
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to delete log');
        }
    };

    const stats = statsData?.data;
    const summary = stats?.summary || {
        totalImages: 0,
        todayImages: 0,
        activeOrders: 0,
        activeRevisions: 0,
    };

    // Permission guard check for Telemarketers
    if (!isSessionLoading && !isMeLoading) {
        if (isTelemarketer && (userRole === Role.STAFF || userRole === Role.TEAM_LEADER)) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
                    <div className="p-4 rounded-full bg-destructive/10 text-destructive">
                        <ShieldAlert className="h-12 w-12" />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
                        <p className="text-sm text-muted-foreground max-w-md">
                            The Production &amp; Shift Management board is reserved for Production Floor Team Leaders, Photo Editors, and Administrators.
                        </p>
                    </div>
                </div>
            );
        }
    }

    return (
        <div className="space-y-8 p-1">
            {/* Header & Stats Overview (Exact match to Earnings layout) */}
            <div className="flex flex-col gap-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text">
                        Production Overview
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Track shift throughput, monitor multi-stage image progress, and manage handovers.
                    </p>
                </div>

                {/* 4 Glassmorphic KPI Cards (Exact replica of Earnings style) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* 1. Total Output Card (Slate) */}
                    <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-slate-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-slate-500/5 hover:border-slate-500/30">
                        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-slate-500/10 blur-2xl transition-all duration-300 group-hover:bg-slate-500/20" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/10 text-slate-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-slate-500/20">
                                    <Layers className="h-5 w-5" />
                                </div>
                                {!isStatsLoading && (
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] font-medium opacity-70 group-hover:opacity-100"
                                    >
                                        30 Days
                                    </Badge>
                                )}
                            </div>
                            {isStatsLoading ? (
                                <Skeleton className="h-8 w-24" />
                            ) : (
                                <div>
                                    <h3 className="text-3xl font-bold tracking-tight text-slate-600 dark:text-slate-300">
                                        {summary.totalImages.toLocaleString()}
                                    </h3>
                                    <div className="mt-2 space-y-1">
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-muted-foreground font-medium">Total Volume:</span>
                                            <span className="font-semibold">{summary.totalImages.toLocaleString()} images</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-slate-500/10 font-medium">
                                Total Output
                            </p>
                        </div>
                    </div>

                    {/* 2. Active Orders / Pipeline Card (Orange) */}
                    <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-orange-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/5 hover:border-orange-500/30">
                        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-orange-500/10 blur-2xl transition-all duration-300 group-hover:bg-orange-500/20" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-orange-500/20">
                                    <Clock className="h-5 w-5" />
                                </div>
                                {!isStatsLoading && (
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] font-medium bg-orange-500/5 text-orange-500 border-orange-500/20 px-1.5 py-0 h-5"
                                    >
                                        Pipeline
                                    </Badge>
                                )}
                            </div>
                            {isStatsLoading ? (
                                <Skeleton className="h-8 w-24" />
                            ) : (
                                <div>
                                    <h3 className="text-3xl font-bold tracking-tight text-orange-600 dark:text-orange-400">
                                        {summary.activeOrders}
                                    </h3>
                                    <div className="mt-2 space-y-1">
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-muted-foreground font-medium">In-Progress:</span>
                                            <span className="font-semibold text-orange-600/90 dark:text-orange-400/90">
                                                {summary.activeOrders} Orders
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-orange-500/10 font-medium">
                                Active Orders
                            </p>
                        </div>
                    </div>

                    {/* 3. Today's Output Card (Green) */}
                    <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-green-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/5 hover:border-green-500/30">
                        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-green-500/10 blur-2xl transition-all duration-300 group-hover:bg-green-500/20" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-green-500/20">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                                {!isStatsLoading && (
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] font-medium bg-green-500/5 text-green-500 border-green-500/20 px-1.5 py-0 h-5"
                                    >
                                        Today
                                    </Badge>
                                )}
                            </div>
                            {isStatsLoading ? (
                                <Skeleton className="h-8 w-24" />
                            ) : (
                                <div>
                                    <h3 className="text-3xl font-bold tracking-tight text-green-600 dark:text-green-400">
                                        {summary.todayImages.toLocaleString()}
                                    </h3>
                                    <div className="mt-2 space-y-1">
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-muted-foreground font-medium">Completed:</span>
                                            <span className="font-semibold text-green-600/90 dark:text-green-400/90">
                                                {summary.todayImages.toLocaleString()} images
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-green-500/10 font-medium">
                                Today&apos;s Output
                            </p>
                        </div>
                    </div>

                    {/* 4. QC Revisions Card (Blue/Indigo) */}
                    <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-blue-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-500/30">
                        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-blue-500/10 blur-2xl transition-all duration-300 group-hover:bg-blue-500/20" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-500/20">
                                    <AlertTriangle className="h-5 w-5" />
                                </div>
                                {!isStatsLoading && (
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] font-medium bg-blue-500/5 text-blue-500 border-blue-500/20 px-1.5 py-0 h-5"
                                    >
                                        QC Status
                                    </Badge>
                                )}
                            </div>
                            {isStatsLoading ? (
                                <Skeleton className="h-8 w-24" />
                            ) : (
                                <div>
                                    <h3 className="text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                                        {summary.activeRevisions}
                                    </h3>
                                    <div className="mt-2 space-y-1">
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-muted-foreground font-medium">Revisions:</span>
                                            <span className="font-semibold text-blue-600/90 dark:text-blue-400/90">
                                                {summary.activeRevisions} Pending Fixes
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-blue-500/10 font-medium">
                                Active Revisions
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area (Matches Earnings Card Structure) */}
            <Card className="border-border/60 shadow-md">
                <CardHeader className="pb-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle className="flex items-center gap-2 text-xl font-bold">
                            <Layers className="h-5 w-5 text-primary" />
                            Shift Production &amp; Workflow
                        </CardTitle>

                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <Button
                                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm h-9 text-xs font-bold gap-1.5"
                                onClick={() => handleOpenCreateLog()}
                            >
                                <Plus className="h-4 w-4" />
                                Add Shift Output
                            </Button>

                            <Button
                                variant="outline"
                                className="border-primary text-primary hover:bg-primary/10 shadow-sm h-9 text-xs font-semibold gap-1.5"
                                onClick={() => {
                                    handleRefetchAll();
                                    toast.success('Production data refreshed');
                                }}
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                                Refresh
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Filters Toolbar (Replicates Earnings Filter Toolbar) */}
                    <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
                        <div className="flex items-center gap-2">
                            <div className="bg-primary/10 p-2 rounded-full">
                                <Filter className="h-4 w-4 text-primary" />
                            </div>
                            <span className="text-sm font-medium">
                                Filters:
                            </span>
                        </div>

                        {/* Date Filter Type */}
                        <div className="w-full sm:w-[130px]">
                            <Select
                                value={filterType}
                                onValueChange={(v) => setFilterType(v as DateFilterType)}
                            >
                                <SelectTrigger className="w-full h-9 bg-background/60 text-xs">
                                    <SelectValue placeholder="Date Range" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Time</SelectItem>
                                    <SelectItem value="today">Today</SelectItem>
                                    <SelectItem value="week">This Week</SelectItem>
                                    <SelectItem value="month">Monthly</SelectItem>
                                    <SelectItem value="year">Yearly</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Month Select if Monthly */}
                        {filterType === 'month' && (
                            <div className="w-full sm:w-[120px]">
                                <Select
                                    value={selectedMonth.toString()}
                                    onValueChange={(v) => setSelectedMonth(parseInt(v))}
                                >
                                    <SelectTrigger className="w-full h-9 bg-background/60 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MONTHS.map((m) => (
                                             <SelectItem key={m.value} value={m.value.toString()}>
                                                {m.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Shift Filter */}
                        <div className="w-full sm:w-[140px]">
                            <Select value={shiftFilter} onValueChange={setShiftFilter}>
                                <SelectTrigger className="w-full h-9 bg-background/60 text-xs">
                                    <SelectValue placeholder="All Shifts" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Shifts</SelectItem>
                                    {shifts.map((s: any) => (
                                        <SelectItem key={s._id} value={s._id}>
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Stage Filter */}
                        <div className="w-full sm:w-[150px]">
                            <Select value={stageFilter} onValueChange={setStageFilter}>
                                <SelectTrigger className="w-full h-9 bg-background/60 text-xs">
                                    <SelectValue placeholder="All Stages" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Stages</SelectItem>
                                    {Object.entries(STAGE_LABELS).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Status Filter */}
                        <div className="w-full sm:w-[140px]">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full h-9 bg-background/60 text-xs">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    {Object.entries(STATUS_LABELS).map(([key, val]) => (
                                        <SelectItem key={key} value={key}>
                                            {val.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Search Input */}
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search order, client, instructions..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 text-xs bg-background/60 w-full"
                            />
                        </div>
                    </div>

                    {/* Tabs Navigation with URL Search Query Sync */}
                    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
                        <TabsList className="grid grid-cols-3 w-full sm:w-[480px] h-10 p-1 bg-muted/60 rounded-xl">
                            <TabsTrigger value="orders" className="text-xs font-bold gap-1.5 rounded-lg data-[state=active]:shadow-xs">
                                <Layers className="h-3.5 w-3.5" /> Active Orders
                            </TabsTrigger>
                            <TabsTrigger value="logs" className="text-xs font-bold gap-1.5 rounded-lg data-[state=active]:shadow-xs">
                                <FileText className="h-3.5 w-3.5" /> Shift Logs
                            </TabsTrigger>
                            <TabsTrigger value="analytics" className="text-xs font-bold gap-1.5 rounded-lg data-[state=active]:shadow-xs">
                                <BarChart3 className="h-3.5 w-3.5" /> Analytics
                            </TabsTrigger>
                        </TabsList>

                        {/* TAB 1: Active Orders Multi-Stage Progression */}
                        <TabsContent value="orders" className="space-y-6 focus-visible:outline-hidden">
                            <OrderProgressTable
                                orders={activeOrdersData?.data || []}
                                isLoading={isOrdersLoading}
                                onLogProgress={(orderId) => handleOpenCreateLog(orderId)}
                                onViewTimeline={(orderId) => handleOpenTimeline(orderId)}
                                onQCCheck={(_orderId) => {
                                    const matchLog = logsData?.data?.find(
                                        (l) => (l.orderId as any)?._id === _orderId || l.orderId === (_orderId as any)
                                    );
                                    if (matchLog) {
                                        handleOpenQC(matchLog);
                                    } else {
                                        toast.info('No shift log found for QC. Please log shift production first.');
                                    }
                                }}
                            />
                        </TabsContent>

                        {/* TAB 2: Shift Production Logs */}
                        <TabsContent value="logs" className="space-y-6 focus-visible:outline-hidden">
                            <ShiftHandoverFeed
                                logs={logsData?.data || []}
                                isLoading={isLogsLoading}
                                isAdmin={isAdmin}
                                onEditLog={handleOpenEditLog}
                                onQCCheck={handleOpenQC}
                                onDeleteLog={(id) => setDeleteLogId(id)}
                            />
                        </TabsContent>

                        {/* TAB 3: Production Analytics */}
                        <TabsContent value="analytics" className="space-y-6 focus-visible:outline-hidden">
                            <ProductionStatsView
                                stats={statsData?.data}
                                isLoading={isStatsLoading}
                            />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Modals & Dialogs */}
            <LogProductionDialog
                open={isLogDialogOpen}
                onOpenChange={(open) => {
                    setIsLogDialogOpen(open);
                    if (!open) {
                        setSelectedOrderIdForLog(undefined);
                        setEditingLog(null);
                    }
                }}
                initialOrderId={selectedOrderIdForLog}
                editLog={editingLog}
                onSuccess={handleRefetchAll}
            />

            <QCReviewDialog
                open={isQCDialogOpen}
                onOpenChange={setIsQCDialogOpen}
                log={selectedLogForQC}
                onSuccess={handleRefetchAll}
            />

            <OrderWorkflowDrawer
                open={isDrawerOpen}
                onOpenChange={setIsDrawerOpen}
                orderId={selectedOrderIdForDrawer}
            />

            {/* Delete Confirmation Alert */}
            <AlertDialog open={!!deleteLogId} onOpenChange={(open) => !open && setDeleteLogId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Production Log?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this shift production record? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export default function ProductionPage() {
    return (
        <Suspense fallback={
            <div className="space-y-6 p-4">
                <Skeleton className="h-10 w-60 rounded-xl" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Skeleton className="h-32 rounded-2xl" />
                    <Skeleton className="h-32 rounded-2xl" />
                    <Skeleton className="h-32 rounded-2xl" />
                    <Skeleton className="h-32 rounded-2xl" />
                </div>
                <Skeleton className="h-96 rounded-2xl" />
            </div>
        }>
            <ProductionContent />
        </Suspense>
    );
}
