'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
    useStartWorkSessionMutation,
    useFinishWorkSessionMutation,
    useCancelWorkSessionMutation,
    useGetOrderImagesQuery,
} from '@/redux/features/production/productionApi';
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

    const [startWork, { isLoading: isStarting }] = useStartWorkSessionMutation();
    const [finishWork, { isLoading: isFinishing }] = useFinishWorkSessionMutation();
    const [cancelWork, { isLoading: isCancelling }] = useCancelWorkSessionMutation();

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

    const activeSession = activeSessionData?.data;
    const orders = useMemo(() => {
        return [...(ordersData?.data || [])].sort(
            (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
    }, [ordersData]);


    // Selected order details
    const activeOrder = useMemo(() => {
        if (activeSession && typeof activeSession.orderId === 'object') {
            return activeSession.orderId;
        }
        return orders.find((o) => o._id === selectedOrderId) || null;
    }, [activeSession, orders, selectedOrderId]);

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

    // Stopwatch timer for active session
    useEffect(() => {
        if (!activeSession?.startTime) {
            setElapsedSeconds(0);
            return;
        }

        const startTimestamp = new Date(activeSession.startTime).getTime();
        const updateTimer = () => {
            const now = Date.now();
            const diff = Math.max(0, Math.floor((now - startTimestamp) / 1000));
            setElapsedSeconds(diff);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [activeSession?.startTime]);

    // Auto-sync with socket events
    useEffect(() => {
        if (!socket) return;

        const handleUpdate = () => {
            refetchOrders();
            refetchActiveSession();
            if (activeOrder?._id) {
                refetchOrderImages();
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
    }, [socket, refetchOrders, refetchActiveSession, refetchOrderImages, activeOrder?._id]);

    // Drag & Drop Handler (Zero file upload, extracts filenames instantly)
    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (!acceptedFiles || acceptedFiles.length === 0) return;

        const extractedNames = acceptedFiles
            .map((f) => f.name.trim())
            .filter(Boolean);

        setStagedFiles((prev) => {
            const set = new Set([...prev, ...extractedNames]);
            return Array.from(set);
        });

        toast.success(`Extracted ${extractedNames.length} image filename(s)`);
    }, []);

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

    // Open Finish Dialog
    const handleOpenFinishDialog = () => {
        // Pre-select all required steps by default for convenience
        const reqStepNames = (activeOrder as any)?.requiredSteps?.map((s: any) => s.name) || [
            'Editing & Retouching',
        ];
        setSelectedCompletedSteps(reqStepNames);
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
            refetchActiveSession();
            refetchOrders();
            refetchOrderImages();
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to finish work session');
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
                <div className="group relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-linear-to-br from-emerald-500/10 via-card to-card p-6 shadow-xl shadow-emerald-500/5 transition-all duration-300">
                    <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl transition-all duration-300 group-hover:bg-emerald-500/20" />
                    <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                </span>
                                <Badge className="bg-emerald-500 text-white font-bold text-xs px-2.5 py-0.5 shadow-xs">
                                    LIVE WORK SESSION RUNNING
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
                        <div className="flex flex-col sm:flex-row items-center gap-4 bg-background/80 backdrop-blur-md p-4 rounded-xl border border-emerald-500/30 shadow-xs">
                            <div className="text-center sm:text-right pr-2">
                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                                    Elapsed Work Time
                                </span>
                                <span className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                                    {formatTimer(elapsedSeconds)}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
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
                        {/* Order ID Combobox */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Order ID</Label>
                            <Popover open={orderComboboxOpen} onOpenChange={setOrderComboboxOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        disabled={!!activeSession}
                                        className="w-full justify-between h-10 text-xs font-mono font-medium bg-background/60"
                                    >
                                        {selectedOrderId
                                            ? orders.find((o) => o._id === selectedOrderId)?.orderName ||
                                              'Select Order'
                                            : 'Select Order ID...'}
                                        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[320px] p-0" align="start">
                                    <Command>
                                        <CommandInput
                                            placeholder="Search Order ID..."
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
                                                        value={order.orderName}
                                                        onSelect={() => {
                                                            setSelectedOrderId(order._id);
                                                            setOrderComboboxOpen(false);
                                                        }}
                                                        className="text-xs py-2 cursor-pointer"
                                                    >
                                                        <Check
                                                            className={cn(
                                                                'mr-2 h-3.5 w-3.5',
                                                                selectedOrderId === order._id
                                                                    ? 'opacity-100'
                                                                    : 'opacity-0'
                                                            )}
                                                        />
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-foreground">
                                                                {order.orderName}
                                                            </span>
                                                            <span className="text-[10px] text-muted-foreground">
                                                                Qty: {order.imageQuantity} | Due:{' '}
                                                                {format(new Date(order.deadline), 'dd MMM yyyy')}
                                                            </span>
                                                        </div>
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
                                            disabled={!!activeSession}
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
                                activeSession ? 'opacity-50 pointer-events-none cursor-not-allowed' : ''
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
                                            !!activeSession ||
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
                                {((activeOrder as any)?.requiredSteps || [
                                    { name: 'Clipping Path', code: 'clipping_path' },
                                    { name: 'Skin Retouching', code: 'skin_retouch' },
                                    { name: 'Background Removal', code: 'bg_removal' },
                                ]).map((step: any, idx: number) => {
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
                        <AlertDialogDescription className="space-y-2 text-xs">
                            <span>
                                Are you sure you want to cancel this work session? All locked images will be unlocked immediately and no progress will be saved.
                            </span>
                            <div className="pt-2">
                                <Input
                                    placeholder="Enter cancellation reason (optional)..."
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    className="text-xs h-9"
                                />
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
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
