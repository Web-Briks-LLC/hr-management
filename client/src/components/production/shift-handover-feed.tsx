'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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
import { IShiftProduction, STAGE_LABELS, STATUS_LABELS } from '@/types/production.type';
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
} from 'lucide-react';

interface ShiftHandoverFeedProps {
    logs: IShiftProduction[];
    isLoading: boolean;
    isAdmin: boolean;
    onEditLog: (log: IShiftProduction) => void;
    onQCCheck: (log: IShiftProduction) => void;
    onDeleteLog: (id: string) => void;
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
    const [page, setPage] = useState<number>(1);
    const [limit, setLimit] = useState<number>(10);

    const totalPages = Math.max(1, Math.ceil(logs.length / limit));
    const safePage = Math.min(page, totalPages);

    const paginatedLogs = useMemo(() => {
        const start = (safePage - 1) * limit;
        return logs.slice(start, start + limit);
    }, [logs, safePage, limit]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-2xl" />
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

    return (
        <div className="space-y-4">
            {/* View Mode Toggle Header */}
            <div className="flex items-center justify-between gap-2 pb-1">
                <div className="text-xs text-muted-foreground font-medium">
                    Showing <strong className="text-foreground">{logs.length}</strong> total shift output entries
                </div>
                <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border/60">
                    <Button
                        variant={viewMode === 'cards' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('cards')}
                        className="h-7 text-xs px-2.5 gap-1.5 shadow-none"
                    >
                        <LayoutGrid className="h-3.5 w-3.5" /> Detailed Cards
                    </Button>
                    <Button
                        variant={viewMode === 'table' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('table')}
                        className="h-7 text-xs px-2.5 gap-1.5 shadow-none"
                    >
                        <TableIcon className="h-3.5 w-3.5" /> Compact Table
                    </Button>
                </div>
            </div>

            {/* Detailed Cards View */}
            {viewMode === 'cards' && (
                <div className="space-y-4">
                    {paginatedLogs.map((log) => {
                        const statusMeta = STATUS_LABELS[log.status] || STATUS_LABELS['in_progress'];

                        return (
                            <Card
                                key={log._id}
                                className="border-border/60 shadow-xs hover:border-primary/40 transition-all overflow-hidden"
                            >
                                <CardContent className="p-4 sm:p-6 space-y-4">
                                    {/* Card Header Row */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
                                        <div className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge className="bg-primary text-primary-foreground font-bold px-2.5">
                                                    {log.shiftId?.name || 'Shift'}
                                                </Badge>
                                                <span className="font-extrabold text-foreground text-base">
                                                    {log.orderId?.orderName || 'Order'}
                                                </span>
                                                <Badge variant="outline" className="text-xs font-semibold text-primary">
                                                    {STAGE_LABELS[log.stage] || log.stage}
                                                </Badge>
                                            </div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                <span>
                                                    Client: <strong>{log.orderId?.clientId?.name || 'N/A'}</strong>
                                                </span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {format(new Date(log.date), 'dd MMM, yyyy')}
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

                                    {/* Images and Metrics Grid */}
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
                                                {log.orderId?.imageQuantity || 'N/A'} images
                                            </span>
                                        </div>

                                        <div>
                                            <span className="text-muted-foreground block">Quality Check</span>
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                                                {log.qc ? `✓ ${log.qc.passedCount || 0} passed` : 'Pending Review'}
                                                {log.qc?.rejectedCount ? (
                                                    <span className="text-destructive ml-1">
                                                        ({log.qc.rejectedCount} rejected)
                                                    </span>
                                                ) : null}
                                            </span>
                                        </div>

                                        <div>
                                            <span className="text-muted-foreground block">Assigned Editors</span>
                                            <span className="font-bold text-foreground block mt-0.5">
                                                {log.assignedStaffs?.length || 0} floor editors
                                            </span>
                                        </div>
                                    </div>

                                    {/* Assigned Photo Editors Section */}
                                    {log.assignedStaffs && log.assignedStaffs.length > 0 && (
                                        <div className="space-y-1.5">
                                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                                                Editor Output Breakdown:
                                            </span>
                                            <div className="flex flex-wrap gap-2">
                                                {log.assignedStaffs.map((st, idx) => {
                                                    const editorName =
                                                        st.staffId?.userId?.name || st.staffId?.staffId || 'Editor';
                                                    const editorImage =
                                                        (st.staffId as any)?.userId?.image ||
                                                        (st.staffId as any)?.image ||
                                                        '';
                                                    return (
                                                        <Badge
                                                            key={idx}
                                                            variant="secondary"
                                                            className="text-xs py-1 px-2.5 gap-1.5 font-normal bg-background border border-border/60"
                                                        >
                                                            <Avatar className="h-4 w-4 shrink-0 border border-muted">
                                                                {editorImage && (
                                                                    <AvatarImage src={editorImage} alt={editorName} />
                                                                )}
                                                                <AvatarFallback className="text-[7px] font-bold bg-primary/10 text-primary uppercase">
                                                                    {editorName.slice(0, 2).toUpperCase()}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span>{editorName}</span>
                                                            <strong className="text-primary font-bold">
                                                                {st.imageCount} imgs
                                                            </strong>
                                                        </Badge>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Handover & Bottleneck Notes */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                        {log.handoverNotes && (
                                            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs space-y-1">
                                                <div className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                                                    <CheckCircle2 className="h-4 w-4" /> Shift Handover Note
                                                </div>
                                                <p className="text-muted-foreground leading-relaxed">
                                                    {log.handoverNotes}
                                                </p>
                                            </div>
                                        )}

                                        {log.bottlenecks && (
                                            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs space-y-1">
                                                <div className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                                    <AlertCircle className="h-4 w-4" /> Bottlenecks &amp; Delays
                                                </div>
                                                <p className="text-muted-foreground leading-relaxed">
                                                    {log.bottlenecks}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons Row */}
                                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onQCCheck(log)}
                                            className="h-8 text-xs font-semibold gap-1.5 text-purple-600 hover:text-purple-700 dark:text-purple-400 border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10"
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

            {/* Compact Table View */}
            {viewMode === 'table' && (
                <div className="rounded-xl border border-border/60 overflow-hidden bg-card shadow-xs">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent bg-muted/40 border-b border-border/60">
                                    <TableHead className="text-xs font-bold uppercase tracking-wider py-3.5">
                                        Date &amp; Shift
                                    </TableHead>
                                    <TableHead className="text-xs font-bold uppercase tracking-wider py-3.5">
                                        Order &amp; Client
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
                                {paginatedLogs.map((log) => {
                                    const statusMeta = STATUS_LABELS[log.status] || STATUS_LABELS['in_progress'];
                                    return (
                                        <TableRow
                                            key={log._id}
                                            className="hover:bg-muted/30 transition-colors border-b border-border/40"
                                        >
                                            <TableCell className="text-xs py-3.5">
                                                <div className="font-semibold text-foreground">
                                                    {format(new Date(log.date), 'dd MMM yyyy')}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    {log.shiftId?.name || 'Shift'} ({log.teamLeaderId?.name || 'TL'})
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs py-3.5 font-medium">
                                                <div className="font-bold text-foreground">
                                                    {log.orderId?.orderName || 'Order'}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    {log.orderId?.clientId?.name || 'Client'}
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

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-border/60 bg-card shadow-xs">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                        Showing {(safePage - 1) * limit + 1} to{' '}
                        {Math.min(safePage * limit, logs.length)} of {logs.length} shift logs
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
