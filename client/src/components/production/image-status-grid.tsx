'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
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
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useGetSanitizedOrdersQuery } from '@/redux/features/production/productionApi';
import { OrderWorkflowDrawer } from '@/components/production/order-workflow-drawer';
import { useSocket } from '@/contexts/SocketContext';
import {
    Layers,
    Search,
    Filter,
    ChevronRight,
    History,
    Calendar,
    ChevronLeft,
    ChevronsLeft,
    ChevronsRight,
} from 'lucide-react';
import { format } from 'date-fns';

interface ImageStatusGridProps {
    isAdmin?: boolean;
}

export function ImageStatusGrid({ isAdmin = false }: ImageStatusGridProps) {
    const { socket } = useSocket();
    const router = useRouter();

    // Navigation & Selection state
    const [orderSearchQuery, setOrderSearchQuery] = useState<string>('');
    const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');

    // Pagination for Orders List
    const [orderPage, setOrderPage] = useState<number>(1);
    const [orderLimit, setOrderLimit] = useState<number>(10);

    // Timeline drawer state
    const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
    const [selectedOrderIdForDrawer, setSelectedOrderIdForDrawer] = useState<string | null>(null);

    // Queries
    const {
        data: ordersData,
        isLoading: isOrdersLoading,
        refetch: refetchOrders,
    } = useGetSanitizedOrdersQuery({
        search: orderSearchQuery || undefined,
        // This grid must keep showing an order after its last image is
        // QC-approved — otherwise it just vanishes out from under whoever is
        // reviewing it.
        includeCompleted: true,
    });

    const allOrders = useMemo(() => {
        const list = ordersData?.data || [];
        if (orderStatusFilter === 'all') return list;
        return list.filter((o) => o.status === orderStatusFilter);
    }, [ordersData, orderStatusFilter]);

    // Paginated Orders
    const totalOrderPages = Math.max(1, Math.ceil(allOrders.length / orderLimit));
    const safeOrderPage = Math.min(orderPage, totalOrderPages);
    const paginatedOrders = useMemo(() => {
        const start = (safeOrderPage - 1) * orderLimit;
        return allOrders.slice(start, start + orderLimit);
    }, [allOrders, safeOrderPage, orderLimit]);

    // Auto-sync with socket events
    useEffect(() => {
        if (!socket) return;

        const handleUpdate = () => {
            refetchOrders();
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
    }, [socket, refetchOrders]);

    // Open Timeline Drawer
    const handleOpenTimeline = (orderId: string) => {
        setSelectedOrderIdForDrawer(orderId);
        setIsDrawerOpen(true);
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'urgent':
                return (
                    <Badge className="bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30 text-[10px] py-0 font-bold">
                        Urgent
                    </Badge>
                );
            case 'high':
                return (
                    <Badge className="bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30 text-[10px] py-0 font-semibold">
                        High
                    </Badge>
                );
            case 'low':
                return (
                    <Badge className="bg-muted text-muted-foreground border-border/60 text-[10px] py-0">
                        Low
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30 text-[10px] py-0">
                        Normal
                    </Badge>
                );
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'in_progress':
                return (
                    <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30 text-[10px] font-medium">
                        In Progress
                    </Badge>
                );
            case 'quality_check':
                return (
                    <Badge className="bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30 text-[10px] font-medium">
                        Quality Check
                    </Badge>
                );
            case 'revision':
                return (
                    <Badge className="bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30 text-[10px] font-bold">
                        Revision
                    </Badge>
                );
            case 'completed':
                return (
                    <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30 text-[10px] font-medium">
                        Completed
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 text-[10px] font-medium">
                        Pending
                    </Badge>
                );
        }
    };

    return (
        <div className="space-y-6">
            {/* MASTER ALL ORDERS LIST */}
                    {/* Filter Toolbar (Matching Orders / Earnings pattern) */}
                    <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
                        <div className="flex items-center gap-2">
                            <div className="bg-primary/10 p-2 rounded-full">
                                <Filter className="h-4 w-4 text-primary" />
                            </div>
                            <span className="text-sm font-medium">Filters:</span>
                        </div>

                        <div className="w-full sm:w-[160px]">
                            <Select
                                value={orderStatusFilter}
                                onValueChange={(val) => {
                                    setOrderStatusFilter(val);
                                    setOrderPage(1);
                                }}
                            >
                                <SelectTrigger className="h-9 text-xs bg-background/60">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="quality_check">Quality Check</SelectItem>
                                    <SelectItem value="revision">Revision</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="relative flex-1 min-w-[220px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search by Order ID, name or instructions..."
                                value={orderSearchQuery}
                                onChange={(e) => {
                                    setOrderSearchQuery(e.target.value);
                                    setOrderPage(1);
                                }}
                                className="pl-9 h-9 text-xs bg-background/60 w-full"
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
                                    <TableHead className="font-bold">Floor Breakdown</TableHead>
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
                                ) : paginatedOrders.length === 0 ? (
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
                                    paginatedOrders.map((order) => {
                                        const stats = order.imageStats || {
                                            totalExpected: order.imageQuantity,
                                            totalRegistered: 0,
                                            completedCount: 0,
                                            inProgressCount: 0,
                                            partiallyCompletedCount: 0,
                                            pendingQcCount: 0,
                                            revisionCount: 0,
                                            unassignedCount: order.imageQuantity,
                                        };

                                        // "Done" here means the editor has finished every required
                                        // step on the image (it's awaiting QC or already QC-approved).
                                        // Images sent back to revision are excluded since they still
                                        // need rework — counting only `completedCount` used to make
                                        // this bar read 0% for orders that were fully edited but not
                                        // yet QC-approved.
                                        const doneCount = stats.completedCount + stats.pendingQcCount;
                                        const percentage = Math.min(
                                            100,
                                            Math.round(
                                                (doneCount / Math.max(1, order.imageQuantity)) * 100
                                            )
                                        );

                                        return (
                                            <TableRow
                                                key={order._id}
                                                className="hover:bg-muted/20 text-xs transition-colors cursor-pointer group"
                                                onClick={() =>
                                                    router.push(
                                                        `/production/orders/${order._id}?from=${encodeURIComponent('/production?tab=images')}`
                                                    )
                                                }
                                            >
                                                {/* Order Name & Required Steps */}
                                                <TableCell className="font-bold py-3.5">
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
                                                <TableCell className="py-3.5">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                                                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                                            {format(new Date(order.deadline), 'dd MMM yyyy')}
                                                        </div>
                                                        <div>{getPriorityBadge(order.priority)}</div>
                                                    </div>
                                                </TableCell>

                                                {/* Status */}
                                                <TableCell className="py-3.5">{getStatusBadge(order.status)}</TableCell>

                                                {/* Image Completion Progress */}
                                                <TableCell className="py-3.5">
                                                    <div className="space-y-1.5 max-w-[180px]">
                                                        <div className="flex justify-between text-[11px] font-mono">
                                                            <span className="text-muted-foreground">
                                                                {doneCount} / {order.imageQuantity} imgs
                                                            </span>
                                                            <span className="font-bold text-foreground">
                                                                {percentage}%
                                                            </span>
                                                        </div>
                                                        <Progress value={percentage} className="h-1.5" />
                                                    </div>
                                                </TableCell>

                                                {/* Breakdown Pills */}
                                                <TableCell className="py-3.5">
                                                    <div className="flex flex-wrap gap-1">
                                                        <Badge variant="outline" className="text-[10px] font-mono">
                                                            Reg: {stats.totalRegistered}
                                                        </Badge>
                                                        {stats.inProgressCount > 0 && (
                                                            <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30 text-[10px] font-mono">
                                                                Active: {stats.inProgressCount}
                                                            </Badge>
                                                        )}
                                                        {stats.pendingQcCount > 0 && (
                                                            <Badge className="bg-sky-500/20 text-sky-700 dark:text-sky-400 border-sky-500/30 text-[10px] font-mono font-bold">
                                                                QC: {stats.pendingQcCount}
                                                            </Badge>
                                                        )}
                                                        {stats.completedCount > 0 && (
                                                            <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30 text-[10px] font-mono">
                                                                Approved: {stats.completedCount}
                                                            </Badge>
                                                        )}
                                                        {stats.revisionCount > 0 && (
                                                            <Badge className="bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30 text-[10px] font-mono font-bold">
                                                                Rev: {stats.revisionCount}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* Action Buttons */}
                                                <TableCell className="text-right py-3.5" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        onClick={() => handleOpenTimeline(order._id)}
                                                                        className="h-8 w-8 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 border-blue-500/30"
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
                                                            asChild
                                                            className="h-8 px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                                                        >
                                                            <Link
                                                                href={`/production/orders/${order._id}?from=${encodeURIComponent('/production?tab=images')}`}
                                                            >
                                                                Inspect
                                                                <ChevronRight className="h-3.5 w-3.5" />
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>

                        {/* Pagination Footer */}
                        {allOrders.length > 0 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border/60 bg-muted/10">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>Rows per page:</span>
                                    <Select
                                        value={orderLimit.toString()}
                                        onValueChange={(v) => {
                                            setOrderLimit(Number(v));
                                            setOrderPage(1);
                                        }}
                                    >
                                        <SelectTrigger className="h-8 w-16 text-xs bg-background">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[10, 20, 50, 100].map((l) => (
                                                <SelectItem key={l} value={l.toString()} className="text-xs">
                                                    {l}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <span className="ml-2">
                                        Showing {Math.min((safeOrderPage - 1) * orderLimit + 1, allOrders.length)} to{' '}
                                        {Math.min(safeOrderPage * orderLimit, allOrders.length)} of {allOrders.length} orders
                                    </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setOrderPage(1)}
                                        disabled={safeOrderPage === 1}
                                    >
                                        <ChevronsLeft className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setOrderPage((p) => Math.max(1, p - 1))}
                                        disabled={safeOrderPage === 1}
                                    >
                                        <ChevronLeft className="h-3.5 w-3.5" />
                                    </Button>
                                    <span className="text-xs font-medium px-2">
                                        Page {safeOrderPage} of {totalOrderPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setOrderPage((p) => Math.min(totalOrderPages, p + 1))}
                                        disabled={safeOrderPage >= totalOrderPages}
                                    >
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setOrderPage(totalOrderPages)}
                                        disabled={safeOrderPage >= totalOrderPages}
                                    >
                                        <ChevronsRight className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

            {/* Order Workflow Drawer */}
            <OrderWorkflowDrawer
                open={isDrawerOpen}
                onOpenChange={setIsDrawerOpen}
                orderId={selectedOrderIdForDrawer}
            />
        </div>
    );
}
