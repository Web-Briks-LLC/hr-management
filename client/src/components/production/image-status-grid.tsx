'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
    useGetSanitizedOrdersQuery,
    useGetOrderImagesQuery,
    useFlagImageRevisionMutation,
    useGetProductionLogsQuery,
} from '@/redux/features/production/productionApi';
import { LogProductionDialog } from '@/components/production/log-production-dialog';
import { QCReviewDialog } from '@/components/production/qc-review-dialog';
import { OrderWorkflowDrawer } from '@/components/production/order-workflow-drawer';
import { useSocket } from '@/contexts/SocketContext';
import {
    Layers,
    Search,
    Filter,
    FileImage,
    CheckCircle2,
    Clock,
    AlertTriangle,
    RefreshCw,
    UserCheck,
    Tag,
    FileEdit,
    Lock,
    Unlock,
    ChevronRight,
    ArrowLeft,
    ShieldCheck,
    History,
    Plus,
    Calendar,
    Sparkles,
    Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { IShiftProduction } from '@/types/production.type';

interface ImageStatusGridProps {
    isAdmin?: boolean;
}

export function ImageStatusGrid({ isAdmin = false }: ImageStatusGridProps) {
    const { socket } = useSocket();

    // Navigation & Selection state
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [orderSearchQuery, setOrderSearchQuery] = useState<string>('');
    const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');

    // Single image matrix filter states
    const [imageStatusFilter, setImageStatusFilter] = useState<string>('all');
    const [imageSearchQuery, setImageSearchQuery] = useState<string>('');

    // Dialog & Drawer states
    const [isRevisionDialogOpen, setIsRevisionDialogOpen] = useState<boolean>(false);
    const [revisionImageNames, setRevisionImageNames] = useState<string[]>([]);
    const [revisionInstruction, setRevisionInstruction] = useState<string>('');

    const [isLogDialogOpen, setIsLogDialogOpen] = useState<boolean>(false);
    const [selectedOrderIdForLog, setSelectedOrderIdForLog] = useState<string | undefined>();

    const [isQCDialogOpen, setIsQCDialogOpen] = useState<boolean>(false);
    const [selectedLogForQC, setSelectedLogForQC] = useState<IShiftProduction | null>(null);

    const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
    const [selectedOrderIdForDrawer, setSelectedOrderIdForDrawer] = useState<string | null>(null);

    // Queries
    const {
        data: ordersData,
        isLoading: isOrdersLoading,
        refetch: refetchOrders,
    } = useGetSanitizedOrdersQuery({ search: orderSearchQuery || undefined });

    const orders = useMemo(() => {
        const list = ordersData?.data || [];
        if (orderStatusFilter === 'all') return list;
        return list.filter((o) => o.status === orderStatusFilter);
    }, [ordersData, orderStatusFilter]);

    // Active order details
    const selectedOrder = useMemo(() => {
        if (!selectedOrderId) return null;
        return (ordersData?.data || []).find((o) => o._id === selectedOrderId) || null;
    }, [selectedOrderId, ordersData]);

    const {
        data: imagesData,
        isLoading: isImagesLoading,
        refetch: refetchImages,
    } = useGetOrderImagesQuery(
        {
            orderId: selectedOrderId || '',
            status: imageStatusFilter !== 'all' ? imageStatusFilter : undefined,
            search: imageSearchQuery || undefined,
        },
        { skip: !selectedOrderId }
    );

    const { data: logsData, refetch: refetchLogs } = useGetProductionLogsQuery();
    const [flagRevision, { isLoading: isFlagging }] = useFlagImageRevisionMutation();

    const orderImagesResponse = imagesData?.data;
    const images = orderImagesResponse?.images || [];
    const summary = orderImagesResponse?.summary || selectedOrder?.imageStats || {
        totalExpected: selectedOrder?.imageQuantity || 0,
        totalRegistered: 0,
        completedCount: 0,
        inProgressCount: 0,
        partiallyCompletedCount: 0,
        revisionCount: 0,
        unassignedCount: selectedOrder?.imageQuantity || 0,
    };

    // Auto-sync with socket events
    useEffect(() => {
        if (!socket) return;

        const handleUpdate = () => {
            refetchOrders();
            refetchLogs();
            if (selectedOrderId) {
                refetchImages();
            }
        };

        socket.on('production:session_started', handleUpdate);
        socket.on('production:session_finished', handleUpdate);
        socket.on('production:session_cancelled', handleUpdate);
        socket.on('production:images_locked', handleUpdate);
        socket.on('production:images_updated', handleUpdate);

        return () => {
            socket.off('production:session_started', handleUpdate);
            socket.off('production:session_finished', handleUpdate);
            socket.off('production:session_cancelled', handleUpdate);
            socket.off('production:images_locked', handleUpdate);
            socket.off('production:images_updated', handleUpdate);
        };
    }, [socket, refetchOrders, refetchLogs, refetchImages, selectedOrderId]);

    // Open Revision dialog
    const handleOpenRevisionDialog = (imageName: string) => {
        setRevisionImageNames([imageName]);
        setRevisionInstruction('');
        setIsRevisionDialogOpen(true);
    };

    // Confirm Revision
    const handleConfirmRevision = async () => {
        if (!selectedOrderId || revisionImageNames.length === 0) return;
        if (!revisionInstruction.trim()) {
            toast.error('Please enter revision instructions');
            return;
        }

        try {
            const res = await flagRevision({
                orderId: selectedOrderId,
                imageNames: revisionImageNames,
                instruction: revisionInstruction.trim(),
            }).unwrap();

            toast.success(res.message || 'Image marked for revision');
            setIsRevisionDialogOpen(false);
            refetchImages();
            refetchOrders();
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to flag image revision');
        }
    };

    // Open QC dialog for order
    const handleOpenQCCheck = (orderId: string) => {
        const matchLog = logsData?.data?.find(
            (l) => (l.orderId as any)?._id === orderId || (l.orderId as any) === orderId
        );
        if (matchLog) {
            setSelectedLogForQC(matchLog);
            setIsQCDialogOpen(true);
        } else {
            // Provide a mock/minimal log for direct QC review
            setSelectedLogForQC({
                _id: '',
                orderId: { _id: orderId, orderName: selectedOrder?.orderName || 'Order' } as any,
                completedQuantity: summary.completedCount || 0,
                status: 'completed',
            } as any);
            setIsQCDialogOpen(true);
        }
    };

    // Open Timeline Drawer
    const handleOpenTimeline = (orderId: string) => {
        setSelectedOrderIdForDrawer(orderId);
        setIsDrawerOpen(true);
    };

    // Open Log Progress Dialog
    const handleOpenCreateLog = (orderId?: string) => {
        setSelectedOrderIdForLog(orderId || selectedOrderId || undefined);
        setIsLogDialogOpen(true);
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'urgent':
                return (
                    <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20 text-[10px] py-0 font-bold">
                        Urgent
                    </Badge>
                );
            case 'high':
                return (
                    <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[10px] py-0 font-semibold">
                        High
                    </Badge>
                );
            case 'low':
                return (
                    <Badge className="bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20 text-[10px] py-0">
                        Low
                    </Badge>
                );
            default:
                return (
                    <Badge variant="secondary" className="text-[10px] py-0">
                        Normal
                    </Badge>
                );
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'in_progress':
                return (
                    <Badge className="bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30 text-[10px]">
                        In Progress
                    </Badge>
                );
            case 'quality_check':
                return (
                    <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30 text-[10px]">
                        Quality Check
                    </Badge>
                );
            case 'revision':
                return (
                    <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px] font-bold">
                        Revision
                    </Badge>
                );
            case 'completed':
                return (
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                        Completed
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="text-[10px]">
                        Pending
                    </Badge>
                );
        }
    };

    return (
        <div className="space-y-6">
            {/* VIEW 1: MASTER ALL ORDERS LIST (When no specific order is drilled down) */}
            {!selectedOrderId ? (
                <div className="space-y-6">
                    {/* Header & Filter Controls */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                <Layers className="h-5 w-5 text-primary" />
                                Production Orders &amp; Image Tracking
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Live overview of active production orders sorted by latest created first. Click any order to inspect images, perform QC, or flag revisions.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <Button
                                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm h-9 text-xs font-bold gap-1.5"
                                onClick={() => handleOpenCreateLog()}
                            >
                                <Plus className="h-4 w-4" />
                                Add Shift Log
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    refetchOrders();
                                    refetchLogs();
                                    toast.success('Production orders refreshed');
                                }}
                                className="h-9 text-xs gap-1.5"
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                                Refresh
                            </Button>
                        </div>
                    </div>

                    {/* Filter Toolbar */}
                    <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                            <Filter className="h-3.5 w-3.5" /> Filter:
                        </div>

                        <div className="w-full sm:w-[160px]">
                            <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                                <SelectTrigger className="h-8 text-xs bg-background">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="quality_check">Quality Check</SelectItem>
                                    <SelectItem value="revision">Revision</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="relative flex-1 min-w-[220px]">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search by Order ID, name or instructions..."
                                value={orderSearchQuery}
                                onChange={(e) => setOrderSearchQuery(e.target.value)}
                                className="pl-8 h-8 text-xs bg-background"
                            />
                        </div>
                    </div>

                    {/* Orders Table */}
                    <div className="rounded-xl border border-border/60 overflow-hidden bg-background shadow-xs">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow className="border-b-border/60 text-xs">
                                    <TableHead className="font-bold">Order ID / Name</TableHead>
                                    <TableHead className="font-bold">Deadline &amp; Priority</TableHead>
                                    <TableHead className="font-bold">Status</TableHead>
                                    <TableHead className="font-bold">Image Completion Progress</TableHead>
                                    <TableHead className="font-bold">Breakdown Pills</TableHead>
                                    <TableHead className="font-bold text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isOrdersLoading ? (
                                    [...Array(6)].map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-48" /></TableCell>
                                            <TableCell><Skeleton className="h-8 w-28 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : orders.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Layers className="h-8 w-8 opacity-20" />
                                                <p className="text-sm font-medium">No active production orders found</p>
                                                <p className="text-xs opacity-70">
                                                    Orders in progress or pending quality check will appear here.
                                                </p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    orders.map((order) => {
                                        const stats = order.imageStats || {
                                            totalExpected: order.imageQuantity,
                                            totalRegistered: 0,
                                            completedCount: 0,
                                            inProgressCount: 0,
                                            partiallyCompletedCount: 0,
                                            revisionCount: 0,
                                            unassignedCount: order.imageQuantity,
                                        };

                                        const percentage = Math.min(
                                            100,
                                            Math.round(
                                                (stats.completedCount / Math.max(1, order.imageQuantity)) *
                                                    100
                                            )
                                        );

                                        return (
                                            <TableRow
                                                key={order._id}
                                                className="hover:bg-muted/20 text-xs transition-colors cursor-pointer group"
                                                onClick={() => setSelectedOrderId(order._id)}
                                            >
                                                {/* Order Name & Required Steps */}
                                                <TableCell className="font-bold">
                                                    <div className="space-y-1">
                                                        <span className="font-mono text-sm text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                                                            {order.orderName}
                                                        </span>
                                                        <div className="flex flex-wrap gap-1">
                                                            {(order.requiredSteps || []).slice(0, 3).map((step: any, idx: number) => (
                                                                <span
                                                                    key={idx}
                                                                    className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary border border-primary/20"
                                                                >
                                                                    {step.name}
                                                                </span>
                                                            ))}
                                                            {(order.requiredSteps || []).length > 3 && (
                                                                <span className="text-[10px] text-muted-foreground font-mono">
                                                                    +{(order.requiredSteps || []).length - 3} more
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* Deadline & Priority */}
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                                                            <Calendar className="h-3 w-3 text-muted-foreground" />
                                                            {format(new Date(order.deadline), 'dd MMM yyyy')}
                                                        </div>
                                                        <div>{getPriorityBadge(order.priority)}</div>
                                                    </div>
                                                </TableCell>

                                                {/* Status */}
                                                <TableCell>{getStatusBadge(order.status)}</TableCell>

                                                {/* Image Completion Progress */}
                                                <TableCell>
                                                    <div className="space-y-1.5 max-w-[180px]">
                                                        <div className="flex justify-between text-[11px] font-mono">
                                                            <span className="text-muted-foreground">
                                                                {stats.completedCount} / {order.imageQuantity} imgs
                                                            </span>
                                                            <span className="font-bold text-foreground">
                                                                {percentage}%
                                                            </span>
                                                        </div>
                                                        <Progress value={percentage} className="h-1.5" />
                                                    </div>
                                                </TableCell>

                                                {/* Breakdown Pills */}
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1">
                                                        <Badge variant="outline" className="text-[10px] font-mono">
                                                            Reg: {stats.totalRegistered}
                                                        </Badge>
                                                        {stats.inProgressCount > 0 && (
                                                            <Badge className="bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30 text-[10px] font-mono">
                                                                Active: {stats.inProgressCount}
                                                            </Badge>
                                                        )}
                                                        {stats.completedCount > 0 && (
                                                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-mono">
                                                                Done: {stats.completedCount}
                                                            </Badge>
                                                        )}
                                                        {stats.revisionCount > 0 && (
                                                            <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px] font-mono font-bold">
                                                                Rev: {stats.revisionCount}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* Action Buttons */}
                                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleOpenQCCheck(order._id)}
                                                                        className="h-8 px-2 text-xs border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                                                                    >
                                                                        <ShieldCheck className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="text-xs">
                                                                    QC Review / Pass
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>

                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleOpenTimeline(order._id)}
                                                                        className="h-8 px-2 text-xs border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                                                                    >
                                                                        <History className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="text-xs">
                                                                    Workflow Timeline
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>

                                                        <Button
                                                            size="sm"
                                                            onClick={() => setSelectedOrderId(order._id)}
                                                            className="h-8 px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1"
                                                        >
                                                            Inspect Images
                                                            <ChevronRight className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            ) : (
                /* VIEW 2: DRILLED DOWN IMAGE MATRIX VIEW FOR SELECTED ORDER */
                <div className="space-y-6">
                    {/* Top Bar with Back Button & Quick Order Switcher */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/20 p-4 rounded-2xl border border-border/60">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedOrderId(null)}
                                className="h-9 gap-1.5 text-xs font-semibold"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                All Orders
                            </Button>

                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-black tracking-tight text-foreground font-mono">
                                        {selectedOrder?.orderName}
                                    </h3>
                                    {selectedOrder && getStatusBadge(selectedOrder.status)}
                                    {selectedOrder && getPriorityBadge(selectedOrder.priority)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Target: {selectedOrder?.imageQuantity} images | Due:{' '}
                                    {selectedOrder && format(new Date(selectedOrder.deadline), 'dd MMM yyyy, hh:mm a')}
                                </p>
                            </div>
                        </div>

                        {/* Quick Action Buttons & Switcher */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => selectedOrder && handleOpenQCCheck(selectedOrder._id)}
                                className="h-9 text-xs border-purple-500/40 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10 font-semibold gap-1.5"
                            >
                                <ShieldCheck className="h-3.5 w-3.5" />
                                QC Review / Pass
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => selectedOrder && handleOpenTimeline(selectedOrder._id)}
                                className="h-9 text-xs border-blue-500/40 text-blue-700 dark:text-blue-300 hover:bg-blue-500/10 font-semibold gap-1.5"
                            >
                                <History className="h-3.5 w-3.5" />
                                Timeline
                            </Button>

                            <Button
                                size="sm"
                                onClick={() => handleOpenCreateLog(selectedOrder?._id)}
                                className="h-9 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1.5"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Log Output
                            </Button>

                            {/* Quick Switcher */}
                            <div className="w-[180px]">
                                <Select
                                    value={selectedOrderId}
                                    onValueChange={(val) => setSelectedOrderId(val)}
                                >
                                    <SelectTrigger className="h-9 text-xs font-mono bg-background">
                                        <SelectValue placeholder="Switch Order..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(ordersData?.data || []).map((o) => (
                                            <SelectItem key={o._id} value={o._id} className="text-xs font-mono">
                                                {o.orderName} ({o.imageQuantity} imgs)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* KPI Summary Cards for Selected Order */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div className="rounded-xl border bg-card p-3 space-y-1">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                Total Target
                            </span>
                            <p className="text-2xl font-black text-foreground">
                                {summary.totalExpected}
                            </p>
                        </div>
                        <div className="rounded-xl border bg-card p-3 space-y-1 border-blue-500/30">
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">
                                Registered
                            </span>
                            <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                                {summary.totalRegistered}
                            </p>
                        </div>
                        <div className="rounded-xl border bg-card p-3 space-y-1 border-orange-500/30">
                            <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase">
                                In Progress
                            </span>
                            <p className="text-2xl font-black text-orange-600 dark:text-orange-400">
                                {summary.inProgressCount}
                            </p>
                        </div>
                        <div className="rounded-xl border bg-card p-3 space-y-1 border-amber-500/30">
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                                Partially Done
                            </span>
                            <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                                {summary.partiallyCompletedCount}
                            </p>
                        </div>
                        <div className="rounded-xl border bg-card p-3 space-y-1 border-emerald-500/30">
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                                Completed
                            </span>
                            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                {summary.completedCount}
                            </p>
                        </div>
                        <div className="rounded-xl border bg-card p-3 space-y-1 border-destructive/30">
                            <span className="text-[10px] font-bold text-destructive uppercase">
                                In Revision
                            </span>
                            <p className="text-2xl font-black text-destructive">
                                {summary.revisionCount}
                            </p>
                        </div>
                    </div>

                    {/* Image Level Filter Toolbar */}
                    <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                            <Filter className="h-3.5 w-3.5" /> Filter Images:
                        </div>

                        <div className="w-full sm:w-[160px]">
                            <Select value={imageStatusFilter} onValueChange={setImageStatusFilter}>
                                <SelectTrigger className="h-8 text-xs bg-background">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="in_progress">In Progress (Locked)</SelectItem>
                                    <SelectItem value="partially_completed">Partially Done</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="in_revision">In Revision</SelectItem>
                                    <SelectItem value="unassigned">Unassigned</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search image name (e.g. IMG_0042.jpg)..."
                                value={imageSearchQuery}
                                onChange={(e) => setImageSearchQuery(e.target.value)}
                                className="pl-8 h-8 text-xs bg-background"
                            />
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refetchImages()}
                            className="h-8 text-xs gap-1.5"
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Refresh
                        </Button>
                    </div>

                    {/* Images Detailed Table */}
                    <div className="rounded-xl border border-border/60 overflow-hidden bg-background shadow-xs">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow className="border-b-border/60 text-xs">
                                    <TableHead className="font-bold">Image Filename</TableHead>
                                    <TableHead className="font-bold text-center">Status</TableHead>
                                    <TableHead className="font-bold">Required Steps</TableHead>
                                    <TableHead className="font-bold">Completed Work</TableHead>
                                    <TableHead className="font-bold">Current Lock / Editor</TableHead>
                                    <TableHead className="font-bold text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isImagesLoading ? (
                                    [...Array(6)].map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-20 mx-auto rounded-full" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                            <TableCell><Skeleton className="h-7 w-16 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : images.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <FileImage className="h-8 w-8 opacity-20" />
                                                <p className="text-sm font-medium">No image records found for this filter</p>
                                                <p className="text-xs opacity-70">
                                                    Start work on images from the Workstation tab to register them.
                                                </p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    images.map((image) => {
                                        const completedStepNames = new Set(
                                            (image.completedSteps || []).map((s) => s.stepName)
                                        );

                                        return (
                                            <TableRow key={image._id} className="hover:bg-muted/20 text-xs">
                                                {/* Image Name */}
                                                <TableCell className="font-mono font-bold text-foreground">
                                                    <div className="flex items-center gap-1.5">
                                                        <FileImage className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                        <span className="truncate max-w-[200px]">
                                                            {image.imageName}
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                {/* Status Badge */}
                                                <TableCell className="text-center">
                                                    {image.status === 'completed' && (
                                                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                                                            Completed
                                                        </Badge>
                                                    )}
                                                    {image.status === 'in_progress' && (
                                                        <Badge className="bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30 text-[10px] animate-pulse">
                                                            In Progress
                                                        </Badge>
                                                    )}
                                                    {image.status === 'partially_completed' && (
                                                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px]">
                                                            Partially Done
                                                        </Badge>
                                                    )}
                                                    {image.status === 'in_revision' && (
                                                        <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px] font-bold">
                                                            In Revision
                                                        </Badge>
                                                    )}
                                                    {image.status === 'unassigned' && (
                                                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                                            Unassigned
                                                        </Badge>
                                                    )}
                                                </TableCell>

                                                {/* Required Steps */}
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1 max-w-[240px]">
                                                        {(image.requiredSteps || []).map((step, idx) => {
                                                            const isDone = completedStepNames.has(step);
                                                            return (
                                                                <span
                                                                    key={idx}
                                                                    className={cn(
                                                                        'px-1.5 py-0.5 rounded text-[10px] font-medium border',
                                                                        isDone
                                                                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 line-through opacity-70'
                                                                            : 'bg-muted text-foreground border-border/60'
                                                                    )}
                                                                >
                                                                    {step}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                </TableCell>

                                                {/* Completed Work / Steps */}
                                                <TableCell>
                                                    {image.completedSteps && image.completedSteps.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1 max-w-[260px]">
                                                            <TooltipProvider>
                                                                {image.completedSteps.map((step, idx) => (
                                                                    <Tooltip key={idx}>
                                                                        <TooltipTrigger asChild>
                                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 font-medium cursor-default">
                                                                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                                                                {step.stepName}
                                                                            </span>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent className="text-xs">
                                                                            <p className="font-bold">{step.stepName}</p>
                                                                            <p className="text-[11px] text-muted-foreground">
                                                                                Editor: {step.completedBy?.name || 'Staff'}
                                                                            </p>
                                                                            <p className="text-[11px] text-muted-foreground">
                                                                                Time: {format(new Date(step.completedAt), 'dd MMM yyyy, hh:mm a')}
                                                                            </p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                ))}
                                                            </TooltipProvider>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground text-[11px] italic">
                                                            None yet
                                                        </span>
                                                    )}
                                                </TableCell>

                                                {/* Current Lock / Assigned Staff */}
                                                <TableCell>
                                                    {image.currentAssignedStaffId ? (
                                                        <span className="inline-flex items-center gap-1 font-semibold text-orange-600 dark:text-orange-400">
                                                            <Lock className="h-3 w-3" />
                                                            {image.currentAssignedStaffId.name || 'Editor'}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-muted-foreground opacity-60">
                                                            <Unlock className="h-3 w-3" />
                                                            Free / Open
                                                        </span>
                                                    )}
                                                </TableCell>

                                                {/* Actions: Flag Revision */}
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleOpenRevisionDialog(image.imageName)}
                                                        className="h-7 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 font-medium"
                                                    >
                                                        <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                                                        Revision
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {/* INTEGRATED DIALOGS & DRAWERS */}
            {/* 1. Flag Revision Dialog */}
            <Dialog open={isRevisionDialogOpen} onOpenChange={setIsRevisionDialogOpen}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Flag Image for Revision
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Target image: <span className="font-mono font-bold">{revisionImageNames.join(', ')}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="instruction" className="text-xs font-semibold">
                                Revision Instructions:
                            </Label>
                            <Textarea
                                id="instruction"
                                placeholder="E.g., Fix neck joint alignment, smooth out skin shadows, adjust edge feather..."
                                value={revisionInstruction}
                                onChange={(e) => setRevisionInstruction(e.target.value)}
                                className="text-xs min-h-[90px]"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsRevisionDialogOpen(false)}
                            disabled={isFlagging}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleConfirmRevision}
                            disabled={isFlagging || !revisionInstruction.trim()}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
                        >
                            Submit Revision
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 2. QC Review Dialog */}
            <QCReviewDialog
                open={isQCDialogOpen}
                onOpenChange={setIsQCDialogOpen}
                log={selectedLogForQC}
                onSuccess={() => {
                    refetchOrders();
                    refetchLogs();
                    if (selectedOrderId) refetchImages();
                }}
            />

            {/* 3. Log Production Dialog */}
            <LogProductionDialog
                open={isLogDialogOpen}
                onOpenChange={(open) => {
                    setIsLogDialogOpen(open);
                    if (!open) setSelectedOrderIdForLog(undefined);
                }}
                initialOrderId={selectedOrderIdForLog}
                onSuccess={() => {
                    refetchOrders();
                    refetchLogs();
                    if (selectedOrderId) refetchImages();
                }}
            />

            {/* 4. Order Workflow Drawer */}
            <OrderWorkflowDrawer
                open={isDrawerOpen}
                onOpenChange={setIsDrawerOpen}
                orderId={selectedOrderIdForDrawer}
            />
        </div>
    );
}
