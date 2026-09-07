'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { AppDialog } from '@/components/shared/app-dialog';
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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
    useGetLiveWorkSessionsQuery,
    useGetProductionEditorsQuery,
    useAdminCancelWorkSessionMutation,
    useAdminFinishWorkSessionMutation,
    useReassignWorkSessionMutation,
} from '@/redux/features/production/productionApi';
import { useSocket } from '@/contexts/SocketContext';
import { resolveOrderSteps, type ILiveWorkSession } from '@/types/production.type';
import {
    Users,
    Activity,
    Pause,
    Layers,
    MoreVertical,
    CheckCircle2,
    XCircle,
    UserCog,
    Clock,
    RefreshCw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

/** Live elapsed + cumulative seconds for a session, ticked client-side. */
function useLiveClock() {
    const [nowTs, setNowTs] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNowTs(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);
    return nowTs;
}

function computeElapsed(session: ILiveWorkSession, nowTs: number): number {
    const start = new Date(session.startTime).getTime();
    let secs = Math.floor((nowTs - start) / 1000) - (session.totalPausedSeconds || 0);
    if (session.isOnHold && session.pausedAt) {
        secs -= Math.floor((nowTs - new Date(session.pausedAt).getTime()) / 1000);
    }
    return Math.max(0, secs);
}

function fmtDuration(totalSec: number): string {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s
        .toString()
        .padStart(2, '0')}`;
}

export function FloorMonitor() {
    const { socket } = useSocket();
    const nowTs = useLiveClock();

    const { data, isLoading, refetch, isFetching } = useGetLiveWorkSessionsQuery(
        undefined,
        { pollingInterval: 20000 }
    );
    const { data: editorsData } = useGetProductionEditorsQuery();

    const [adminCancel, { isLoading: isCancelling }] = useAdminCancelWorkSessionMutation();
    const [adminFinish, { isLoading: isFinishing }] = useAdminFinishWorkSessionMutation();
    const [reassign, { isLoading: isReassigning }] = useReassignWorkSessionMutation();

    const sessions = data?.data?.sessions || [];
    const byStaff = data?.data?.byStaff || [];
    const summary = data?.data?.summary || {
        editorsWorking: 0,
        activeSessions: 0,
        heldSessions: 0,
        imagesInProgress: 0,
    };
    const editors = editorsData?.data || [];

    // Dialog state
    const [target, setTarget] = useState<ILiveWorkSession | null>(null);
    const [dialog, setDialog] = useState<'finish' | 'reassign' | 'cancel' | null>(null);
    const [finishSteps, setFinishSteps] = useState<string[]>([]);
    const [finishNotes, setFinishNotes] = useState('');
    const [reassignTo, setReassignTo] = useState('');
    const [reassignNote, setReassignNote] = useState('');
    const [cancelReason, setCancelReason] = useState('');

    useEffect(() => {
        if (!socket) return;
        const handle = () => refetch();
        const events = [
            'production:session_started',
            'production:session_finished',
            'production:session_cancelled',
            'production:session_paused',
            'production:session_resumed',
            'production:session_reassigned',
            'production:images_updated',
        ];
        events.forEach((e) => socket.on(e, handle));
        return () => events.forEach((e) => socket.off(e, handle));
    }, [socket, refetch]);

    const openFinish = (s: ILiveWorkSession) => {
        setTarget(s);
        setFinishSteps(resolveOrderSteps(s.order.requiredSteps).map((st) => st.name));
        setFinishNotes('');
        setDialog('finish');
    };
    const openReassign = (s: ILiveWorkSession) => {
        setTarget(s);
        setReassignTo('');
        setReassignNote('');
        setDialog('reassign');
    };
    const openCancel = (s: ILiveWorkSession) => {
        setTarget(s);
        setCancelReason('');
        setDialog('cancel');
    };
    const closeDialog = () => {
        setDialog(null);
        setTarget(null);
    };

    const handleFinish = async () => {
        if (!target) return;
        if (finishSteps.length === 0) {
            toast.error('Tick at least one completed step');
            return;
        }
        try {
            const res = await adminFinish({
                sessionId: target._id,
                completedSteps: finishSteps,
                notes: finishNotes || undefined,
            }).unwrap();
            toast.success(res.message || 'Session force-finished');
            closeDialog();
        } catch (e: any) {
            toast.error(e?.data?.message || 'Failed to finish session');
        }
    };

    const handleReassign = async () => {
        if (!target || !reassignTo) {
            toast.error('Pick an editor to reassign to');
            return;
        }
        try {
            const res = await reassign({
                sessionId: target._id,
                newStaffId: reassignTo,
                note: reassignNote || undefined,
            }).unwrap();
            toast.success(res.message || 'Session reassigned');
            closeDialog();
        } catch (e: any) {
            toast.error(e?.data?.message || 'Failed to reassign session');
        }
    };

    const handleCancel = async () => {
        if (!target) return;
        try {
            const res = await adminCancel({
                sessionId: target._id,
                reason: cancelReason || undefined,
            }).unwrap();
            toast.success(res.message || 'Session cancelled');
            closeDialog();
        } catch (e: any) {
            toast.error(e?.data?.message || 'Failed to cancel session');
        }
    };

    const stats = useMemo(
        () => [
            { label: 'Editors Working', value: summary.editorsWorking, icon: Users, tint: 'blue' },
            { label: 'Active Sessions', value: summary.activeSessions, icon: Activity, tint: 'emerald' },
            { label: 'On Hold', value: summary.heldSessions, icon: Pause, tint: 'amber' },
            { label: 'Images In Progress', value: summary.imagesInProgress, icon: Layers, tint: 'purple' },
        ],
        [summary]
    );

    const tintMap: Record<string, string> = {
        blue: 'from-blue-500/10 text-blue-500',
        emerald: 'from-emerald-500/10 text-emerald-500',
        amber: 'from-amber-500/10 text-amber-500',
        purple: 'from-purple-500/10 text-purple-500',
    };

    return (
        <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.map((s) => (
                    <div
                        key={s.label}
                        className={`relative overflow-hidden rounded-2xl border bg-linear-to-br via-card to-card p-5 ${tintMap[s.tint]}`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-current/10">
                                <s.icon className="h-5 w-5" />
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold tracking-tight text-foreground">
                            {isLoading ? <Skeleton className="h-8 w-12" /> : s.value}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-2 font-medium">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Per-editor rollup */}
            <div className="rounded-xl border border-border/60 overflow-hidden bg-background">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/30">
                    <span className="text-sm font-bold flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        Who&apos;s Working On What
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="h-8 text-xs"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
                <Table>
                    <TableHeader className="bg-muted/40">
                        <TableRow className="text-xs">
                            <TableHead className="font-bold">Editor</TableHead>
                            <TableHead className="font-bold">Sessions</TableHead>
                            <TableHead className="font-bold">Images</TableHead>
                            <TableHead className="font-bold">Orders</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            [...Array(3)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={4}>
                                        <Skeleton className="h-5 w-full" />
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : byStaff.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground text-sm">
                                    No editors are working right now.
                                </TableCell>
                            </TableRow>
                        ) : (
                            byStaff.map((row) => (
                                <TableRow key={row.staffId} className="text-xs">
                                    <TableCell className="py-3">
                                        <div className="font-bold text-foreground">{row.name}</div>
                                        {row.designation && (
                                            <div className="text-[11px] text-muted-foreground capitalize">
                                                {row.designation}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="py-3">
                                        <div className="flex gap-1.5">
                                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                                                {row.activeCount} active
                                            </Badge>
                                            {row.heldCount > 0 && (
                                                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px]">
                                                    {row.heldCount} held
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-3 font-mono font-bold text-foreground">
                                        {row.totalImages}
                                    </TableCell>
                                    <TableCell className="py-3 text-muted-foreground">
                                        {row.orders.join(', ') || '—'}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Live sessions */}
            <div className="rounded-xl border border-border/60 overflow-hidden bg-background">
                <div className="px-4 py-3 border-b border-border/60 bg-muted/30">
                    <span className="text-sm font-bold flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" />
                        Live &amp; Held Sessions ({sessions.length})
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/40">
                            <TableRow className="text-xs">
                                <TableHead className="font-bold">Editor</TableHead>
                                <TableHead className="font-bold">Order</TableHead>
                                <TableHead className="font-bold">Batch</TableHead>
                                <TableHead className="font-bold">Status</TableHead>
                                <TableHead className="font-bold">Elapsed</TableHead>
                                <TableHead className="font-bold">Cumulative</TableHead>
                                <TableHead className="font-bold">Started</TableHead>
                                <TableHead className="font-bold text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [...Array(4)].map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={8}>
                                            <Skeleton className="h-5 w-full" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : sessions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-28 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <Clock className="h-7 w-7 opacity-20" />
                                            <p className="text-sm font-medium">No live or held sessions</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sessions.map((s) => {
                                    const elapsed = computeElapsed(s, nowTs);
                                    const cumulative = elapsed + (s.priorAccumulatedSeconds || 0);
                                    return (
                                        <TableRow key={s._id} className="text-xs">
                                            <TableCell className="py-3">
                                                <div className="font-bold text-foreground">{s.staff.name}</div>
                                                {s.staff.staffId && (
                                                    <div className="text-[11px] text-muted-foreground font-mono">
                                                        {s.staff.staffId}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <div className="font-mono font-semibold text-foreground">
                                                    {s.order.orderName}
                                                </div>
                                                {s.isReassignment && (
                                                    <Badge
                                                        variant="outline"
                                                        className="mt-1 text-[9px] border-blue-500/30 text-blue-600 dark:text-blue-400"
                                                    >
                                                        reassigned
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-3 font-mono">
                                                {s.imageCount} img
                                            </TableCell>
                                            <TableCell className="py-3">
                                                {s.isOnHold ? (
                                                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold">
                                                        ON HOLD
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                                                        LIVE
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-3 font-mono font-bold text-foreground">
                                                {fmtDuration(elapsed)}
                                            </TableCell>
                                            <TableCell className="py-3 font-mono">
                                                {fmtDuration(cumulative)}
                                                {s.priorAccumulatedSeconds > 0 && (
                                                    <span className="block text-[10px] text-muted-foreground">
                                                        +{Math.round(s.priorAccumulatedSeconds / 60)}m prior
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-3 text-muted-foreground">
                                                {formatDistanceToNow(new Date(s.startTime), { addSuffix: true })}
                                            </TableCell>
                                            <TableCell className="py-3 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="text-xs">
                                                        <DropdownMenuItem onClick={() => openFinish(s)}>
                                                            <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                                                            Force finish
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => openReassign(s)}>
                                                            <UserCog className="h-3.5 w-3.5 mr-2 text-blue-600" />
                                                            Reassign editor
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => openCancel(s)}
                                                            className="text-destructive focus:text-destructive"
                                                        >
                                                            <XCircle className="h-3.5 w-3.5 mr-2" />
                                                            Force cancel
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Force Finish dialog */}
            <AppDialog
                open={dialog === 'finish'}
                onOpenChange={(o) => !o && closeDialog()}
                maxWidth="lg"
                title="Force-finish session"
                description={
                    target
                        ? `Close ${target.staff.name}'s session on ${target.order.orderName}. Their logged work time is preserved.`
                        : ''
                }
                icon={<CheckCircle2 className="h-5 w-5" />}
                footer={
                    <>
                        <Button variant="outline" onClick={closeDialog} disabled={isFinishing}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleFinish}
                            disabled={isFinishing || finishSteps.length === 0}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                            Submit &amp; Release Locks
                        </Button>
                    </>
                }
            >
                <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Completed steps
                    </Label>
                    <div className="space-y-2 rounded-xl border p-3 bg-muted/10">
                        {resolveOrderSteps(target?.order.requiredSteps).map(
                            (step, idx) => {
                                const checked = finishSteps.includes(step.name);
                                return (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-3 p-2 rounded-lg border bg-background"
                                    >
                                        <Checkbox
                                            checked={checked}
                                            onCheckedChange={(c) =>
                                                setFinishSteps((prev) =>
                                                    c
                                                        ? [...prev, step.name]
                                                        : prev.filter((n) => n !== step.name)
                                                )
                                            }
                                        />
                                        <span className="text-sm">{step.name}</span>
                                    </div>
                                );
                            }
                        )}
                    </div>
                    <Textarea
                        placeholder="Reason / handover note (optional)"
                        value={finishNotes}
                        onChange={(e) => setFinishNotes(e.target.value)}
                        className="text-xs min-h-[60px]"
                    />
                </div>
            </AppDialog>

            {/* Reassign dialog */}
            <AppDialog
                open={dialog === 'reassign'}
                onOpenChange={(o) => !o && closeDialog()}
                maxWidth="lg"
                title="Reassign session to another editor"
                description={
                    target
                        ? `${target.staff.name}'s logged time on ${target.order.orderName} is frozen and still counts. A fresh countdown starts for the new editor.`
                        : ''
                }
                icon={<UserCog className="h-5 w-5" />}
                footer={
                    <>
                        <Button variant="outline" onClick={closeDialog} disabled={isReassigning}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleReassign}
                            disabled={isReassigning || !reassignTo}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                        >
                            Reassign &amp; Start New Countdown
                        </Button>
                    </>
                }
            >
                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">New editor</Label>
                        <Select value={reassignTo} onValueChange={setReassignTo}>
                            <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Select editor..." />
                            </SelectTrigger>
                            <SelectContent>
                                {editors
                                    .filter((e) => e._id !== target?.staff._id)
                                    .map((e) => (
                                        <SelectItem key={e._id} value={e._id} className="text-xs">
                                            {e.name}
                                            {e.designation ? ` · ${e.designation}` : ''}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Input
                        placeholder="Reason for reassignment (optional)"
                        value={reassignNote}
                        onChange={(e) => setReassignNote(e.target.value)}
                        className="h-9 text-xs"
                    />
                    {target && (
                        <div className="rounded-lg bg-muted/40 border p-3 text-[11px] text-muted-foreground space-y-1">
                            <div>
                                Batch: <strong className="text-foreground">{target.imageCount}</strong> image(s)
                            </div>
                            <div>
                                Time so far by {target.staff.name}:{' '}
                                <strong className="text-foreground">
                                    {fmtDuration(computeElapsed(target, nowTs))}
                                </strong>{' '}
                                (carried into cumulative)
                            </div>
                        </div>
                    )}
                </div>
            </AppDialog>

            {/* Force Cancel alert */}
            <AlertDialog open={dialog === 'cancel'} onOpenChange={(o) => !o && closeDialog()}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Force-cancel this session?</AlertDialogTitle>
                        <AlertDialogDescription className="text-xs">
                            {target
                                ? `${target.staff.name}'s ${target.imageCount}-image batch on ${target.order.orderName} will be unlocked. Their logged time is still recorded.`
                                : ''}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <Input
                        placeholder="Cancellation reason (optional)"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="text-xs h-9"
                    />
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isCancelling}>Keep Session</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancel}
                            disabled={isCancelling}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Yes, Cancel It
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
