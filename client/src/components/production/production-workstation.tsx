'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { AppDialog } from '@/components/shared/app-dialog';
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import {
    useGetSanitizedOrdersQuery,
    useGetActiveSessionQuery,
    useGetHeldWorkSessionsQuery,
    useStartWorkSessionMutation,
    useFinishWorkSessionMutation,
    useCancelWorkSessionMutation,
    usePauseWorkSessionMutation,
    useResumeWorkSessionMutation,
    useGetOrderImagesQuery,
} from '@/redux/features/production/productionApi';
import { resolveOrderSteps } from '@/types/production.type';
import { useSocket } from '@/contexts/SocketContext';
import {
    Play,
    CheckCircle2,
    XCircle,
    UploadCloud,
    FileImage,
    Clock,
    Layers,
    AlertTriangle,
    FileCheck2,
    Trash2,
    ChevronsUpDown,
    Check,
    Search,
    ShieldAlert,
    RefreshCw,
    Sparkles,
    Pause,
    PlayCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';

export function ProductionWorkstation() {
    const { socket } = useSocket();

    // API queries & mutations
    const [searchOrder, setSearchOrder] = useState('');
    const {
        data: ordersData,
        isLoading: isOrdersLoading,
        refetch: refetchOrders,
    } = useGetSanitizedOrdersQuery({ search: searchOrder || undefined });

    const {
        data: activeSessionData,
        isLoading: isSessionLoading,
        isError: isSessionError,
        refetch: refetchActiveSession,
    } = useGetActiveSessionQuery();

    const { data: heldSessionsData, refetch: refetchHeldSessions } =
        useGetHeldWorkSessionsQuery();

    const [startWork, { isLoading: isStarting }] = useStartWorkSessionMutation();
    const [finishWork, { isLoading: isFinishing }] = useFinishWorkSessionMutation();
    const [cancelWork, { isLoading: isCancelling }] = useCancelWorkSessionMutation();
    const [pauseWork, { isLoading: isPausing }] = usePauseWorkSessionMutation();
    const [resumeWork, { isLoading: isResuming }] = useResumeWorkSessionMutation();

    // Local states
    const [selectedOrderId, setSelectedOrderId] = useState<string>('');
    const [orderComboboxOpen, setOrderComboboxOpen] = useState<boolean>(false);
    const [stagedFiles, setStagedFiles] = useState<string[]>([]);
    const [isFinishDialogOpen, setIsFinishDialogOpen] = useState<boolean>(false);
    const [selectedCompletedSteps, setSelectedCompletedSteps] = useState<string[]>([]);
    const [finishNotes, setFinishNotes] = useState<string>('');
    const [isCancelAlertOpen, setIsCancelAlertOpen] = useState<boolean>(false);
    const [cancelReason, setCancelReason] = useState<string>('');

    // Timer state for active session
    const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
    const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const activeSession = activeSessionData?.data;
    const isSessionOnHold = activeSession?.status === 'paused';
    const hasLiveActive = activeSession?.status === 'active';
    const heldSessions = useMemo(
        () =>
            (heldSessionsData?.data || []).filter(
                (s) => s._id !== activeSession?._id
            ),
        [heldSessionsData, activeSession?._id]
    );

    const orders = useMemo(() => {
        return [...(ordersData?.data || [])].sort(
            (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
    }, [ordersData]);


    // Selected order details.
    // While a session is actively RUNNING, the workstation is pinned to that
    // order. When it's only on hold (or there's no session), the order picker
    // wins — otherwise a held session would block choosing a new order to work
    // on. The session's own order is used as a fallback when nothing is picked.
    const activeOrder = useMemo(() => {
        const sessionOrder =
            activeSession && typeof activeSession.orderId === 'object'
                ? activeSession.orderId
                : null;

        if (hasLiveActive && sessionOrder) {
            return sessionOrder;
        }

        const picked = orders.find((o) => o._id === selectedOrderId);
        return picked || sessionOrder || null;
    }, [activeSession, hasLiveActive, orders, selectedOrderId]);

    // Query images for the selected order to show progress & revisions
    const { data: orderImagesData, refetch: refetchOrderImages } = useGetOrderImagesQuery(
        { orderId: activeOrder?._id || '' },
        { skip: !activeOrder?._id }
    );

    const orderImagesSummary = orderImagesData?.data?.summary;
    const revisionImages = useMemo(() => {
        return (
            orderImagesData?.data?.images?.filter((img) => img.status === 'in_revision') || []
        );
    }, [orderImagesData]);

    // Stopwatch timer for active session — hold-aware. Every completed hold
    // interval (totalPausedSeconds) plus the currently-open hold is subtracted,
    // so "held time never counts", and the interval only ticks while running.
    useEffect(() => {
        if (!activeSession?.startTime) {
            setElapsedSeconds(0);
            return;
        }

        const startTimestamp = new Date(activeSession.startTime).getTime();
        const pausedAccum = activeSession.totalPausedSeconds || 0;

        const updateTimer = () => {
            const now = Date.now();
            let diff = Math.floor((now - startTimestamp) / 1000) - pausedAccum;
            if (activeSession.status === 'paused' && activeSession.pausedAt) {
                diff -= Math.floor(
                    (now - new Date(activeSession.pausedAt).getTime()) / 1000
                );
            }
            setElapsedSeconds(Math.max(0, diff));
        };

        updateTimer();

        // Frozen while on hold — show the value but don't advance it.
        if (activeSession.status !== 'active') {
            return;
        }

        const interval = setInterval(updateTimer, 1000);
        timerIntervalRef.current = interval;
        return () => {
            clearInterval(interval);
            if (timerIntervalRef.current === interval) {
                timerIntervalRef.current = null;
            }
        };
    }, [
        activeSession?.startTime,
        activeSession?.status,
        activeSession?.pausedAt,
        activeSession?.totalPausedSeconds,
    ]);

    // Stops the stopwatch immediately (rather than waiting on the
    // finish/cancel mutation's cache invalidation to round-trip and re-run
    // the effect above) so the timer never keeps ticking after the session
    // has actually ended.
    const stopTimerImmediately = () => {
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
        setElapsedSeconds(0);
    };

    // Auto-sync with socket events
    useEffect(() => {
        if (!socket) return;

        const handleUpdate = () => {
            refetchOrders();
            refetchActiveSession();
            refetchHeldSessions();
            if (activeOrder?._id) {
                refetchOrderImages();
            }
        };

        const events = [
            'production:session_started',
            'production:session_finished',
            'production:session_cancelled',
            'production:session_paused',
            'production:session_resumed',
            'production:session_reassigned',
            'production:images_locked',
            'production:images_updated',
        ];
        events.forEach((e) => socket.on(e, handleUpdate));

        return () => {
            events.forEach((e) => socket.off(e, handleUpdate));
        };
    }, [
        socket,
        refetchOrders,
        refetchActiveSession,
        refetchHeldSessions,
        refetchOrderImages,
        activeOrder?._id,
    ]);

    // Drag & Drop Handler (Zero file upload, extracts filenames instantly).
    // Enforces the order's image quantity: the staged batch can never push the
    // order past `imageQuantity` total registered images. The server re-checks
    // this hard limit on Start Work.
    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            if (!acceptedFiles || acceptedFiles.length === 0) return;

            if (!activeOrder?._id) {
                toast.error('Select an order first, then drop the images to work on.');
                return;
            }

            const extractedNames = acceptedFiles
                .map((f) => f.name.trim())
                .filter(Boolean);

            const maxImages = Number((activeOrder as any).imageQuantity) || 0;
            const alreadyRegistered = orderImagesSummary?.totalRegistered ?? 0;

            setStagedFiles((prev) => {
                const prevSet = new Set(prev);
                const fresh = Array.from(new Set(extractedNames)).filter(
                    (n) => !prevSet.has(n)
                );

                if (fresh.length === 0) {
                    toast.info('Those filenames are already in your batch.');
                    return prev;
                }

                // Slots left = order quantity − images already registered on the
                // server − names already staged in this batch.
                const remainingSlots = Math.max(
                    0,
                    maxImages - alreadyRegistered - prev.length
                );

                if (remainingSlots <= 0) {
                    toast.error(
                        `This order is limited to ${maxImages} image(s) and is already full. Nothing added.`
                    );
                    return prev;
                }

                if (fresh.length > remainingSlots) {
                    const trimmed = fresh.slice(0, remainingSlots);
                    toast.warning(
                        `Only ${remainingSlots} more image(s) allowed on this ${maxImages}-image order. Added ${trimmed.length}, skipped ${
                            fresh.length - remainingSlots
                        }.`
                    );
                    return [...prev, ...trimmed];
                }

                toast.success(`Extracted ${fresh.length} image filename(s)`);
                return [...prev, ...fresh];
            });
        },
        [activeOrder, orderImagesSummary]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        noClick: false,
    });

    const handleRemoveStagedFile = (filename: string) => {
        setStagedFiles((prev) => prev.filter((f) => f !== filename));
    };

    const handleClearStagedFiles = () => {
        setStagedFiles([]);
    };

    const handleAddRevisionImagesToStaging = () => {
        if (revisionImages.length === 0) return;
        const revNames = revisionImages.map((r) => r.imageName);
        setStagedFiles((prev) => {
            const set = new Set([...prev, ...revNames]);
            return Array.from(set);
        });
        toast.info(`Added ${revNames.length} revision image(s) to staging queue.`);
    };

    // Format stopwatch seconds (HH:MM:SS)
    const formatTimer = (totalSec: number) => {
        const hrs = Math.floor(totalSec / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        const secs = totalSec % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins
            .toString()
            .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Start Work Handler
    const handleStartWork = async () => {
        if (!selectedOrderId && !activeOrder?._id) {
            toast.error('Please select an Order ID first');
            return;
        }

        if (stagedFiles.length === 0) {
            toast.error('Please drop or add at least 1 image filename to start work');
            return;
        }

        const targetOrderId = activeOrder?._id || selectedOrderId;

        try {
            const res = await startWork({
                orderId: targetOrderId,
                imageNames: stagedFiles,
            }).unwrap();

            toast.success(res.message || 'Work session started! Concurrency lock applied.');
            setStagedFiles([]);
            refetchActiveSession();
            refetchOrders();
            refetchOrderImages();
        } catch (error: any) {
            toast.error(error?.data?.message || error?.message || 'Failed to start work session');
        }
    };

    // The completed-steps checklist options for the active order — the order's
    // own requiredSteps, or the shared default when it has none. Same helper
    // the Floor Monitor uses, so both dialogs always agree for a given order.
    const finishStepOptions = useMemo(
        () => resolveOrderSteps((activeOrder as any)?.requiredSteps),
        [activeOrder]
    );

    // Open Finish Dialog
    const handleOpenFinishDialog = () => {
        // Pre-select all steps by default for convenience
        setSelectedCompletedSteps(finishStepOptions.map((s) => s.name));
        setFinishNotes('');
        setIsFinishDialogOpen(true);
    };

    // Confirm Finish Work
    const handleFinishConfirm = async () => {
        if (!activeSession?._id) return;
        if (selectedCompletedSteps.length === 0) {
            toast.error('Please tick at least one completed step/sub-service');
            return;
        }

        try {
            const res = await finishWork({
                sessionId: activeSession._id,
                completedSteps: selectedCompletedSteps,
                notes: finishNotes || undefined,
            }).unwrap();

            toast.success(res.message || 'Work session finished successfully!');
            setIsFinishDialogOpen(false);
            stopTimerImmediately();
            refetchActiveSession();
            refetchOrders();
            refetchOrderImages();
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to finish work session');
        }
    };

    // Hold (pause) the active session — freezes the timer and frees the editor
    // to start / resume another batch. Images stay locked to this session.
    const handleHold = async () => {
        if (!activeSession?._id) return;
        try {
            await pauseWork({ sessionId: activeSession._id }).unwrap();
            toast.success('Session on hold. Timer frozen — you can start another batch now.');
            refetchActiveSession();
            refetchHeldSessions();
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to hold work session');
        }
    };

    // Resume a held session. Server rejects this if another session is already
    // running, so the editor must hold/finish that one first.
    const handleResume = async (sessionId: string) => {
        try {
            await resumeWork({ sessionId }).unwrap();
            toast.success('Session resumed. Your timer is running again.');
            refetchActiveSession();
            refetchHeldSessions();
            refetchOrderImages();
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to resume work session');
        }
    };

    // Confirm Cancel Work
    const handleCancelConfirm = async () => {
        if (!activeSession?._id) return;

        try {
            await cancelWork({
                sessionId: activeSession._id,
                reason: cancelReason || undefined,
            }).unwrap();

            toast.success('Work session cancelled and images unlocked');
            setIsCancelAlertOpen(false);
            setCancelReason('');
            stopTimerImmediately();
            refetchActiveSession();
            refetchOrders();
            refetchOrderImages();
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to cancel work session');
        }
    };

    return (
        <div className="space-y-6">
            {/* 1. ACTIVE LIVE SESSION BANNER & STOPWATCH */}
            {isSessionError ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-foreground">
                                Couldn&apos;t check for an active work session
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                If you had a session running, it may still be active on the server.
                                Retry before starting new work to avoid a lock conflict.
                            </p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => refetchActiveSession()}>
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                        Retry
                    </Button>
                </div>
            ) : activeSession ? (
                <div
                    className={cn(
                        'group relative overflow-hidden rounded-2xl border p-6 shadow-xl transition-all duration-300 bg-linear-to-br via-card to-card',
                        isSessionOnHold
                            ? 'border-amber-500/40 from-amber-500/10 shadow-amber-500/5'
                            : 'border-emerald-500/30 from-emerald-500/10 shadow-emerald-500/5'
                    )}
                >
                    <div
                        className={cn(
                            'absolute -right-6 -top-6 h-32 w-32 rounded-full blur-3xl transition-all duration-300',
                            isSessionOnHold
                                ? 'bg-amber-500/10 group-hover:bg-amber-500/20'
                                : 'bg-emerald-500/10 group-hover:bg-emerald-500/20'
                        )}
                    />
                    <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                {isSessionOnHold ? (
                                    <span className="relative flex h-3 w-3">
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                                    </span>
                                ) : (
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                    </span>
                                )}
                                <Badge
                                    className={cn(
                                        'text-white font-bold text-xs px-2.5 py-0.5 shadow-xs',
                                        isSessionOnHold ? 'bg-amber-500' : 'bg-emerald-500'
                                    )}
                                >
                                    {isSessionOnHold
                                        ? 'SESSION ON HOLD'
                                        : 'LIVE WORK SESSION RUNNING'}
                                </Badge>
                                <span className="text-xs text-muted-foreground font-mono">
                                    Session ID: {activeSession._id.slice(-6)}
                                </span>
                            </div>

                            <div className="flex flex-wrap items-baseline gap-3">
                                <h3 className="text-2xl font-black tracking-tight text-foreground">
                                    Order: {(activeSession.orderId as any)?.orderName || 'Active Order'}
                                </h3>
                                <Badge variant="outline" className="font-mono text-xs bg-emerald-500/5 border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                                    {activeSession.imageCount} Images in Batch
                                </Badge>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                <span className="text-xs text-muted-foreground font-medium">
                                    Required Steps:
                                </span>
                                {((activeSession.orderId as any)?.requiredSteps || []).map(
                                    (step: any, idx: number) => (
                                        <Badge
                                            key={idx}
                                            variant="secondary"
                                            className="text-[11px] bg-primary/10 text-primary border-primary/20"
                                        >
                                            {step.name}
                                        </Badge>
                                    )
                                )}
                            </div>
                        </div>

                        {/* Stopwatch & Action Buttons */}
                        <div
                            className={cn(
                                'flex flex-col sm:flex-row items-center gap-4 bg-background/80 backdrop-blur-md p-4 rounded-xl border shadow-xs',
                                isSessionOnHold
                                    ? 'border-amber-500/40'
                                    : 'border-emerald-500/30'
                            )}
                        >
                            <div className="text-center sm:text-right pr-2">
                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                                    {isSessionOnHold ? 'Work Time (Frozen)' : 'Elapsed Work Time'}
                                </span>
                                <span
                                    className={cn(
                                        'text-3xl font-black font-mono',
                                        isSessionOnHold
                                            ? 'text-amber-600 dark:text-amber-400'
                                            : 'text-emerald-600 dark:text-emerald-400'
                                    )}
                                >
                                    {formatTimer(elapsedSeconds)}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                {isSessionOnHold ? (
                                    <Button
                                        onClick={() => handleResume(activeSession._id)}
                                        disabled={isResuming}
                                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs h-10 px-4"
                                    >
                                        <PlayCircle className="h-4 w-4 mr-1" />
                                        Resume
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        onClick={handleHold}
                                        disabled={isPausing}
                                        className="border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 h-10 px-4 text-xs font-semibold"
                                    >
                                        <Pause className="h-4 w-4 mr-1" />
                                        Hold
                                    </Button>
                                )}
                                <Button
                                    onClick={handleOpenFinishDialog}
                                    disabled={isFinishing}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs h-10 px-5"
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Finish Work
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setIsCancelAlertOpen(true)}
                                    disabled={isCancelling}
                                    className="border-destructive/40 text-destructive hover:bg-destructive/10 h-10 text-xs font-semibold"
                                >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Image Filenames Chips */}
                    <div className="mt-4 pt-3 border-t border-emerald-500/20">
                        <span className="text-xs font-semibold text-muted-foreground">
                            Active Images Locked by You ({activeSession.imageNames.length}):
                        </span>
                        <div className="flex flex-wrap gap-1.5 mt-2 max-h-24 overflow-y-auto pr-2">
                            {activeSession.imageNames.map((name, i) => (
                                <span
                                    key={i}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                                >
                                    <FileImage className="h-3 w-3 opacity-70" />
                                    {name}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            ) : null}

            {/* 1b. HELD (PAUSED) SESSIONS — resumable, timers frozen */}
            {heldSessions.length > 0 && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Pause className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                            On Hold ({heldSessions.length})
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                            Timers frozen · images still locked to you
                        </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {heldSessions.map((s) => (
                            <div
                                key={s._id}
                                className="rounded-xl border border-amber-500/20 bg-background/70 p-3 space-y-2"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-foreground truncate">
                                        {(s.orderId as any)?.orderName || 'Order'}
                                    </span>
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] font-mono border-amber-500/30 text-amber-700 dark:text-amber-300 shrink-0"
                                    >
                                        {s.imageCount} imgs
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                                    <span>Frozen at {formatTimer(s.effectiveSeconds || 0)}</span>
                                    <span>#{s._id.slice(-6)}</span>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() => handleResume(s._id)}
                                    disabled={isResuming || hasLiveActive}
                                    title={
                                        hasLiveActive
                                            ? 'Hold or finish your running session first'
                                            : undefined
                                    }
                                    className="w-full h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold"
                                >
                                    <PlayCircle className="h-3.5 w-3.5 mr-1" />
                                    Resume
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}


            {/* 2. MAIN WORKSTATION WORKSPACE */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT COL: Order Selection & Step Breakdown */}
                <Card className="lg:col-span-1 border-border/60 shadow-sm flex flex-col justify-between">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Layers className="h-5 w-5 text-primary" />
                            1. Select Order
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Select the Order ID you want to work on from the active production floor.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4 flex-1">
                        {/* Client ID Combobox */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Client ID</Label>
                            <Popover open={orderComboboxOpen} onOpenChange={setOrderComboboxOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        disabled={hasLiveActive}
                                        className="w-full justify-between h-10 text-xs font-mono font-medium bg-background/60"
                                    >
                                        {selectedOrderId ? (
                                            (() => {
                                                const sel = orders.find((o) => o._id === selectedOrderId);
                                                return sel ? (
                                                    <span className="truncate">
                                                        {sel.clientId?.clientId || '—'}
                                                        <span className="text-muted-foreground font-normal">
                                                            {' '}&middot; {sel.orderName}
                                                        </span>
                                                    </span>
                                                ) : (
                                                    'Select Order'
                                                );
                                            })()
                                        ) : (
                                            'Select Client ID...'
                                        )}
                                        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[320px] p-0" align="start">
                                    <Command>
                                        <CommandInput
                                            placeholder="Search by Client ID..."
                                            value={searchOrder}
                                            onValueChange={setSearchOrder}
                                            className="h-9 text-xs"
                                        />
                                        <CommandList>
                                            <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
                                                No active orders found.
                                            </CommandEmpty>
                                            <CommandGroup heading="Active Production Orders">
                                                {orders.map((order) => (
                                                    <CommandItem
                                                        key={order._id}
                                                        value={`${order.clientId?.clientId || ''} ${order.orderName}`}
                                                        onSelect={() => {
                                                            setSelectedOrderId(order._id);
                                                            setOrderComboboxOpen(false);
                                                        }}
                                                        className="text-xs py-2 cursor-pointer"
                                                    >
                                                        <Check
                                                            className={cn(
                                                                'h-3.5 w-3.5 shrink-0',
                                                                selectedOrderId === order._id
                                                                    ? 'opacity-100'
                                                                    : 'opacity-0'
                                                            )}
                                                        />
                                                        <span className="font-bold text-foreground font-mono whitespace-nowrap shrink-0">
                                                            {order.clientId?.clientId || '—'}
                                                        </span>
                                                        <span className="text-muted-foreground truncate">
                                                            {order.orderName}
                                                        </span>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Selected Order Overview Card */}
                        {activeOrder ? (
                            <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-foreground">
                                        {(activeOrder as any).orderName}
                                    </span>
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] bg-primary/5 text-primary border-primary/20"
                                    >
                                        {(activeOrder as any).imageQuantity} Images Total
                                    </Badge>
                                </div>

                                <div className="space-y-1 text-xs">
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Deadline:</span>
                                        <span className="font-medium text-foreground">
                                            {format(new Date((activeOrder as any).deadline), 'dd MMM, hh:mm a')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Status:</span>
                                        <span className="capitalize font-semibold text-primary">
                                            {(activeOrder as any).status?.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>

                                {/* Order Steps Required */}
                                <div className="space-y-1.5 pt-2 border-t border-border/50">
                                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                        Required Core Steps:
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {((activeOrder as any).requiredSteps || []).map(
                                            (step: any, idx: number) => (
                                                <Badge
                                                    key={idx}
                                                    variant="secondary"
                                                    className="text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                                                >
                                                    <span className="text-[9px] opacity-60 mr-1 font-mono">
                                                        {idx + 1}.
                                                    </span>
                                                    {step.name}
                                                </Badge>
                                            )
                                        )}
                                        {(!((activeOrder as any).requiredSteps) ||
                                            (activeOrder as any).requiredSteps.length === 0) && (
                                            <span className="text-xs text-muted-foreground italic">
                                                Standard Editing &amp; Retouching
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Instructions */}
                                {(activeOrder as any).instruction && (
                                    <div className="space-y-1 pt-2 border-t border-border/50">
                                        <span className="text-[11px] font-bold text-muted-foreground">
                                            Instructions:
                                        </span>
                                        <p className="text-xs text-muted-foreground bg-background/60 p-2 rounded border font-mono">
                                            {(activeOrder as any).instruction}
                                        </p>
                                    </div>
                                )}

                                {/* Revision Alert Banner if any image has revision */}
                                {revisionImages.length > 0 && (
                                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 space-y-2">
                                        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs">
                                            <AlertTriangle className="h-4 w-4" />
                                            {revisionImages.length} Image(s) in Revision!
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">
                                            Some images in this order require revision. Click below to load revision images.
                                        </p>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={hasLiveActive}
                                            onClick={handleAddRevisionImagesToStaging}
                                            className="w-full h-7 text-xs border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 font-bold"
                                        >
                                            Load {revisionImages.length} Revision Images
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-40 border border-dashed rounded-xl flex flex-col items-center justify-center text-center p-4 text-muted-foreground gap-2">
                                <Layers className="h-8 w-8 opacity-20" />
                                <p className="text-xs font-medium">No order selected</p>
                                <p className="text-[11px] opacity-70">
                                    Select an Order ID above to view required steps and progress.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* RIGHT COL: Drag & Drop Zone + Staging Table */}
                <Card className="lg:col-span-2 border-border/60 shadow-sm flex flex-col justify-between">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    <UploadCloud className="h-5 w-5 text-primary" />
                                    2. Drag &amp; Drop Images
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Drop the files you want to work on (Zero byte upload, filenames extracted locally).
                                </CardDescription>
                            </div>

                            {stagedFiles.length > 0 && (
                                <Badge variant="secondary" className="font-bold text-xs">
                                    {stagedFiles.length} Images Selected
                                </Badge>
                            )}
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-4 flex-1">
                        {/* Dropzone Area */}
                        <div
                            {...getRootProps()}
                            className={cn(
                                'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3',
                                isDragActive
                                    ? 'border-primary bg-primary/10 scale-[1.01]'
                                    : 'border-border/80 hover:border-primary/50 hover:bg-muted/30 bg-muted/10',
                                hasLiveActive ? 'opacity-50 pointer-events-none cursor-not-allowed' : ''
                            )}
                        >
                            <input {...getInputProps()} />
                            <div className="p-3 rounded-full bg-primary/10 text-primary">
                                <UploadCloud className="h-8 w-8" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-bold text-sm text-foreground">
                                    {isDragActive
                                        ? 'Drop the images here...'
                                        : 'Drag & drop image files from your computer or click to browse'}
                                </h4>
                                <p className="text-xs text-muted-foreground max-w-sm">
                                    No file size limits. Images are never uploaded to the server; only their names are registered into your work batch.
                                </p>
                            </div>
                        </div>

                        {/* Staged Filenames List */}
                        {stagedFiles.length > 0 && (
                            <div className="rounded-xl border bg-background p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <FileCheck2 className="h-4 w-4 text-emerald-500" />
                                        Ready for Work Batch ({stagedFiles.length}):
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleClearStagedFiles}
                                        className="h-7 text-xs text-destructive hover:bg-destructive/10"
                                    >
                                        Clear All
                                    </Button>
                                </div>

                                <div className="max-h-48 overflow-y-auto pr-1">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                        {stagedFiles.map((name, i) => (
                                            <div
                                                key={i}
                                                className="group flex items-center justify-between p-2 rounded-lg border bg-muted/20 text-xs font-mono truncate"
                                            >
                                                <span className="truncate flex items-center gap-1">
                                                    <FileImage className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                    {name}
                                                </span>
                                                <button
                                                    onClick={() => handleRemoveStagedFile(name)}
                                                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity ml-1"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Start Work Action Trigger */}
                                <div className="pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
                                    <div className="text-xs text-muted-foreground">
                                        &bull; Starting work will lock these {stagedFiles.length} image(s) to your session and start your active timer.
                                    </div>
                                    <Button
                                        onClick={handleStartWork}
                                        disabled={
                                            isStarting ||
                                            hasLiveActive ||
                                            !activeOrder ||
                                            isSessionError
                                        }
                                        className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md h-10 px-6"
                                    >
                                        <Play className="h-4 w-4 fill-current" />
                                        Start Work ({stagedFiles.length} Images)
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* 3. FINISH WORK STEP CHECKLIST MODAL */}
            <AppDialog
                open={isFinishDialogOpen}
                onOpenChange={setIsFinishDialogOpen}
                maxWidth="lg"
                title="Complete Work Session"
                description="Select the sub-services / steps you have completed for this image batch."
                icon={<CheckCircle2 className="h-5 w-5" />}
                footer={
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsFinishDialogOpen(false)}
                            disabled={isFinishing}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleFinishConfirm}
                            disabled={isFinishing || selectedCompletedSteps.length === 0}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            Submit &amp; Release Locks
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    {/* Step Checkboxes */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                Completed Sub-Services / Steps:
                            </Label>
                            <div className="space-y-2 rounded-xl border p-3 bg-muted/10">
                                {finishStepOptions.map((step, idx: number) => {
                                    const isChecked = selectedCompletedSteps.includes(step.name);
                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => {
                                                if (isChecked) {
                                                    setSelectedCompletedSteps((prev) =>
                                                        prev.filter((s) => s !== step.name)
                                                    );
                                                } else {
                                                    setSelectedCompletedSteps((prev) => [
                                                        ...prev,
                                                        step.name,
                                                    ]);
                                                }
                                            }}
                                            className={cn(
                                                'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all',
                                                isChecked
                                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-foreground font-semibold'
                                                    : 'bg-background hover:bg-muted/30 text-muted-foreground'
                                            )}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <Checkbox
                                                    checked={isChecked}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            setSelectedCompletedSteps((prev) => [
                                                                ...prev,
                                                                step.name,
                                                            ]);
                                                        } else {
                                                            setSelectedCompletedSteps((prev) =>
                                                                prev.filter((s) => s !== step.name)
                                                            );
                                                        }
                                                    }}
                                                />
                                                <span className="text-sm">{step.name}</span>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    'text-[10px]',
                                                    isChecked
                                                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                                        : 'text-muted-foreground'
                                                )}
                                            >
                                                {isChecked ? 'Completed' : 'Pending'}
                                            </Badge>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Partial Step Notice */}
                        <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-xs text-muted-foreground">
                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                                ℹ️ Partial Step Release:
                            </span>{' '}
                            If not all steps are checked, the remaining steps will be released and opened in the floor queue for other editors to continue.
                        </div>

                        {/* Remarks / Notes */}
                        <div className="space-y-1.5">
                            <Label htmlFor="finishNotes" className="text-xs font-semibold">
                                Handover / Remarks (Optional)
                            </Label>
                            <Textarea
                                id="finishNotes"
                                placeholder="Add any handover notes or remarks about this batch..."
                                value={finishNotes}
                                onChange={(e) => setFinishNotes(e.target.value)}
                                className="text-xs min-h-[70px]"
                            />
                        </div>
                </div>
            </AppDialog>

            {/* 4. CANCEL WORK ALERT DIALOG */}
            <AlertDialog open={isCancelAlertOpen} onOpenChange={setIsCancelAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Work Session?</AlertDialogTitle>
                        <AlertDialogDescription className="text-xs">
                            Are you sure you want to cancel this work session? All locked images will be unlocked immediately and no progress will be saved.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="pt-2">
                        <Input
                            placeholder="Enter cancellation reason (optional)..."
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            className="text-xs h-9"
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isCancelling}>No, Keep Session</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancelConfirm}
                            disabled={isCancelling}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Yes, Cancel Session
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
