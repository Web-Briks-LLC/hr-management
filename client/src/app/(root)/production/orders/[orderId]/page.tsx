'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { AppDialog } from '@/components/shared/app-dialog';
import { toast } from 'sonner';
import {
    useGetSanitizedOrdersQuery,
    useGetOrderImagesQuery,
    useFlagImageRevisionMutation,
    useQcApproveImagesMutation,
} from '@/redux/features/production/productionApi';
import { OrderWorkflowDrawer } from '@/components/production/order-workflow-drawer';
import { useProductionAccess } from '@/hooks/use-production-access';
import { useSocket } from '@/contexts/SocketContext';
import {
    ArrowLeft,
    Search,
    Filter,
    FileImage,
    CheckCircle2,
    CheckCheck,
    XCircle,
    AlertTriangle,
    RefreshCw,
    Lock,
    Unlock,
    ShieldAlert,
    History,
    Clock,
    CircleDashed,
    Eye,
    UploadCloud,
    Loader2,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function OrderInspectPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const orderId = params.orderId as string;
    const backHref = searchParams.get('from')
        ? decodeURIComponent(searchParams.get('from') as string)
        : '/production?tab=images';

    const { canDoQC, isTelemarketer, isLoading: isAccessLoading } = useProductionAccess();
    const { socket } = useSocket();

    // Image filter & pagination state
    const [imageStatusFilter, setImageStatusFilter] = useState<string>('all');
    const [imageSearchQuery, setImageSearchQuery] = useState<string>('');
    const [imagePage, setImagePage] = useState<number>(1);
    const [imageLimit, setImageLimit] = useState<number>(20);

    // Single-image revision dialog
    const [isRevisionDialogOpen, setIsRevisionDialogOpen] = useState<boolean>(false);
    const [revisionImageNames, setRevisionImageNames] = useState<string[]>([]);
    const [revisionInstruction, setRevisionInstruction] = useState<string>('');

    // Workflow timeline drawer
    const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

    // Accept All confirmation
    const [isAcceptAllOpen, setIsAcceptAllOpen] = useState<boolean>(false);

    // Bulk Revision (drag & drop)
    const [isBulkRevisionOpen, setIsBulkRevisionOpen] = useState<boolean>(false);
    const [bulkDroppedNames, setBulkDroppedNames] = useState<string[]>([]);
    const [bulkInstruction, setBulkInstruction] = useState<string>('');
    const [isBulkSubmitting, setIsBulkSubmitting] = useState<boolean>(false);

    // Queries
    const {
        data: ordersData,
        refetch: refetchOrders,
    } = useGetSanitizedOrdersQuery({ includeCompleted: true });

    const selectedOrder = useMemo(
        () => (ordersData?.data || []).find((o) => o._id === orderId) || null,
        [ordersData, orderId]
    );

    const {
        data: imagesData,
        isLoading: isImagesLoading,
        refetch: refetchImages,
    } = useGetOrderImagesQuery({
        orderId,
        status: imageStatusFilter !== 'all' ? imageStatusFilter : undefined,
        search: imageSearchQuery || undefined,
    });

    const [flagRevision, { isLoading: isFlagging }] = useFlagImageRevisionMutation();
    const [qcApprove, { isLoading: isApproving }] = useQcApproveImagesMutation();

    const orderImagesResponse = imagesData?.data;
    const allImages = orderImagesResponse?.images || [];
    const summary = orderImagesResponse?.summary || selectedOrder?.imageStats || {
        totalExpected: selectedOrder?.imageQuantity || 0,
        totalRegistered: 0,
        completedCount: 0,
        inProgressCount: 0,
        partiallyCompletedCount: 0,
        pendingQcCount: 0,
        revisionCount: 0,
        unassignedCount: selectedOrder?.imageQuantity || 0,
    };

    // Paginated images
    const totalImagePages = Math.max(1, Math.ceil(allImages.length / imageLimit));
    const safeImagePage = Math.min(imagePage, totalImagePages);
    const paginatedImages = useMemo(() => {
        const start = (safeImagePage - 1) * imageLimit;
        return allImages.slice(start, start + imageLimit);
    }, [allImages, safeImagePage, imageLimit]);

    // Bulk-revision matching (against images currently awaiting QC)
    const pendingQcImages = useMemo(
        () => allImages.filter((img) => img.status === 'pending_qc'),
        [allImages]
    );
    const pendingQcNameSet = useMemo(
        () => new Set(pendingQcImages.map((img) => img.imageName)),
        [pendingQcImages]
    );
    const matchedBulkNames = useMemo(
        () => bulkDroppedNames.filter((n) => pendingQcNameSet.has(n)),
        [bulkDroppedNames, pendingQcNameSet]
    );
    const unmatchedBulkNames = useMemo(
        () => bulkDroppedNames.filter((n) => !pendingQcNameSet.has(n)),
        [bulkDroppedNames, pendingQcNameSet]
    );
    const othersToAutoAccept = useMemo(
        () => pendingQcImages.map((img) => img.imageName).filter((n) => !matchedBulkNames.includes(n)),
        [pendingQcImages, matchedBulkNames]
    );

    const columnCount = canDoQC ? 6 : 5;

    // Auto-sync with socket events
    useEffect(() => {
        if (!socket) return;

        const handleUpdate = () => {
            refetchOrders();
            refetchImages();
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
    }, [socket, refetchOrders, refetchImages]);

    const showApproveToast = (res: { message: string; data?: { orderCompleted: boolean } }) => {
        if (res.data?.orderCompleted) {
            toast.success('🎉 All images approved — order is now Completed', {
                description: 'It stays visible here under the "Completed" filter.',
            });
        } else {
            toast.success(res.message || 'Image(s) approved');
        }
    };

    const handleOpenRevisionDialog = (imageName: string) => {
        setRevisionImageNames([imageName]);
        setRevisionInstruction('');
        setIsRevisionDialogOpen(true);
    };

    const handleConfirmRevision = async () => {
        if (revisionImageNames.length === 0) return;
        if (!revisionInstruction.trim()) {
            toast.error('Please enter revision instructions');
            return;
        }

        try {
            const res = await flagRevision({
                orderId,
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

    const handleApproveImage = async (imageName: string) => {
        try {
            const res = await qcApprove({ orderId, imageNames: [imageName] }).unwrap();
            showApproveToast(res);
            refetchImages();
            refetchOrders();
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to approve image');
        }
    };

    const handleAcceptAll = async () => {
        const names = pendingQcImages.map((img) => img.imageName);
        if (names.length === 0) return;

        try {
            const res = await qcApprove({ orderId, imageNames: names }).unwrap();
            showApproveToast(res);
            setIsAcceptAllOpen(false);
            refetchImages();
            refetchOrders();
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to approve images');
        }
    };

    const resetBulkRevisionState = () => {
        setBulkDroppedNames([]);
        setBulkInstruction('');
    };

    const onBulkDrop = useCallback((acceptedFiles: File[]) => {
        if (!acceptedFiles || acceptedFiles.length === 0) return;
        const names = acceptedFiles.map((f) => f.name.trim()).filter(Boolean);
        setBulkDroppedNames((prev) => Array.from(new Set([...prev, ...names])));
    }, []);

    const {
        getRootProps: getBulkRootProps,
        getInputProps: getBulkInputProps,
        isDragActive: isBulkDragActive,
    } = useDropzone({ onDrop: onBulkDrop, noClick: false });

    const handleBulkRevision = async (alsoAcceptOthers: boolean) => {
        if (matchedBulkNames.length === 0 || !bulkInstruction.trim()) return;

        setIsBulkSubmitting(true);
        try {
            await flagRevision({
                orderId,
                imageNames: matchedBulkNames,
                instruction: bulkInstruction.trim(),
            }).unwrap();

            if (alsoAcceptOthers && othersToAutoAccept.length > 0) {
                const res = await qcApprove({ orderId, imageNames: othersToAutoAccept }).unwrap();
                toast.success(
                    `Sent ${matchedBulkNames.length} image(s) to revision, approved ${othersToAutoAccept.length} other(s).`
                );
                if (res.data?.orderCompleted) {
                    toast.success('🎉 Order is now Completed', {
                        description: 'It stays visible here under the "Completed" filter.',
                    });
                }
            } else {
                toast.success(`Sent ${matchedBulkNames.length} image(s) to revision.`);
            }

            setIsBulkRevisionOpen(false);
            resetBulkRevisionState();
            refetchImages();
            refetchOrders();
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to process bulk revision');
        } finally {
            setIsBulkSubmitting(false);
        }
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

    if (isAccessLoading) {
        return (
            <div className="space-y-6 pb-8">
                <Skeleton className="h-10 w-64 rounded-xl" />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                </div>
                <Skeleton className="h-96 w-full rounded-2xl" />
            </div>
        );
    }

    if (isTelemarketer) {
        return (
            <div className="p-4 sm:p-6 max-w-3xl mx-auto">
                <Card className="border-destructive/30 bg-destructive/5 text-center p-8">
                    <CardHeader className="flex flex-col items-center gap-3">
                        <div className="p-4 rounded-full bg-destructive/10 text-destructive">
                            <ShieldAlert className="h-10 w-10" />
                        </div>
                        <CardTitle className="text-xl font-bold text-destructive">
                            Access Restricted
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground max-w-md mx-auto">
                        <p>
                            Production floor workstation is only accessible to photo editors, graphic designers, team leaders, and operations managers.
                        </p>
                        <Button
                            variant="outline"
                            onClick={() => router.push('/dashboard')}
                            className="mt-2 text-xs"
                        >
                            Return to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const kpiCards = [
        {
            label: 'Registered',
            value: summary.totalRegistered,
            icon: FileImage,
            iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
            badge: 'Reg',
        },
        {
            label: 'In Progress',
            value: summary.inProgressCount,
            icon: Clock,
            iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
            badge: 'Active',
        },
        {
            label: 'Partially Done',
            value: summary.partiallyCompletedCount,
            icon: CircleDashed,
            iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
            badge: 'Partial',
        },
        {
            label: 'Awaiting QC',
            value: summary.pendingQcCount,
            icon: Eye,
            iconBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
            badge: 'QC',
        },
        {
            label: 'Completed',
            value: summary.completedCount,
            icon: CheckCircle2,
            iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
            badge: 'Done',
        },
        {
            label: 'In Revision',
            value: summary.revisionCount,
            icon: AlertTriangle,
            iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
            badge: 'Revision',
        },
    ];

    return (
        <div className="space-y-6 pb-8">
            {/* Top Bar: Back Button, Order Identity & Quick Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => router.push(backHref)}
                        className="h-9 w-9 rounded-lg border-border/60 hover:bg-muted shrink-0"
                        title="Back to Image Tracking"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>

                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {selectedOrder?.orderName || 'Order'}
                            </h1>
                            {selectedOrder && getStatusBadge(selectedOrder.status)}
                            {selectedOrder && getPriorityBadge(selectedOrder.priority)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Target: {selectedOrder?.imageQuantity ?? '—'} images
                            {selectedOrder?.deadline && (
                                <> &nbsp;·&nbsp; Due {format(new Date(selectedOrder.deadline), 'dd MMM yyyy, hh:mm a')}</>
                            )}
                        </p>
                    </div>
                </div>

                {/* Quick Action Buttons & Switcher */}
                <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsDrawerOpen(true)}
                        className="h-9 text-xs font-medium"
                    >
                        <History className="h-3.5 w-3.5 mr-1.5" />
                        Timeline
                    </Button>

                    {canDoQC && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsAcceptAllOpen(true)}
                                disabled={summary.pendingQcCount === 0}
                                className="h-9 text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 font-semibold"
                            >
                                <CheckCheck className="h-3.5 w-3.5" />
                                Accept All
                            </Button>

                            <Button
                                size="sm"
                                onClick={() => setIsBulkRevisionOpen(true)}
                                className="h-9 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                            >
                                <UploadCloud className="h-3.5 w-3.5" />
                                Bulk Revision
                            </Button>
                        </>
                    )}

                    {/* Quick Switcher */}
                    <div className="w-[170px]">
                        <Select
                            value={orderId}
                            onValueChange={(val) => {
                                const qs = searchParams.get('from')
                                    ? `?from=${encodeURIComponent(backHref)}`
                                    : '';
                                router.push(`/production/orders/${val}${qs}`);
                            }}
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {kpiCards.map((card) => (
                    <Card
                        key={card.label}
                        className="border-border/60 shadow-xs hover:shadow-md transition-all duration-200"
                    >
                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className={cn('p-2 rounded-lg', card.iconBg)}>
                                    <card.icon className="h-4 w-4" />
                                </div>
                                <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0 h-4 border-border/60">
                                    {card.badge}
                                </Badge>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold tracking-tight text-foreground truncate">
                                    {card.value}
                                </h3>
                                <p className="text-xs font-medium text-muted-foreground mt-0.5 truncate">
                                    {card.label}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Image Level Filter Toolbar */}
            <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-2">
                    <div className="bg-primary/10 p-2 rounded-full">
                        <Filter className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium">Filter Images:</span>
                </div>

                <div className="w-full sm:w-[160px]">
                    <Select
                        value={imageStatusFilter}
                        onValueChange={(val) => {
                            setImageStatusFilter(val);
                            setImagePage(1);
                        }}
                    >
                        <SelectTrigger className="h-9 text-xs bg-background/60">
                            <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="in_progress">In Progress (Locked)</SelectItem>
                            <SelectItem value="partially_completed">Partially Done</SelectItem>
                            <SelectItem value="pending_qc">Awaiting QC</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="in_revision">In Revision</SelectItem>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        placeholder="Search image name (e.g. IMG_0042.jpg)..."
                        value={imageSearchQuery}
                        onChange={(e) => {
                            setImageSearchQuery(e.target.value);
                            setImagePage(1);
                        }}
                        className="pl-9 h-9 text-xs bg-background/60 w-full"
                    />
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchImages()}
                    className="h-9 text-xs font-semibold"
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
                            {canDoQC && <TableHead className="font-bold text-right">Actions</TableHead>}
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
                                    {canDoQC && <TableCell><Skeleton className="h-7 w-16 ml-auto" /></TableCell>}
                                </TableRow>
                            ))
                        ) : paginatedImages.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columnCount} className="h-40 text-center text-muted-foreground">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <FileImage className="h-8 w-8 opacity-20" />
                                        <p className="text-sm font-medium">No image records found</p>
                                        <p className="text-xs opacity-70">
                                            Start work on images from the Workstation tab to register them.
                                        </p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedImages.map((image) => {
                                const completedStepNames = new Set(
                                    (image.completedSteps || []).map((s) => s.stepName)
                                );

                                return (
                                    <TableRow key={image._id} className="hover:bg-muted/20 text-xs py-3">
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
                                                <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30 text-[10px]">
                                                    Completed
                                                </Badge>
                                            )}
                                            {image.status === 'in_progress' && (
                                                <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30 text-[10px] animate-pulse">
                                                    In Progress
                                                </Badge>
                                            )}
                                            {image.status === 'partially_completed' && (
                                                <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px]">
                                                    Partially Done
                                                </Badge>
                                            )}
                                            {image.status === 'pending_qc' && (
                                                <Badge className="bg-sky-500/20 text-sky-700 dark:text-sky-400 border-sky-500/30 text-[10px] font-bold animate-pulse">
                                                    Awaiting QC
                                                </Badge>
                                            )}
                                            {image.status === 'in_revision' && (
                                                <Badge className="bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30 text-[10px] font-bold">
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
                                                                    ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 line-through opacity-70'
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
                                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-green-500/15 text-green-800 dark:text-green-300 border border-green-500/30 font-medium cursor-default">
                                                                        <CheckCircle2 className="h-3 w-3 text-green-600" />
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
                                                <span className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
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

                                        {/* Actions: Quality Check (Approve / Reject) */}
                                        {canDoQC && (
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {image.status === 'pending_qc' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            disabled={isApproving}
                                                            onClick={() => handleApproveImage(image.imageName)}
                                                            className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 font-medium"
                                                        >
                                                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                                            Approve
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleOpenRevisionDialog(image.imageName)}
                                                        className="h-7 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-500/10 font-medium"
                                                    >
                                                        <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                                                        {image.status === 'pending_qc' ? 'Reject' : 'Revision'}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>

                {/* Pagination Footer */}
                {allImages.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border/60 bg-muted/10">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Rows per page:</span>
                            <Select
                                value={imageLimit.toString()}
                                onValueChange={(v) => {
                                    setImageLimit(Number(v));
                                    setImagePage(1);
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
                                Showing {Math.min((safeImagePage - 1) * imageLimit + 1, allImages.length)} to{' '}
                                {Math.min(safeImagePage * imageLimit, allImages.length)} of {allImages.length} images
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setImagePage(1)}
                                disabled={safeImagePage === 1}
                            >
                                <ChevronsLeft className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setImagePage((p) => Math.max(1, p - 1))}
                                disabled={safeImagePage === 1}
                            >
                                <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <span className="text-xs font-medium px-2">
                                Page {safeImagePage} of {totalImagePages}
                            </span>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setImagePage((p) => Math.min(totalImagePages, p + 1))}
                                disabled={safeImagePage >= totalImagePages}
                            >
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setImagePage(totalImagePages)}
                                disabled={safeImagePage >= totalImagePages}
                            >
                                <ChevronsRight className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* 1. Single Image Revision Dialog */}
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

            {/* 2. Order Workflow Drawer */}
            <OrderWorkflowDrawer
                open={isDrawerOpen}
                onOpenChange={setIsDrawerOpen}
                orderId={orderId}
            />

            {/* 3. Accept All confirmation */}
            <AlertDialog open={isAcceptAllOpen} onOpenChange={setIsAcceptAllOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Approve all images awaiting QC?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will approve all {summary.pendingQcCount} image(s) currently awaiting QC on this order. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isApproving}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleAcceptAll}
                            disabled={isApproving}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                            {isApproving && <Loader2 className="h-4 w-4 animate-spin" />}
                            Approve All
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* 4. Bulk Revision (drag & drop) */}
            <AppDialog
                open={isBulkRevisionOpen}
                onOpenChange={(open) => {
                    setIsBulkRevisionOpen(open);
                    if (!open) resetBulkRevisionState();
                }}
                maxWidth="lg"
                title="Bulk Revision"
                description="Drop image files whose names match images awaiting QC — matched ones get sent to revision."
                icon={<UploadCloud className="h-5 w-5" />}
                footer={
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setIsBulkRevisionOpen(false);
                                resetBulkRevisionState();
                            }}
                            disabled={isBulkSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleBulkRevision(false)}
                            disabled={isBulkSubmitting || matchedBulkNames.length === 0 || !bulkInstruction.trim()}
                            className="border-orange-500/40 text-orange-700 dark:text-orange-300 hover:bg-orange-500/10 font-semibold"
                        >
                            Only Revision
                        </Button>
                        <Button
                            type="button"
                            onClick={() => handleBulkRevision(true)}
                            disabled={isBulkSubmitting || matchedBulkNames.length === 0 || !bulkInstruction.trim()}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                        >
                            {isBulkSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            Revision &amp; Accept Others
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div
                        {...getBulkRootProps()}
                        className={cn(
                            'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center gap-2',
                            isBulkDragActive
                                ? 'border-primary bg-primary/10'
                                : 'border-border/80 hover:border-primary/50 hover:bg-muted/30 bg-muted/10'
                        )}
                    >
                        <input {...getBulkInputProps()} />
                        <UploadCloud className="h-7 w-7 text-primary" />
                        <p className="text-sm font-semibold text-foreground">
                            {isBulkDragActive
                                ? 'Drop the images here...'
                                : 'Drag & drop image files here, or click to browse'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Only the filenames are used to match — nothing is uploaded.
                        </p>
                    </div>

                    {bulkDroppedNames.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold">
                                    {matchedBulkNames.length} matched · {unmatchedBulkNames.length} not found
                                </Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setBulkDroppedNames([])}
                                    className="h-6 text-[11px] text-muted-foreground hover:text-destructive"
                                >
                                    Clear all
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                                {bulkDroppedNames.map((name) => {
                                    const isMatched = pendingQcNameSet.has(name);
                                    return (
                                        <span
                                            key={name}
                                            className={cn(
                                                'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border',
                                                isMatched
                                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                                    : 'bg-destructive/10 text-destructive border-destructive/30'
                                            )}
                                        >
                                            {isMatched ? (
                                                <CheckCircle2 className="h-3 w-3" />
                                            ) : (
                                                <XCircle className="h-3 w-3" />
                                            )}
                                            {name}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setBulkDroppedNames((prev) => prev.filter((n) => n !== name))
                                                }
                                                className="ml-0.5 opacity-60 hover:opacity-100"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    );
                                })}
                            </div>
                            {unmatchedBulkNames.length > 0 && (
                                <p className="text-[11px] text-destructive">
                                    {unmatchedBulkNames.length} file name(s) don&apos;t match any image currently awaiting QC on this order.
                                </p>
                            )}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label htmlFor="bulkInstruction" className="text-xs font-semibold">
                            Revision Instructions:
                        </Label>
                        <Textarea
                            id="bulkInstruction"
                            placeholder="E.g., Fix neck joint alignment, smooth out skin shadows, adjust edge feather..."
                            value={bulkInstruction}
                            onChange={(e) => setBulkInstruction(e.target.value)}
                            className="text-xs min-h-[80px]"
                        />
                    </div>
                </div>
            </AppDialog>
        </div>
    );
}
