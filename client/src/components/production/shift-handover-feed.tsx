'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
import { IShiftProduction, STAGE_LABELS, STATUS_LABELS, ProductionStatus, ProductionStage } from '@/types/production.type';
import { format } from 'date-fns';
import {
    CheckCircle2,
    AlertCircle,
    User,
    Calendar,
    ShieldCheck,
    Edit2,
    Trash2,
    Sparkles,
    LayoutGrid,
    Table as TableIcon,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    ChevronDown,
    Layers,
    ListFilter,
    History,
} from 'lucide-react';

interface ShiftHandoverFeedProps {
    logs: IShiftProduction[];
    isLoading: boolean;
    isAdmin: boolean;
    onEditLog: (log: IShiftProduction) => void;
    onQCCheck: (log: IShiftProduction) => void;
    onDeleteLog: (id: string) => void;
}

export interface IOrderGroup {
    orderId: string;
    orderName: string;
    clientName: string;
    totalImageQuantity?: number;
    logs: IShiftProduction[];
    latestLog: IShiftProduction;
    earliestLog: IShiftProduction;
    totalCompletedSubmitted: number;
    totalPassedQC: number;
    totalRejectedQC: number;
    hasPendingQC: boolean;
    currentStatus: ProductionStatus;
    currentStage: ProductionStage;
    revisionCount: number;
}

const PER_PAGE_OPTIONS = [10, 20, 50, 100];

