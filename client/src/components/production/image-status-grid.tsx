'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
    useGetSanitizedOrdersQuery,
    useGetOrderImagesQuery,
    useFlagImageRevisionMutation,
} from '@/redux/features/production/productionApi';
import {
    Layers,
    Search,
    Filter,
    FileImage,
    CheckCircle2,
    Clock,
    AlertTriangle,
    RefreshCw,
    UserCheck,
    Tag,
    FileEdit,
    Lock,
    Unlock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export function ImageStatusGrid() {
    const [selectedOrderId, setSelectedOrderId] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Revision dialog state
    const [isRevisionDialogOpen, setIsRevisionDialogOpen] = useState<boolean>(false);
    const [revisionImageNames, setRevisionImageNames] = useState<string[]>([]);
    const [revisionInstruction, setRevisionInstruction] = useState<string>('');

    const { data: ordersData, isLoading: isOrdersLoading } = useGetSanitizedOrdersQuery();
    const orders = ordersData?.data || [];

    // Auto-select first order if none selected
    const activeOrderId = selectedOrderId || (orders.length > 0 ? orders[0]._id : '');

    const {
        data: imagesData,
        isLoading: isImagesLoading,
        refetch: refetchImages,
    } = useGetOrderImagesQuery(
        {
            orderId: activeOrderId,
            status: statusFilter !== 'all' ? statusFilter : undefined,
            search: searchQuery || undefined,
        },
        { skip: !activeOrderId }
    );

    const [flagRevision, { isLoading: isFlagging }] = useFlagImageRevisionMutation();

    const orderImagesResponse = imagesData?.data;
    const images = orderImagesResponse?.images || [];
    const summary = orderImagesResponse?.summary || {
        totalExpected: 0,
        totalRegistered: 0,
        completedCount: 0,
        inProgressCount: 0,
        partiallyCompletedCount: 0,
        revisionCount: 0,
        unassignedCount: 0,
    };

    const handleOpenRevisionDialog = (imageName: string) => {
        setRevisionImageNames([imageName]);
        setRevisionInstruction('');
        setIsRevisionDialogOpen(true);
    };

    const handleConfirmRevision = async () => {
        if (!activeOrderId || revisionImageNames.length === 0) return;
        if (!revisionInstruction.trim()) {
            toast.error('Please enter revision instructions');
            return;
        }

        try {
            const res = await flagRevision({
                orderId: activeOrderId,
                imageNames: revisionImageNames,
                instruction: revisionInstruction.trim(),
            }).unwrap();

            toast.success(res.message || 'Image marked for revision');
            setIsRevisionDialogOpen(false);
            refetchImages();
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to flag image revision');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header & Order Select Filter */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <FileImage className="h-5 w-5 text-primary" />
                        ইমেজ ট্র্যাকিং ম্যাট্রিক্স (Image Level Tracking)
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        অর্ডারের প্রতিটি ইমেজ কোন পর্যায়ে আছে, কে কাজ করছে এবং কোন কোন কাজ সম্পন্ন হয়েছে তা ট্র্যাক করুন।
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="w-full sm:w-[240px]">
                        <Select
                            value={activeOrderId}
                            onValueChange={(val) => setSelectedOrderId(val)}
                        >
                            <SelectTrigger className="h-9 text-xs font-mono bg-background">
                                <SelectValue placeholder="Select Order..." />
                            </SelectTrigger>
                            <SelectContent>
                                {orders.map((o) => (
                                    <SelectItem key={o._id} value={o._id} className="text-xs font-mono">
                                        {o.orderName} ({o.imageQuantity} imgs)
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetchImages()}
                        className="h-9 text-xs gap-1.5"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* KPI Summary Cards for Selected Order */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="rounded-xl border bg-card p-3 space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                        Total Target
                    </span>
                    <p className="text-2xl font-black text-foreground">
                        {summary.totalExpected}
                    </p>
                </div>
                <div className="rounded-xl border bg-card p-3 space-y-1 border-blue-500/30">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">
                        Registered
                    </span>
                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                        {summary.totalRegistered}
                    </p>
                </div>
                <div className="rounded-xl border bg-card p-3 space-y-1 border-orange-500/30">
                    <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase">
                        In Progress
                    </span>
                    <p className="text-2xl font-black text-orange-600 dark:text-orange-400">
                        {summary.inProgressCount}
                    </p>
                </div>
                <div className="rounded-xl border bg-card p-3 space-y-1 border-amber-500/30">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                        Partially Done
                    </span>
                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                        {summary.partiallyCompletedCount}
                    </p>
                </div>
                <div className="rounded-xl border bg-card p-3 space-y-1 border-emerald-500/30">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                        Completed
                    </span>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {summary.completedCount}
                    </p>
                </div>
                <div className="rounded-xl border bg-card p-3 space-y-1 border-destructive/30">
                    <span className="text-[10px] font-bold text-destructive uppercase">
                        In Revision
                    </span>
                    <p className="text-2xl font-black text-destructive">
                        {summary.revisionCount}
                    </p>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Filter className="h-3.5 w-3.5" /> Filter:
                </div>

                <div className="w-full sm:w-[160px]">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-8 text-xs bg-background">
                            <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="in_progress">In Progress (লকড)</SelectItem>
                            <SelectItem value="partially_completed">Partially Done</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="in_revision">In Revision</SelectItem>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        placeholder="Search image name (e.g. IMG_0042.jpg)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-8 text-xs bg-background"
                    />
                </div>
            </div>

            {/* Images Table */}
            <div className="rounded-xl border border-border/60 overflow-hidden bg-background">
                <Table>
                    <TableHeader className="bg-muted/40">
                        <TableRow className="border-b-border/60 text-xs">
                            <TableHead className="font-bold">Image Filename</TableHead>
                            <TableHead className="font-bold text-center">Status</TableHead>
                            <TableHead className="font-bold">Required Steps</TableHead>
                            <TableHead className="font-bold">Completed Work (সম্পন্ন কাজ)</TableHead>
                            <TableHead className="font-bold">Current Lock / Editor</TableHead>
                            <TableHead className="font-bold text-right">Actions</TableHead>
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
                                    <TableCell><Skeleton className="h-7 w-16 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : images.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <FileImage className="h-8 w-8 opacity-20" />
                                        <p className="text-sm font-medium">কোনো ইমেজ পাওয়া যায়নি</p>
                                        <p className="text-xs opacity-70">
                                            ওয়ার্কস্টেশনে ছবি ড্র্যাগ অ্যান্ড ড্রপ করে কাজ শুরু করলে এখানে ইমেজ তালিকা প্রদর্শিত হবে।
                                        </p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            images.map((image) => {
                                const completedStepNames = new Set(
                                    (image.completedSteps || []).map((s) => s.stepName)
                                );

                                return (
                                    <TableRow key={image._id} className="hover:bg-muted/20 text-xs">
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
                                                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                                                    Completed
                                                </Badge>
                                            )}
                                            {image.status === 'in_progress' && (
                                                <Badge className="bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30 text-[10px] animate-pulse">
                                                    In Progress
                                                </Badge>
                                            )}
                                            {image.status === 'partially_completed' && (
                                                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px]">
                                                    Partially Done
                                                </Badge>
                                            )}
                                            {image.status === 'in_revision' && (
                                                <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px] font-bold">
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
                                                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 line-through opacity-70'
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
                                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 font-medium cursor-default">
                                                                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
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
                                                <span className="inline-flex items-center gap-1 font-semibold text-orange-600 dark:text-orange-400">
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

                                        {/* Actions: Flag Revision */}
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleOpenRevisionDialog(image.imageName)}
                                                className="h-7 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 font-medium"
                                            >
                                                <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                                                Revision
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Revision Dialog */}
            <Dialog open={isRevisionDialogOpen} onOpenChange={setIsRevisionDialogOpen}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            ইমেজে রিভিশন মার্ক করুন (Flag for Revision)
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            ইমেজ: <span className="font-mono font-bold">{revisionImageNames.join(', ')}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="instruction" className="text-xs font-semibold">
                                Revision Instructions (কী ঠিক করতে হবে):
                            </Label>
                            <Textarea
                                id="instruction"
                                placeholder="যেমন: Neck joint edge ঠিক করতে হবে, background shadow আরও smooth করতে হবে..."
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
        </div>
    );
}
