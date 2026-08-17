'use client';

import React, { useState, useMemo } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    IActiveOrderProductionProgress,
    STAGE_LABELS,
    ProductionStage,
} from '@/types/production.type';
import { format, formatDistanceToNow } from 'date-fns';
import {
    Plus,
    Clock,
    History,
    Sparkles,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Check,
} from 'lucide-react';

interface OrderProgressTableProps {
    orders: IActiveOrderProductionProgress[];
    isLoading: boolean;
    onLogProgress: (orderId: string) => void;
    onViewTimeline: (orderId: string) => void;
    onQCCheck: (orderId: string) => void;
}

const PER_PAGE_OPTIONS = [10, 20, 50, 100];

export function OrderProgressTable({
    orders,
    isLoading,
    onLogProgress,
    onViewTimeline,
}: OrderProgressTableProps) {
    const [page, setPage] = useState<number>(1);
    const [limit, setLimit] = useState<number>(10);

    const totalPages = Math.max(1, Math.ceil(orders.length / limit));
    const safePage = Math.min(page, totalPages);

    const paginatedOrders = useMemo(() => {
        const start = (safePage - 1) * limit;
        return orders.slice(start, start + limit);
    }, [orders, safePage, limit]);

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'urgent':
                return (
                    <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20 text-[10px] py-0">
                        Urgent
                    </Badge>
                );
            case 'high':
                return (
                    <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[10px] py-0">
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

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div className="text-center py-16 px-4 border border-dashed rounded-2xl bg-muted/10">
                <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm font-semibold text-foreground">No active orders in production</p>
                <p className="text-xs text-muted-foreground mt-1">
                    Orders in pending, in-progress, or revision state will appear here automatically.
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-border/60 overflow-hidden bg-card shadow-xs">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent bg-muted/40 border-b border-border/60">
                            <TableHead className="text-xs font-bold uppercase tracking-wider py-3.5">
                                Order Title
                            </TableHead>
                            <TableHead className="text-xs font-bold uppercase tracking-wider text-center py-3.5">
                                Total Images
                            </TableHead>
                            <TableHead className="text-xs font-bold uppercase tracking-wider min-w-[260px] py-3.5">
                                Stage Breakdown &amp; Progress
                            </TableHead>
                            <TableHead className="text-xs font-bold uppercase tracking-wider py-3.5">
                                Remaining
                            </TableHead>
                            <TableHead className="text-xs font-bold uppercase tracking-wider py-3.5">
                                Deadline
                            </TableHead>
                            <TableHead className="text-xs font-bold uppercase tracking-wider py-3.5">
                                Last Shift Log
                            </TableHead>
                            <TableHead className="text-xs font-bold uppercase tracking-wider text-right py-3.5 pr-4">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedOrders.map((order) => {
                            const prog = order.productionProgress;
                            const isRevision = order.status === 'revision';

                            return (
                                <TableRow
                                    key={order._id}
                                    className="hover:bg-muted/30 transition-colors border-b border-border/40"
                                >
                                    {/* Order Title */}
                                    <TableCell className="font-medium py-3.5">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="font-bold text-foreground hover:text-primary transition-colors cursor-pointer text-sm"
                                                onClick={() => onViewTimeline(order._id)}
                                            >
                                                {order.orderName}
                                            </span>
                                            {getPriorityBadge(order.priority)}
                                            {isRevision && (
                                                <Badge className="bg-red-500/15 text-red-600 border-red-500/30 text-[10px] py-0 font-bold">
                                                    Revision
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>

                                    {/* Total Quantity */}
                                    <TableCell className="text-center font-extrabold text-foreground text-sm py-3.5">
                                        {order.imageQuantity}
                                    </TableCell>

                                    {/* Stage Breakdown & Progress */}
                                    <TableCell className="py-3.5">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-bold text-foreground">
                                                    {prog.overallPercentage}% Done
                                                </span>
                                                <span className="text-[11px] text-muted-foreground">
                                                    {prog.totalShiftsLogged} shifts logged
                                                </span>
                                            </div>

                                            <Progress value={prog.overallPercentage} className="h-2" />

                                            {/* Multi-stage Dynamic Badges */}
                                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                                {Object.entries(prog.stages || {}).map(([stKey, stData]: [string, any]) => {
                                                    const count = stData?.completed || 0;
                                                    if (count <= 0) return null;
                                                    const stageLabel =
                                                        STAGE_LABELS[stKey as ProductionStage] ||
                                                        stKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                                                    return (
                                                        <Badge
                                                            key={stKey}
                                                            variant="outline"
                                                            className="text-[10px] py-0 bg-primary/5 border-primary/20 text-primary font-medium"
                                                        >
                                                            {stageLabel}: <strong>{count}</strong>
                                                        </Badge>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </TableCell>

                                    {/* Remaining Images */}
                                    <TableCell className="py-3.5">
                                        {order.status === 'revision' || ((prog as any)?.totalRejected || 0) > 0 ? (
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-bold text-sm text-destructive">
                                                    {prog.remainingImages || (prog as any)?.totalRejected || 0}
                                                </span>
                                                <Badge variant="outline" className="text-[10px] py-0 px-1 font-bold bg-destructive/10 text-destructive border-destructive/30">
                                                    revision
                                                </Badge>
                                            </div>
                                        ) : (
                                            <span
                                                className={`font-bold text-sm ${
                                                    prog.remainingImages > 0
                                                        ? 'text-amber-600 dark:text-amber-400'
                                                        : 'text-emerald-600 dark:text-emerald-400'
                                                }`}
                                            >
                                                {prog.remainingImages}{' '}
                                                <span className="text-xs font-normal text-muted-foreground">left</span>
                                            </span>
                                        )}
                                    </TableCell>

                                    {/* Deadline */}
                                    <TableCell className="text-xs py-3.5">
                                        <div className="space-y-0.5">
                                            <div className="font-semibold text-foreground">
                                                {order.deadline ? format(new Date(order.deadline), 'dd MMM yyyy') : 'N/A'}
                                            </div>
                                            {order.deadline && (
                                                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {formatDistanceToNow(new Date(order.deadline), { addSuffix: true })}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>

                                    {/* Latest Shift In-charge */}
                                    <TableCell className="text-xs py-3.5">
                                        {prog.latestShiftLog ? (
                                            <div className="space-y-0.5">
                                                <div className="font-semibold text-foreground flex items-center gap-1">
                                                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-bold">
                                                        {prog.latestShiftLog.shiftName}
                                                    </Badge>
                                                    <span className="truncate max-w-[120px]">
                                                        {prog.latestShiftLog.teamLeaderName}
                                                    </span>
                                                </div>
                                                <div className="text-[11px] text-muted-foreground truncate max-w-[150px]">
                                                    +{prog.latestShiftLog.completedQuantity} imgs ({prog.latestShiftLog.stage})
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground italic">No shift logs yet</span>
                                        )}
                                    </TableCell>

                                    {/* Actions */}
                                    <TableCell className="text-right py-3.5 pr-4">
                                        <div className="flex items-center justify-end gap-1.5">
                                            {prog.overallPercentage >= 100 || prog.remainingImages <= 0 || order.status === 'completed' ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled
                                                    className="h-8 text-xs font-semibold gap-1 opacity-60 cursor-not-allowed bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                                    title="All images in this order have been completed and passed QC"
                                                >
                                                    <Check className="h-3.5 w-3.5" /> Done
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => onLogProgress(order._id)}
                                                    className="h-8 text-xs font-semibold gap-1 bg-primary/5 hover:bg-primary/10 text-primary border-primary/20"
                                                >
                                                    <Plus className="h-3.5 w-3.5" /> Output
                                                </Button>
                                            )}

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onViewTimeline(order._id)}
                                                title="View Workflow Timeline"
                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                            >
                                                <History className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border/60 bg-muted/10">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                        Showing {(safePage - 1) * limit + 1} to{' '}
                        {Math.min(safePage * limit, orders.length)} of {orders.length} orders
                    </span>
                    <Select
                        value={limit.toString()}
                        onValueChange={(val) => {
                            setLimit(Number(val));
                            setPage(1);
                        }}
                    >
                        <SelectTrigger className="h-8 w-[72px] text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {PER_PAGE_OPTIONS.map((opt) => (
                                <SelectItem key={opt} value={opt.toString()} className="text-xs">
                                    {opt}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <span>per page</span>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setPage(1)}
                            disabled={safePage === 1}
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={safePage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <div className="flex items-center gap-1 px-2 text-xs font-medium">
                            <span>Page</span>
                            <strong className="text-foreground">{safePage}</strong>
                            <span>of</span>
                            <strong className="text-foreground">{totalPages}</strong>
                        </div>

                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={safePage === totalPages}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setPage(totalPages)}
                            disabled={safePage === totalPages}
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
