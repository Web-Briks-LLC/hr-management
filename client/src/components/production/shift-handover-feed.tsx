'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { IShiftProduction, STAGE_LABELS, STATUS_LABELS } from '@/types/production.type';
import { format } from 'date-fns';
import {
    CheckCircle2,
    AlertCircle,
    User,
    Calendar,
    Clock,
    ShieldCheck,
    Edit2,
    Trash2,
    Layers,
    Sparkles,
} from 'lucide-react';

interface ShiftHandoverFeedProps {
    logs: IShiftProduction[];
    isLoading: boolean;
    isAdmin: boolean;
    onEditLog: (log: IShiftProduction) => void;
    onQCCheck: (log: IShiftProduction) => void;
    onDeleteLog: (id: string) => void;
}

export function ShiftHandoverFeed({
    logs,
    isLoading,
    isAdmin,
    onEditLog,
    onQCCheck,
    onDeleteLog,
}: ShiftHandoverFeedProps) {
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
            {logs.map((log) => {
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
                                        <span>Client: <strong>{log.orderId?.clientId?.name || 'N/A'}</strong></span>
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
                                    <span className="text-muted-foreground block">Shift Target</span>
                                    <span className="text-base font-bold text-foreground">
                                        {log.targetQuantity ? `${log.targetQuantity} imgs` : 'N/A'}
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
                                    <span className="text-muted-foreground block">Total Order Size</span>
                                    <span className="font-bold text-foreground block mt-0.5">
                                        {log.orderId?.imageQuantity || 'N/A'} images
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
                                        {log.assignedStaffs.map((st, idx) => (
                                            <Badge
                                                key={idx}
                                                variant="secondary"
                                                className="text-xs py-1 px-2.5 gap-1.5 font-normal bg-background border border-border/60"
                                            >
                                                <span>{st.staffId?.userId?.name || st.staffId?.staffId || 'Editor'}</span>
                                                <strong className="text-primary font-bold">{st.imageCount} imgs</strong>
                                            </Badge>
                                        ))}
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
                                        <p className="text-muted-foreground leading-relaxed">{log.handoverNotes}</p>
                                    </div>
                                )}

                                {log.bottlenecks && (
                                    <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs space-y-1">
                                        <div className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                            <AlertCircle className="h-4 w-4" /> Bottlenecks & Delays
                                        </div>
                                        <p className="text-muted-foreground leading-relaxed">{log.bottlenecks}</p>
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
    );
}
