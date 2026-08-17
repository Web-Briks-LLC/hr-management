'use client';

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetOrderTimelineQuery } from '@/redux/features/production/productionApi';
import { STAGE_LABELS, STATUS_LABELS } from '@/types/production.type';
import { format } from 'date-fns';
import {
    Clock,
    User,
    Layers,
    CheckCircle2,
    AlertCircle,
    Calendar,
    ArrowRight,
    Sparkles,
} from 'lucide-react';

interface OrderWorkflowDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orderId: string | null;
}

export function OrderWorkflowDrawer({
    open,
    onOpenChange,
    orderId,
}: OrderWorkflowDrawerProps) {
    const { data, isLoading } = useGetOrderTimelineQuery(orderId || '', {
        skip: !orderId,
    });

    const order = data?.data?.order;
    const logs = data?.data?.logs || [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <Clock className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold">
                                {order?.orderName || 'Order Production Timeline'}
                            </DialogTitle>
                            <DialogDescription>
                                Chronological shift-by-shift editing history, handovers, and stage progress.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {isLoading ? (
                    <div className="space-y-4 py-4">
                        <Skeleton className="h-20 w-full rounded-xl" />
                        <Skeleton className="h-28 w-full rounded-xl" />
                        <Skeleton className="h-28 w-full rounded-xl" />
                    </div>
                ) : (
                    <div className="space-y-6 pt-2">
                        {/* Order Summary Top Card */}
                        {order && (
                            <div className="p-4 rounded-xl bg-muted/40 border border-border/60 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                <div>
                                    <span className="text-muted-foreground block">Total Images</span>
                                    <span className="font-bold text-foreground text-sm">
                                        {order.imageQuantity}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block">Deadline</span>
                                    <span className="font-semibold text-foreground">
                                        {order.deadline ? format(new Date(order.deadline), 'dd MMM, yyyy') : 'N/A'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block">Current Status</span>
                                    <Badge variant="outline" className="capitalize font-semibold mt-0.5">
                                        {order.status?.replace('_', ' ')}
                                    </Badge>
                                </div>
                            </div>
                        )}

                        {/* Shift Timeline Stepper */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Layers className="h-4 w-4 text-primary" /> Shift Production Log Journey ({logs.length} entries)
                            </h4>

                            {logs.length === 0 ? (
                                <div className="text-center py-10 border border-dashed rounded-xl bg-muted/20">
                                    <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                                    <p className="text-sm font-medium text-muted-foreground">
                                        No shift logs recorded for this order yet.
                                    </p>
                                    <p className="text-xs text-muted-foreground/80 mt-1">
                                        Team leaders can log output from the Shift Production modal.
                                    </p>
                                </div>
                            ) : (
                                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                                    {logs.map((log, index) => {
                                        const statusMeta = STATUS_LABELS[log.status] || STATUS_LABELS['in_progress'];
                                        return (
                                            <div key={log._id || index} className="relative group">
                                                {/* Timeline Node Dot */}
                                                <div className="absolute -left-[27px] top-1 h-5 w-5 rounded-full bg-background border-2 border-primary flex items-center justify-center shadow-xs">
                                                    <div className="h-2 w-2 rounded-full bg-primary" />
                                                </div>

                                                <div className="p-4 rounded-xl bg-card border border-border shadow-xs space-y-3 transition-all hover:border-primary/40">
                                                    {/* Header: Shift, Date, Status */}
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="secondary" className="font-bold">
                                                                {log.shiftId?.name || 'Shift'}
                                                            </Badge>
                                                            <span className="text-xs font-semibold text-primary">
                                                                {STAGE_LABELS[log.stage] || log.stage}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <Calendar className="h-3.5 w-3.5" />
                                                            <span>{format(new Date(log.date), 'dd MMM yyyy')}</span>
                                                            <Badge className={statusMeta.bg}>
                                                                {statusMeta.label.split(' ')[0]}
                                                            </Badge>
                                                        </div>
                                                    </div>

                                                    {/* Images Completed & Team Leader */}
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs py-1">
                                                        <div>
                                                            <span className="text-muted-foreground block">Images Edited</span>
                                                            <span className="text-base font-extrabold text-foreground">
                                                                {log.completedQuantity}
                                                                {log.targetQuantity ? (
                                                                    <span className="text-xs font-normal text-muted-foreground">
                                                                        {' '}
                                                                        / {log.targetQuantity} target
                                                                    </span>
                                                                ) : null}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground block">Shift In-charge</span>
                                                            <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                                                                <User className="h-3 w-3 text-muted-foreground" />
                                                                {log.teamLeaderId?.name || 'Team Leader'}
                                                            </span>
                                                        </div>
                                                        {log.qc && (
                                                            <div>
                                                                <span className="text-muted-foreground block">QC Inspection</span>
                                                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                                                    ✓ {log.qc.passedCount || 0} passed
                                                                    {log.qc.rejectedCount ? (
                                                                        <span className="text-destructive ml-1">
                                                                            ({log.qc.rejectedCount} rejected)
                                                                        </span>
                                                                    ) : null}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Assigned Editors List if any */}
                                                    {log.assignedStaffs && log.assignedStaffs.length > 0 && (
                                                        <div className="p-2.5 rounded-lg bg-muted/30 border border-border/40 text-xs">
                                                            <span className="text-[11px] font-bold text-muted-foreground uppercase block mb-1.5">
                                                                Photo Editors Output
                                                            </span>
                                                            <div className="flex flex-wrap gap-2">
                                                                {log.assignedStaffs.map((st, sIdx) => (
                                                                    <Badge key={sIdx} variant="outline" className="text-[11px] font-normal py-0.5">
                                                                        {st.staffId?.userId?.name || st.staffId?.staffId || 'Editor'}:{' '}
                                                                        <strong className="ml-1 text-foreground">{st.imageCount} imgs</strong>
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Handover notes */}
                                                    {log.handoverNotes && (
                                                        <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs">
                                                            <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1 mb-1">
                                                                <CheckCircle2 className="h-3.5 w-3.5" /> Shift Handover Note
                                                            </span>
                                                            <p className="text-muted-foreground">{log.handoverNotes}</p>
                                                        </div>
                                                    )}

                                                    {/* Bottlenecks / Revision notes */}
                                                    {log.bottlenecks && (
                                                        <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs">
                                                            <span className="text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1 mb-1">
                                                                <AlertCircle className="h-3.5 w-3.5" /> Bottleneck / Issue
                                                            </span>
                                                            <p className="text-muted-foreground">{log.bottlenecks}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