export function ShiftHandoverFeed({
    logs,
    isLoading,
    isAdmin,
    onEditLog,
    onQCCheck,
    onDeleteLog,
}: ShiftHandoverFeedProps) {
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
    const [groupMode, setGroupMode] = useState<'grouped' | 'flat'>('grouped');
    const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
    const [page, setPage] = useState<number>(1);
    const [limit, setLimit] = useState<number>(10);

    // Toggle expand/collapse for a specific order group
    const toggleOrderExpand = (orderId: string) => {
        setExpandedOrders((prev) => ({
            ...prev,
            [orderId]: !prev[orderId],
        }));
    };

    // Group logs by orderId
    const orderGroups: IOrderGroup[] = useMemo(() => {
        if (!logs || logs.length === 0) return [];

        const groupMap = new Map<string, IShiftProduction[]>();

        logs.forEach((log) => {
            const oId = (log.orderId as any)?._id || (log.orderId as any) || 'unassigned';
            const existing = groupMap.get(oId) || [];
            existing.push(log);
            groupMap.set(oId, existing);
        });

        const groups: IOrderGroup[] = [];

        groupMap.forEach((groupLogs, oId) => {
            // Sort chronologically ascending (oldest first) so index 0 = Initial Run, index 1 = Revision 1, etc.
            const sortedAsc = [...groupLogs].sort(
                (a, b) => new Date(a.date || a.createdAt || 0).getTime() - new Date(b.date || b.createdAt || 0).getTime()
            );

            // Latest log is the most recent submission
            const latestLog = sortedAsc[sortedAsc.length - 1];
            const earliestLog = sortedAsc[0];

            let totalCompletedSubmitted = 0;
            let totalPassedQC = 0;
            let totalRejectedQC = 0;
            let hasPendingQC = false;

            sortedAsc.forEach((l) => {
                totalCompletedSubmitted += l.completedQuantity || 0;
                if (l.qc) {
                    totalPassedQC += l.qc.passedCount || 0;
                    totalRejectedQC += l.qc.rejectedCount || 0;
                } else {
                    hasPendingQC = true;
                }
            });

            const orderName = (latestLog.orderId as any)?.orderName || 'Unassigned Order';
            const clientName = (latestLog.orderId as any)?.clientId?.name || 'N/A';
            const totalImageQuantity = (latestLog.orderId as any)?.imageQuantity;

            groups.push({
                orderId: oId,
                orderName,
                clientName,
                totalImageQuantity,
                logs: sortedAsc,
                latestLog,
                earliestLog,
                totalCompletedSubmitted,
                totalPassedQC,
                totalRejectedQC,
                hasPendingQC,
                currentStatus: latestLog.status,
                currentStage: latestLog.stage,
                revisionCount: Math.max(0, sortedAsc.length - 1),
            });
        });

        // Sort groups by latest log date descending (most recently updated orders first)
        return groups.sort(
            (a, b) =>
                new Date(b.latestLog.date || b.latestLog.createdAt || 0).getTime() -
                new Date(a.latestLog.date || a.latestLog.createdAt || 0).getTime()
        );
    }, [logs]);

    // Pagination for Grouped view
    const totalGroupPages = Math.max(1, Math.ceil(orderGroups.length / limit));
    const safeGroupPage = Math.min(page, totalGroupPages);
    const paginatedGroups = useMemo(() => {
        const start = (safeGroupPage - 1) * limit;
        return orderGroups.slice(start, start + limit);
    }, [orderGroups, safeGroupPage, limit]);

    // Pagination for Flat view
    const totalFlatPages = Math.max(1, Math.ceil(logs.length / limit));
    const safeFlatPage = Math.min(page, totalFlatPages);
    const paginatedFlatLogs = useMemo(() => {
        const start = (safeFlatPage - 1) * limit;
        return logs.slice(start, start + limit);
    }, [logs, safeFlatPage, limit]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                ))}
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="text-center py-16 border border-dashed rounded-2xl bg-muted/10">
                <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm font-semibold text-foreground">No shift logs found</p>
                <p className="text-xs text-muted-foreground mt-1">
                    Shift production outputs and handover briefings will appear here.
                </p>
            </div>
        );
    }

    // Helper to get Cycle badge info
    const getCycleBadge = (index: number, total: number) => {
        if (index === 0) {
            return (
                <Badge variant="outline" className="text-[10px] py-0 px-2 font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                    Cycle 1: Initial Run
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="text-[10px] py-0 px-2 font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                Cycle {index + 1}: Revision #{index}
            </Badge>
        );
    };

    return (
        <div className="space-y-4">
            {/* View Mode & Grouping Controls Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
                <div className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                    {groupMode === 'grouped' ? (
                        <>
                            Showing <strong className="text-foreground">{orderGroups.length}</strong> active orders (
                            <span className="text-muted-foreground">{logs.length} total shift logs</span>)
                        </>
                    ) : (
                        <>
                            Showing <strong className="text-foreground">{logs.length}</strong> total shift logs
                        </>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Grouping Mode Switcher */}
                    <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border/60">
                        <Button
                            variant={groupMode === 'grouped' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => {
                                setGroupMode('grouped');
                                setPage(1);
                            }}
                            className="h-7 text-xs px-2.5 gap-1.5 shadow-none font-semibold"
                            title="Group all revisions under 1 order row with collapsible accordion"
                        >
                            <Layers className="h-3.5 w-3.5" /> Group by Order
                        </Button>
                        <Button
                            variant={groupMode === 'flat' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => {
                                setGroupMode('flat');
                                setPage(1);
                            }}
                            className="h-7 text-xs px-2.5 gap-1.5 shadow-none"
                            title="Flat chronological audit ledger of every single log"
                        >
                            <ListFilter className="h-3.5 w-3.5" /> Flat Ledger
                        </Button>
                    </div>

                    {/* View Mode Switcher (Cards vs Table) */}
                    <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border/60">
                        <Button
                            variant={viewMode === 'table' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('table')}
                            className="h-7 text-xs px-2.5 gap-1.5 shadow-none"
                        >
                            <TableIcon className="h-3.5 w-3.5" /> Compact Table
                        </Button>
                        <Button
                            variant={viewMode === 'cards' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('cards')}
                            className="h-7 text-xs px-2.5 gap-1.5 shadow-none"
                        >
                            <LayoutGrid className="h-3.5 w-3.5" /> Detailed Cards
                        </Button>
                    </div>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 1. MASTER-DETAIL GROUPED TABLE VIEW (DEFAULT & HIGHLY STRUCTURED)        */}
            {/* ========================================================================= */}
            {groupMode === 'grouped' && viewMode === 'table' && (
                <div className="rounded-xl border border-border/60 overflow-hidden bg-card shadow-xs">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent bg-muted/40 border-b border-border/60">
                                    <TableHead className="w-[40px] px-3 text-center"></TableHead>
                                    <TableHead className="text-xs font-bold uppercase tracking-wider py-3.5">
                                        Order Title
                                    </TableHead>
                                    <TableHead className="text-xs font-bold uppercase tracking-wider py-3.5">
                                        Latest Shift &amp; TL
                                    </TableHead>
                                    <TableHead className="text-xs font-bold uppercase tracking-wider py-3.5">
                                        Stage &amp; Revision Cycle
                                    </TableHead>
                                    <TableHead className="text-xs font-bold uppercase tracking-wider text-center py-3.5">
                                        Output Logged
                                    </TableHead>
                                    <TableHead className="text-xs font-bold uppercase tracking-wider py-3.5">
                                        Current Status
                                    </TableHead>
                                    <TableHead className="text-xs font-bold uppercase tracking-wider py-3.5">
                                        QC Summary
                                    </TableHead>
                                    <TableHead className="text-xs font-bold uppercase tracking-wider text-right py-3.5 pr-4">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedGroups.map((group) => {
                                    const isExpanded = !!expandedOrders[group.orderId];
                                    const latestLog = group.latestLog;
                                    const statusMeta = STATUS_LABELS[group.currentStatus] || STATUS_LABELS['in_progress'];
                                    const hasRevisions = group.revisionCount > 0;

                                    return (
                                        <React.Fragment key={group.orderId}>
                                            {/* MASTER ROW */}
                                            <TableRow
                                                className={`transition-colors border-b border-border/40 cursor-pointer ${
                                                    isExpanded ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/30'
                                                }`}
                                                onClick={() => toggleOrderExpand(group.orderId)}
                                            >
                                                {/* Expand / Collapse Icon */}
                                                <TableCell className="w-[40px] px-3 text-center py-3.5">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleOrderExpand(group.orderId);
                                                        }}
                                                    >
                                                        {isExpanded ? (
                                                            <ChevronDown className="h-4 w-4 text-primary" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </TableCell>

                                                {/* Order Title */}
                                                <TableCell className="py-3.5 font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-foreground text-sm hover:text-primary transition-colors">
                                                            {group.orderName}
                                                        </span>
                                                        {hasRevisions && (
                                                            <Badge
                                                                variant="outline"
                                                                className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] py-0 px-1.5 font-bold"
                                                            >
                                                                {group.logs.length} Cycles
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* Latest Shift & TL */}
                                                <TableCell className="text-xs py-3.5">
                                                    <div className="font-semibold text-foreground">
                                                        {latestLog.date ? format(new Date(latestLog.date), 'dd MMM yyyy') : 'N/A'}
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground">
                                                        {latestLog.shiftId?.name || 'Shift'} ({latestLog.teamLeaderId?.name || 'TL'})
                                                    </div>
                                                </TableCell>

                                                {/* Stage & Revision Cycle */}
                                                <TableCell className="py-3.5">
                                                    <div className="space-y-1">
                                                        <Badge variant="outline" className="text-[11px] font-medium">
                                                            {STAGE_LABELS[group.currentStage] || group.currentStage}
                                                        </Badge>
                                                        <div>
                                                            {hasRevisions ? (
                                                                <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 block">
                                                                    Cycle {group.logs.length} (Rev #{group.revisionCount})
                                                                </span>
                                                            ) : (
                                                                <span className="text-[11px] text-muted-foreground block">
                                                                    Cycle 1 (Initial Run)
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* Output Logged */}
                                                <TableCell className="text-center py-3.5">
                                                    <div className="font-bold text-primary text-sm">
                                                        {latestLog.completedQuantity} imgs
                                                    </div>
                                                    {hasRevisions && (
                                                        <div className="text-[10px] text-muted-foreground font-medium">
                                                            (Sum: {group.totalCompletedSubmitted} imgs)
                                                        </div>
                                                    )}
                                                </TableCell>

                                                {/* Status */}
                                                <TableCell className="py-3.5">
                                                    <Badge className={`${statusMeta.bg} text-[10px] py-0`}>
                                                        {statusMeta.label}
                                                    </Badge>
                                                </TableCell>

                                                {/* QC Summary */}
                                                <TableCell className="text-xs py-3.5 font-medium">
                                                    {latestLog.qc ? (
                                                        <div className="space-y-0.5">
                                                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold block">
                                                                ✓ {latestLog.qc.passedCount} passed
                                                            </span>
                                                            {latestLog.qc.rejectedCount ? (
                                                                <span className="text-destructive text-[11px] font-medium block">
                                                                    ✗ {latestLog.qc.rejectedCount} rejected
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground italic">Pending Review</span>
                                                    )}
                                                </TableCell>

                                                {/* Actions */}
                                                <TableCell className="text-right py-3.5 pr-4">
                                                    <div
                                                        className="flex items-center justify-end gap-1"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => toggleOrderExpand(group.orderId)}
                                                            className="h-7 text-xs px-2 gap-1"
                                                        >
                                                            <History className="h-3 w-3" />
                                                            {isExpanded ? 'Hide History' : `History (${group.logs.length})`}
                                                        </Button>

                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => onQCCheck(latestLog)}
                                                            className="h-7 text-xs text-purple-600 hover:text-purple-700 px-2"
                                                        >
                                                            QC
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => onEditLog(latestLog)}
                                                            className="h-7 text-xs px-2"
                                                        >
                                                            Edit
                                                        </Button>
                                                        {isAdmin && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => onDeleteLog(latestLog._id)}
                                                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>

                                            {/* EXPANDED DETAIL SUB-TABLE / REVISION TIMELINE */}
                                            {isExpanded && (
                                                <TableRow className="bg-muted/15 hover:bg-muted/15 border-b border-border/60">
                                                    <TableCell colSpan={8} className="p-0">
                                                        <div className="p-4 sm:p-5 pl-12 space-y-3 bg-linear-to-r from-primary/5 via-muted/20 to-transparent border-l-4 border-l-primary">
                                                            {/* Nested Header */}
                                                            <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/50">
                                                                <div className="flex items-center gap-2">
                                                                    <History className="h-4 w-4 text-primary" />
                                                                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                                                                        Submission &amp; Revision Cycles for{' '}
                                                                        <span className="text-primary">{group.orderName}</span>
                                                                    </h4>
                                                                </div>
                                                                <span className="text-xs text-muted-foreground">
                                                                    Total {group.logs.length} cycle(s) recorded
                                                                </span>
                                                            </div>

                                                            {/* Nested Table */}
                                                            <div className="rounded-lg border border-border/50 overflow-hidden bg-card/80">
                                                                <Table>
                                                                    <TableHeader>
                                                                        <TableRow className="bg-muted/30 hover:bg-transparent text-[11px]">
                                                                            <TableHead className="py-2 h-8 font-bold">Cycle &amp; Stage</TableHead>
                                                                            <TableHead className="py-2 h-8 font-bold">Shift &amp; Date</TableHead>
                                                                            <TableHead className="py-2 h-8 font-bold">Team Leader</TableHead>
                                                                            <TableHead className="py-2 h-8 font-bold text-center">Output</TableHead>
                                                                            <TableHead className="py-2 h-8 font-bold">Status</TableHead>
                                                                            <TableHead className="py-2 h-8 font-bold">QC Result &amp; Notes</TableHead>
                                                                            <TableHead className="py-2 h-8 font-bold text-right pr-3">Actions</TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {group.logs.map((log, logIdx) => {
                                                                            const logStatusMeta = STATUS_LABELS[log.status] || STATUS_LABELS['in_progress'];

                                                                            return (
                                                                                <TableRow
                                                                                    key={log._id}
                                                                                    className="hover:bg-muted/40 transition-colors text-xs border-b border-border/30 last:border-0"
                                                                                >
                                                                                    {/* Cycle Badge & Stage */}
                                                                                    <TableCell className="py-2.5 font-medium">
                                                                                        <div className="space-y-1">
                                                                                            {getCycleBadge(logIdx, group.logs.length)}
                                                                                            <div className="text-[11px] text-muted-foreground">
                                                                                                {STAGE_LABELS[log.stage] || log.stage}
                                                                                            </div>
                                                                                        </div>
                                                                                    </TableCell>

                                                                                    {/* Shift & Date */}
                                                                                    <TableCell className="py-2.5">
                                                                                        <div className="font-semibold text-foreground">
                                                                                            {log.date ? format(new Date(log.date), 'dd MMM yyyy') : 'N/A'}
                                                                                        </div>
                                                                                        <div className="text-[11px] text-muted-foreground">
                                                                                            {log.shiftId?.name || 'Shift'}
                                                                                        </div>
                                                                                    </TableCell>

                                                                                    {/* Team Leader */}
                                                                                    <TableCell className="py-2.5 text-muted-foreground font-medium">
                                                                                        {log.teamLeaderId?.name || 'TL'}
                                                                                    </TableCell>

                                                                                    {/* Output */}
                                                                                    <TableCell className="py-2.5 text-center font-bold text-primary">
                                                                                        {log.completedQuantity} imgs
                                                                                    </TableCell>

                                                                                    {/* Status */}
                                                                                    <TableCell className="py-2.5">
                                                                                        <Badge className={`${logStatusMeta.bg} text-[9px] py-0`}>
                                                                                            {logStatusMeta.label}
                                                                                        </Badge>
                                                                                    </TableCell>

                                                                                    {/* QC Result */}
                                                                                    <TableCell className="py-2.5">
                                                                                        {log.qc ? (
                                                                                            <div className="space-y-0.5">
                                                                                                <div className="flex items-center gap-1.5">
                                                                                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                                                                                                        ✓ {log.qc.passedCount} passed
                                                                                                    </span>
                                                                                                    {log.qc.rejectedCount ? (
                                                                                                        <span className="text-destructive font-bold text-[11px]">
                                                                                                            ✗ {log.qc.rejectedCount} rejected
                                                                                                        </span>
                                                                                                    ) : null}
                                                                                                </div>
                                                                                                {log.qc.qcNotes && (
                                                                                                    <p className="text-[10px] text-muted-foreground italic truncate max-w-[200px]">
                                                                                                        Note: &quot;{log.qc.qcNotes}&quot;
                                                                                                    </p>
                                                                                                )}
                                                                                            </div>
                                                                                        ) : (
                                                                                            <span className="text-muted-foreground italic text-[11px]">Pending</span>
                                                                                        )}
                                                                                    </TableCell>

                                                                                    {/* Actions */}
                                                                                    <TableCell className="py-2.5 text-right pr-3">
                                                                                        <div className="flex items-center justify-end gap-1">
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="sm"
                                                                                                onClick={() => onQCCheck(log)}
                                                                                                className="h-6 text-[11px] text-purple-600 hover:text-purple-700 px-2"
                                                                                            >
                                                                                                QC
                                                                                            </Button>
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="sm"
                                                                                                onClick={() => onEditLog(log)}
                                                                                                className="h-6 text-[11px] px-2"
                                                                                            >
                                                                                                Edit
                                                                                            </Button>
                                                                                            {isAdmin && (
                                                                                                <Button
                                                                                                    variant="ghost"
                                                                                                    size="icon"
                                                                                                    onClick={() => onDeleteLog(log._id)}
                                                                                                    className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                                                                                >
                                                                                                    <Trash2 className="h-3 w-3" />
                                                                                                </Button>
                                                                                            )}
                                                                                        </div>
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            );
                                                                        })}
                                                                    </TableBody>
                                                                </Table>
                                                            </div>

                                                            {/* Additional Handover / Bottleneck notes from latest log */}
                                                            {(latestLog.handoverNotes || latestLog.bottlenecks) && (
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                                                                    {latestLog.handoverNotes && (
                                                                        <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-[11px] space-y-0.5">
                                                                            <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                                                                <CheckCircle2 className="h-3.5 w-3.5" /> Latest Handover Note:
                                                                            </span>
                                                                            <p className="text-muted-foreground">{latestLog.handoverNotes}</p>
                                                                        </div>
                                                                    )}
                                                                    {latestLog.bottlenecks && (
                                                                        <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[11px] space-y-0.5">
                                                                            <span className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                                                                <AlertCircle className="h-3.5 w-3.5" /> Latest Bottlenecks:
                                                                            </span>
                                                                            <p className="text-muted-foreground">{latestLog.bottlenecks}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 2. MASTER-DETAIL GROUPED CARDS VIEW                                      */}
            {/* ========================================================================= */}
            {groupMode === 'grouped' && viewMode === 'cards' && (
                <div className="space-y-4">
                    {paginatedGroups.map((group) => {
                        const isExpanded = !!expandedOrders[group.orderId];
                        const latestLog = group.latestLog;
                        const statusMeta = STATUS_LABELS[group.currentStatus] || STATUS_LABELS['in_progress'];
                        const hasRevisions = group.revisionCount > 0;

                        return (
                            <Card
                                key={group.orderId}
                                className="border-border/60 shadow-xs hover:border-primary/40 transition-all overflow-hidden"
                            >
                                <CardContent className="p-4 sm:p-6 space-y-4">
                                    {/* Card Header Row */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
                                        <div className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge className="bg-primary text-primary-foreground font-bold px-2.5">
                                                    {latestLog.shiftId?.name || 'Shift'}
                                                </Badge>
                                                <span className="font-extrabold text-foreground text-base">
                                                    {group.orderName}
                                                </span>
                                                <Badge variant="outline" className="text-xs font-semibold text-primary">
                                                    {STAGE_LABELS[group.currentStage] || group.currentStage}
                                                </Badge>
                                                {hasRevisions && (
                                                    <Badge
                                                        variant="outline"
                                                        className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-bold"
                                                    >
                                                        Cycle {group.logs.length} ({group.revisionCount} Revisions)
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {latestLog.date ? format(new Date(latestLog.date), 'dd MMM, yyyy') : 'N/A'}
                                                </span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <User className="h-3 w-3" />
                                                    TL: <strong>{latestLog.teamLeaderId?.name || 'Team Leader'}</strong>
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 self-start sm:self-auto">
                                            <Badge className={statusMeta.bg}>{statusMeta.label}</Badge>
                                        </div>
                                    </div>

                                    {/* Metrics Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-muted/20 p-3 rounded-xl border border-border/40">
                                        <div>
                                            <span className="text-muted-foreground block">Latest Output</span>
                                            <span className="text-xl font-black text-foreground">
                                                {latestLog.completedQuantity}{' '}
                                                <span className="text-xs font-normal text-muted-foreground">imgs</span>
                                            </span>
                                        </div>

                                        <div>
                                            <span className="text-muted-foreground block">Total Order Size</span>
                                            <span className="text-base font-bold text-foreground block mt-0.5">
                                                {group.totalImageQuantity || 'N/A'} images
                                            </span>
                                        </div>

                                        <div>
                                            <span className="text-muted-foreground block">Quality Check</span>
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                                                {latestLog.qc ? `✓ ${latestLog.qc.passedCount || 0} passed` : 'Pending Review'}
                                                {latestLog.qc?.rejectedCount ? (
                                                    <span className="text-destructive ml-1">
                                                        ({latestLog.qc.rejectedCount} rejected)
                                                    </span>
                                                ) : null}
                                            </span>
                                        </div>

                                        <div>
                                            <span className="text-muted-foreground block">Revision History</span>
                                            <span className="font-bold text-foreground block mt-0.5">
                                                {group.logs.length} cycle(s) logged
                                            </span>
                                        </div>
                                    </div>

                                    {/* Accordion Toggle & Action Buttons */}
                                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => toggleOrderExpand(group.orderId)}
                                            className="h-8 text-xs font-semibold gap-1.5 text-primary hover:text-primary hover:bg-primary/10"
                                        >
                                            <History className="h-3.5 w-3.5" />
                                            {isExpanded ? 'Hide Revision Cycles' : `View Revision Cycles (${group.logs.length})`}
                                            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                        </Button>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onQCCheck(latestLog)}
                                                className="h-8 text-xs font-semibold gap-1.5 text-purple-600 hover:text-purple-700 dark:text-purple-400 border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10"
                                            >
                                                <ShieldCheck className="h-3.5 w-3.5" /> Quality Check
                                            </Button>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onEditLog(latestLog)}
                                                className="h-8 text-xs gap-1.5"
                                            >
                                                <Edit2 className="h-3.5 w-3.5" /> Edit Log
                                            </Button>

                                            {isAdmin && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => onDeleteLog(latestLog._id)}
                                                    className="h-8 text-xs text-destructive hover:bg-destructive/10 gap-1.5"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" /> Delete
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded Revision Cycles Inside Card */}
                                    {isExpanded && (
                                        <div className="space-y-2 pt-2 border-t border-border/50">
                                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                                                All Revision &amp; Shift Submissions:
                                            </span>
                                            <div className="space-y-2">
                                                {group.logs.map((log, lIdx) => (
                                                    <div
                                                        key={log._id}
                                                        className="p-3 rounded-xl bg-muted/40 border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                                                    >
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                {getCycleBadge(lIdx, group.logs.length)}
                                                                <span className="font-bold text-foreground">
                                                                    {log.completedQuantity} imgs
                                                                </span>
                                                                <span className="text-muted-foreground">•</span>
                                                                <span className="text-muted-foreground">
                                                                    {log.shiftId?.name || 'Shift'} ({log.teamLeaderId?.name || 'TL'})
                                                                </span>
                                                            </div>
                                                            <div className="text-[11px] text-muted-foreground">
                                                                {log.date ? format(new Date(log.date), 'dd MMM yyyy') : 'N/A'} • {STAGE_LABELS[log.stage] || log.stage}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            {log.qc ? (
                                                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                                                                    ✓ {log.qc.passedCount} passed
                                                                    {log.qc.rejectedCount ? ` (${log.qc.rejectedCount} rej)` : ''}
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted-foreground italic text-xs">QC Pending</span>
                                                            )}
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => onQCCheck(log)}
                                                                className="h-7 text-xs text-purple-600 px-2"
                                                            >
                                                                QC
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => onEditLog(log)}
                                                                className="h-7 text-xs px-2"
                                                            >
                                                                Edit
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* ========================================================================= */}
            {/* 3. FLAT AUDIT LEDGER TABLE VIEW (FOR RAW AUDIT COMPLIANCE)                */}
            {/* ========================================================================= */}
            {groupMode === 'flat' && viewMode === 'table' && (
                <div className="rounded-xl border border-border/60 overflow-hidden bg-card shadow-xs">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent bg-muted/40 border-b border-border/60">
                                    <TableHead className="text-xs font-bold uppercase tracking-wider py-3.5">
                                        Date &amp; Shift
                                    </TableHead>
                                    <TableHead className="text-xs font-bold uppercase tracking-wider py-3.5">
                                        Order Title
                                    </TableHead>
                                    <TableHead className="text-xs font-bold uppercase tracking-wider py-3.5">
                                        Stage
                                    </TableHead>
                                    <TableHead className="text-xs font-bold uppercase tracking-wider text-center py-3.5">
                                        Output
                                    </TableHead>
                                    <TableHead className="text-xs font-bold uppercase tracking-wider py-3.5">
                                        Status
                                    </TableHead>
                                    <TableHead className="text-xs font-bold uppercase tracking-wider py-3.5">
                                        QC Status
                                    </TableHead>
                                    <TableHead className="text-xs font-bold uppercase tracking-wider text-right py-3.5 pr-4">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedFlatLogs.map((log) => {
                                    const statusMeta = STATUS_LABELS[log.status] || STATUS_LABELS['in_progress'];
                                    return (
                                        <TableRow
                                            key={log._id}
                                            className="hover:bg-muted/30 transition-colors border-b border-border/40"
                                        >
                                            <TableCell className="text-xs py-3.5">
                                                <div className="font-semibold text-foreground">
                                                    {log.date ? format(new Date(log.date), 'dd MMM yyyy') : 'N/A'}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    {log.shiftId?.name || 'Shift'} ({log.teamLeaderId?.name || 'TL'})
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs py-3.5 font-medium">
                                                <div className="font-bold text-foreground">
                                                    {(log.orderId as any)?.orderName || 'Order'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-3.5">
                                                <Badge variant="outline" className="text-[11px] font-medium">
                                                    {STAGE_LABELS[log.stage] || log.stage}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center font-bold text-primary text-sm py-3.5">
                                                {log.completedQuantity} imgs
                                            </TableCell>
                                            <TableCell className="py-3.5">
                                                <Badge className={`${statusMeta.bg} text-[10px] py-0`}>
                                                    {statusMeta.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs py-3.5 font-medium">
                                                {log.qc ? (
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                                        ✓ {log.qc.passedCount} passed
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground italic">Pending</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right py-3.5 pr-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => onQCCheck(log)}
                                                        className="h-7 text-xs text-purple-600 hover:text-purple-700 px-2"
                                                    >
                                                        QC
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => onEditLog(log)}
                                                        className="h-7 text-xs px-2"
                                                    >
                                                        Edit
                                                    </Button>
                                                    {isAdmin && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => onDeleteLog(log._id)}
                                                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 4. FLAT CARDS VIEW                                                       */}
            {/* ========================================================================= */}
            {groupMode === 'flat' && viewMode === 'cards' && (
                <div className="space-y-4">
                    {paginatedFlatLogs.map((log) => {
                        const statusMeta = STATUS_LABELS[log.status] || STATUS_LABELS['in_progress'];

                        return (
                            <Card
                                key={log._id}
                                className="border-border/60 shadow-xs hover:border-primary/40 transition-all overflow-hidden"
                            >
                                <CardContent className="p-4 sm:p-6 space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
                                        <div className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge className="bg-primary text-primary-foreground font-bold px-2.5">
                                                    {log.shiftId?.name || 'Shift'}
                                                </Badge>
                                                <span className="font-extrabold text-foreground text-base">
                                                    {(log.orderId as any)?.orderName || 'Order'}
                                                </span>
                                                <Badge variant="outline" className="text-xs font-semibold text-primary">
                                                    {STAGE_LABELS[log.stage] || log.stage}
                                                </Badge>
                                            </div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {log.date ? format(new Date(log.date), 'dd MMM, yyyy') : 'N/A'}
                                                </span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <User className="h-3 w-3" />
                                                    TL: <strong>{log.teamLeaderId?.name || 'Team Leader'}</strong>
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 self-start sm:self-auto">
                                            <Badge className={statusMeta.bg}>{statusMeta.label}</Badge>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-muted/20 p-3 rounded-xl border border-border/40">
                                        <div>
                                            <span className="text-muted-foreground block">Completed in Shift</span>
                                            <span className="text-xl font-black text-foreground">
                                                {log.completedQuantity}{' '}
                                                <span className="text-xs font-normal text-muted-foreground">imgs</span>
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block">Total Order Size</span>
                                            <span className="text-base font-bold text-foreground block mt-0.5">
                                                {(log.orderId as any)?.imageQuantity || 'N/A'} images
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block">Quality Check</span>
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                                                {log.qc ? `✓ ${log.qc.passedCount || 0} passed` : 'Pending Review'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block">Assigned Editors</span>
                                            <span className="font-bold text-foreground block mt-0.5">
                                                {log.assignedStaffs?.length || 0} floor editors
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onQCCheck(log)}
                                            className="h-8 text-xs font-semibold gap-1.5 text-purple-600 hover:text-purple-700"
                                        >
                                            <ShieldCheck className="h-3.5 w-3.5" /> Quality Check
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onEditLog(log)}
                                            className="h-8 text-xs gap-1.5"
                                        >
                                            <Edit2 className="h-3.5 w-3.5" /> Edit Log
                                        </Button>
                                        {isAdmin && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onDeleteLog(log._id)}
                                                className="h-8 text-xs text-destructive hover:bg-destructive/10 gap-1.5"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" /> Delete
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Pagination Controls */}
            {((groupMode === 'grouped' && orderGroups.length > 0) || (groupMode === 'flat' && logs.length > 0)) && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-border/60 bg-card shadow-xs">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                            {groupMode === 'grouped' ? (
                                <>
                                    Showing {(safeGroupPage - 1) * limit + 1} to{' '}
                                    {Math.min(safeGroupPage * limit, orderGroups.length)} of {orderGroups.length} orders
                                </>
                            ) : (
                                <>
                                    Showing {(safeFlatPage - 1) * limit + 1} to{' '}
                                    {Math.min(safeFlatPage * limit, logs.length)} of {logs.length} shift logs
                                </>
                            )}
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

                    {((groupMode === 'grouped' && totalGroupPages > 1) || (groupMode === 'flat' && totalFlatPages > 1)) && (
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setPage(1)}
                                disabled={(groupMode === 'grouped' ? safeGroupPage : safeFlatPage) === 1}
                            >
                                <ChevronsLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={(groupMode === 'grouped' ? safeGroupPage : safeFlatPage) === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>

                            <div className="flex items-center gap-1 px-2 text-xs font-medium">
                                <span>Page</span>
                                <strong className="text-foreground">
                                    {groupMode === 'grouped' ? safeGroupPage : safeFlatPage}
                                </strong>
                                <span>of</span>
                                <strong className="text-foreground">
                                    {groupMode === 'grouped' ? totalGroupPages : totalFlatPages}
                                </strong>
                            </div>

                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                    setPage((p) =>
                                        Math.min(groupMode === 'grouped' ? totalGroupPages : totalFlatPages, p + 1)
                                    )
                                }
                                disabled={
                                    (groupMode === 'grouped' ? safeGroupPage : safeFlatPage) ===
                                    (groupMode === 'grouped' ? totalGroupPages : totalFlatPages)
                                }
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setPage(groupMode === 'grouped' ? totalGroupPages : totalFlatPages)}
                                disabled={
                                    (groupMode === 'grouped' ? safeGroupPage : safeFlatPage) ===
                                    (groupMode === 'grouped' ? totalGroupPages : totalFlatPages)
                                }
                            >
                                <ChevronsRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
