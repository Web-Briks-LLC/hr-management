'use client';
import { ScrollBox } from '@/components/shared/scroll-box';
import { TablePagination } from '@/components/shared/table-pagination';
import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import {
    useGetOrderImagesQuery,
    useQcApproveImagesMutation,
    useFlagImageRevisionMutation,
} from '@/redux/features/production/productionApi';
import { useProductionAccess } from '@/hooks/use-production-access';
import { useSocket } from '@/contexts/SocketContext';
import { ProductionActivity } from '@/components/production/production-activity';
import { OrderWorkflowDrawer } from '@/components/production/order-workflow-drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@/components/ui/select';
import {
    Table,
    TableHeader,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
} from '@/components/shared/earnings-table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    ArrowLeft,
    CalendarClock,
    CheckCircle2,
    ClipboardCheck,
    History,
    Images,
    Info,
    Pencil,
    RotateCcw,
    Search,
    UserRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS: Record<string, { label: string; className: string }> = {
    unassigned: {
        label: 'Available',
        className: 'border-border bg-muted text-muted-foreground',
    },
    in_progress: {
        label: 'Being edited',
        className:
            'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400',
    },
    partially_completed: {
        label: 'Partly done · available',
        className:
            'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400',
    },
    pending_qc: {
        label: 'Waiting for review',
        className:
            'border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
    },
    completed: {
        label: 'Approved',
        className:
            'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    },
    in_revision: {
        label: 'Sent back · available',
        className:
            'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    },
};

export default function ProductionOrderPage({
    params,
}: {
    params: Promise<{ orderId: string }>;
}) {
    const { orderId } = use(params);
    const access = useProductionAccess();
    const { socket } = useSocket();
    const query = useGetOrderImagesQuery(
        { orderId },
        { pollingInterval: 15000 },
    );
    const [approve, approval] = useQcApproveImagesMutation();
    const [revise, revision] = useFlagImageRevisionMutation();
    const [status, setStatus] = useState('all');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<string[]>([]);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [dialog, setDialog] = useState<'approve' | 'revision' | null>(null);
    const [note, setNote] = useState('');
    const [error, setError] = useState('');
    const [legacy, setLegacy] = useState(false);
    const [imageHistory, setImageHistory] = useState<string | null>(null);
    const order = query.data?.data?.order;
    const summary = query.data?.data?.summary;
    const images = query.data?.data?.images || [];
    const filtered = images.filter(
        (i) =>
            (status === 'all' || i.status === status) &&
            i.imageName.toLowerCase().includes(search.toLowerCase()),
    );
    const pages = Math.max(1, Math.ceil(filtered.length / limit));
    const current = Math.min(page, pages);
    const shown = filtered.slice((current - 1) * limit, current * limit);
    const reviewable = shown.filter(
        (i) =>
            !i.currentSessionId &&
            ['pending_qc', 'completed'].includes(i.status),
    );
    const canApprove =
        !!selected.length &&
        selected.every((name) =>
            images.some(
                (i) =>
                    i.imageName === name &&
                    i.status === 'pending_qc' &&
                    !i.currentSessionId,
            ),
        );
    const canRevise =
        !!selected.length &&
        selected.every((name) =>
            images.some(
                (i) =>
                    i.imageName === name &&
                    ['pending_qc', 'completed'].includes(i.status) &&
                    !i.currentSessionId,
            ),
        );
    const busy = approval.isLoading || revision.isLoading;
    useEffect(() => {
        if (!socket) return;
        const update = () => query.refetch();
        socket.on('production:images_updated', update);
        socket.on('production:images_locked', update);
        return () => {
            socket.off('production:images_updated', update);
            socket.off('production:images_locked', update);
        };
    }, [socket, query.refetch]);
    const filterBy = (next: string) => {
        setStatus((previous) => (previous === next ? 'all' : next));
        setPage(1);
        setSelected([]);
    };
    const confirm = async () => {
        setError('');
        try {
            const result =
                dialog === 'approve'
                    ? await approve({ orderId, imageNames: selected }).unwrap()
                    : await revise({
                          orderId,
                          imageNames: selected,
                          instruction: note,
                      }).unwrap();
            toast.success(result.message || 'Review saved');
            setSelected([]);
            setDialog(null);
        } catch (e) {
            setError(
                (e as { data?: { message?: string } }).data?.message ||
                    'We could not save your review. Refresh the page and try again.',
            );
        }
    };
    if (query.isLoading || access.isLoading)
        return (
            <div className="mx-auto w-full max-w-7xl space-y-4">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-80 w-full" />
            </div>
        );
    if (query.isError || !order || !summary)
        return (
            <div className="mx-auto w-full max-w-7xl space-y-4">
                <Button asChild variant="ghost" className="-ml-3">
                    <Link href="/production?tab=images">
                        <ArrowLeft className="size-4" />
                        All production orders
                    </Link>
                </Button>
                <Alert variant="destructive">
                    <AlertTitle>We could not load this order</AlertTitle>
                    <AlertDescription>
                        This is usually a connection problem, or the order may
                        have been removed.
                        <Button
                            className="mt-3"
                            variant="outline"
                            onClick={() => query.refetch()}
                        >
                            Try again
                        </Button>
                    </AlertDescription>
                </Alert>
            </div>
        );
    const total = order.imageQuantity;
    const approvedPercent = total
        ? Math.round((100 * summary.completedCount) / total)
        : 0;
    const tiles = [
        {
            key: 'all',
            label: 'Ordered',
            hint: `${summary.totalRegistered} started`,
            value: total,
            icon: Images,
            tone: 'text-foreground bg-muted',
        },
        {
            key: 'in_progress',
            label: 'Being edited',
            hint: 'With editors now',
            value: summary.inProgressCount,
            icon: Pencil,
            tone: 'text-sky-600 bg-sky-500/10 dark:text-sky-400',
        },
        {
            key: 'pending_qc',
            label: 'In review',
            hint: 'Waiting for quality check',
            value: summary.pendingQcCount,
            icon: ClipboardCheck,
            tone: 'text-indigo-600 bg-indigo-500/10 dark:text-indigo-400',
        },
        {
            key: 'in_revision',
            label: 'Sent back',
            hint: 'Needs corrections',
            value: summary.revisionCount,
            icon: RotateCcw,
            tone: 'text-amber-600 bg-amber-500/10 dark:text-amber-400',
        },
        {
            key: 'completed',
            label: 'Approved',
            hint: `${approvedPercent}% of the order`,
            value: summary.completedCount,
            icon: CheckCircle2,
            tone: 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400',
        },
    ];
    return (
        <div className="mx-auto w-full min-w-0 max-w-7xl space-y-6 pb-10">
            <Button asChild variant="ghost" className="-ml-3">
                <Link href="/production?tab=images">
                    <ArrowLeft className="size-4" />
                    All production orders
                </Link>
            </Button>

            <Card className="border-border/60 shadow-md">
                <CardHeader className="gap-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 space-y-2">
                            <Badge variant="outline" className="font-mono">
                                {order.clientId?.clientId || 'Production order'}
                            </Badge>
                            <CardTitle className="break-words text-2xl font-semibold tracking-tight">
                                {order.orderName}
                            </CardTitle>
                            <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                <span className="inline-flex items-center gap-1.5">
                                    <Images className="size-4" />
                                    {total} images ordered ·{' '}
                                    {summary.totalRegistered} started
                                </span>
                                {order.deadline && (
                                    <span className="inline-flex items-center gap-1.5">
                                        <CalendarClock className="size-4" />
                                        Due{' '}
                                        {format(
                                            new Date(order.deadline),
                                            'dd MMM yyyy',
                                        )}{' '}
                                        (
                                        {formatDistanceToNow(
                                            new Date(order.deadline),
                                            { addSuffix: true },
                                        )}
                                        )
                                    </span>
                                )}
                            </CardDescription>
                        </div>
                        <Button variant="outline" onClick={() => setLegacy(true)}>
                            <History className="size-4" /> Earlier records
                        </Button>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">Order progress</span>
                            <span className="text-muted-foreground">
                                {summary.completedCount} of {total} approved ·{' '}
                                {approvedPercent}%
                            </span>
                        </div>
                        <Progress value={approvedPercent} className="h-2.5" />
                    </div>
                </CardHeader>
                <Separator />
                <CardContent className="pt-6">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        {tiles.map((tile) => {
                            const active = status === tile.key;
                            return (
                                <button
                                    key={tile.key}
                                    type="button"
                                    onClick={() => filterBy(tile.key)}
                                    aria-pressed={active}
                                    className={cn(
                                        'flex items-center gap-3 rounded-xl border p-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                        active &&
                                            'border-primary bg-primary/5 ring-1 ring-primary/30',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'flex size-10 shrink-0 items-center justify-center rounded-lg',
                                            tile.tone,
                                        )}
                                    >
                                        <tile.icon className="size-5" />
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block text-2xl font-semibold leading-none tabular-nums">
                                            {tile.value}
                                        </span>
                                        <span className="mt-1 block truncate text-sm font-medium">
                                            {tile.label}
                                        </span>
                                        <span className="block truncate text-xs text-muted-foreground">
                                            {tile.hint}
                                        </span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                        Tip: click a box above to show only those images.
                    </p>
                </CardContent>
            </Card>

            {order.instruction && (
                <Alert>
                    <Info className="size-4" />
                    <AlertTitle>Order instructions</AlertTitle>
                    <AlertDescription className="whitespace-pre-wrap">
                        {order.instruction}
                    </AlertDescription>
                </Alert>
            )}

            <Tabs defaultValue="images">
                <TabsList>
                    <TabsTrigger value="images">Images & review</TabsTrigger>
                    <TabsTrigger value="history">Work history</TabsTrigger>
                </TabsList>
                <TabsContent value="images" className="mt-5 space-y-4">
                    <Card className="border-border/60">
                        <CardContent className="space-y-4 p-4">
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <div className="relative flex-1">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        aria-label="Search image names"
                                        className="pl-9"
                                        placeholder="Search image names…"
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setPage(1);
                                            setSelected([]);
                                        }}
                                    />
                                </div>
                                <Select
                                    value={status}
                                    onValueChange={(s) => {
                                        setStatus(s);
                                        setPage(1);
                                        setSelected([]);
                                    }}
                                >
                                    <SelectTrigger
                                        className="sm:w-64"
                                        aria-label="Filter by status"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All images
                                        </SelectItem>
                                        {Object.entries(STATUS).map(
                                            ([value, item]) => (
                                                <SelectItem
                                                    key={value}
                                                    value={value}
                                                >
                                                    {item.label}
                                                </SelectItem>
                                            ),
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            {access.canDoQC && (
                                <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3">
                                    <Badge variant="secondary">
                                        {selected.length} selected
                                    </Badge>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={!reviewable.length}
                                        onClick={() =>
                                            setSelected(
                                                reviewable.map(
                                                    (i) => i.imageName,
                                                ),
                                            )
                                        }
                                    >
                                        Select reviewable on this page
                                    </Button>
                                    <div className="ml-auto flex flex-wrap items-center gap-2">
                                        {!!selected.length && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setSelected([])}
                                            >
                                                Clear
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={!canRevise || busy}
                                            onClick={() => {
                                                setDialog('revision');
                                                setNote('');
                                                setError('');
                                            }}
                                        >
                                            <RotateCcw className="size-4" />
                                            Return for revision
                                        </Button>
                                        <Button
                                            size="sm"
                                            disabled={!canApprove || busy}
                                            onClick={() => {
                                                setDialog('approve');
                                                setError('');
                                            }}
                                        >
                                            <CheckCircle2 className="size-4" />
                                            Approve
                                        </Button>
                                    </div>
                                    {!!selected.length &&
                                        !canApprove &&
                                        canRevise && (
                                            <p className="w-full text-xs text-muted-foreground">
                                                Approve is only available for
                                                images that are waiting for
                                                review. Your selection includes
                                                already-approved images, so you
                                                can only return them for
                                                revision.
                                            </p>
                                        )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <div className="overflow-hidden rounded-md border border-border/60">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {access.canDoQC && (
                                            <TableHead className="w-10" />
                                        )}
                                        <TableHead>Image</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Currently with</TableHead>
                                        <TableHead>Steps done</TableHead>
                                        <TableHead className="text-right">
                                            History
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {shown.map((image) => {
                                        const style = STATUS[image.status];
                                        const holder =
                                            image.currentAssignedStaffId
                                                ?.userId?.name ||
                                            image.currentAssignedStaffId
                                                ?.staffId;
                                        const stepTotal =
                                            image.requiredSteps.length;
                                        return (
                                            <TableRow
                                                key={image._id}
                                                className="transition-colors hover:bg-muted/20"
                                            >
                                                {access.canDoQC && (
                                                    <TableCell>
                                                        <Checkbox
                                                            aria-label={`Select ${image.imageName}`}
                                                            disabled={
                                                                !!image.currentSessionId ||
                                                                ![
                                                                    'pending_qc',
                                                                    'completed',
                                                                ].includes(
                                                                    image.status,
                                                                )
                                                            }
                                                            checked={selected.includes(
                                                                image.imageName,
                                                            )}
                                                            onCheckedChange={(
                                                                checked,
                                                            ) =>
                                                                setSelected(
                                                                    (prev) =>
                                                                        checked
                                                                            ? [
                                                                                  ...prev,
                                                                                  image.imageName,
                                                                              ]
                                                                            : prev.filter(
                                                                                  (
                                                                                      n,
                                                                                  ) =>
                                                                                      n !==
                                                                                      image.imageName,
                                                                              ),
                                                                )
                                                            }
                                                        />
                                                    </TableCell>
                                                )}
                                                <TableCell className="max-w-64">
                                                    <span
                                                        className="block truncate font-medium"
                                                        title={image.imageName}
                                                    >
                                                        {image.imageName}
                                                    </span>
                                                    {image.isRevision && (
                                                        <p className="mt-1 line-clamp-2 text-xs text-amber-700 dark:text-amber-400">
                                                            Revision note:{' '}
                                                            {image.revisionHistory.at(
                                                                -1,
                                                            )?.instruction ||
                                                                'No note left'}
                                                        </p>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            'whitespace-nowrap font-medium',
                                                            style?.className,
                                                        )}
                                                    >
                                                        {style?.label ||
                                                            image.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {holder ? (
                                                        <span className="inline-flex items-center gap-1.5 text-sm">
                                                            <UserRound className="size-4 text-muted-foreground" />
                                                            {holder}
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm text-muted-foreground">
                                                            Nobody
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="min-w-24 space-y-1">
                                                        <span className="text-sm tabular-nums">
                                                            {
                                                                image
                                                                    .completedSteps
                                                                    .length
                                                            }{' '}
                                                            of {stepTotal}
                                                        </span>
                                                        <Progress
                                                            className="h-1.5"
                                                            value={
                                                                stepTotal
                                                                    ? (100 *
                                                                          image
                                                                              .completedSteps
                                                                              .length) /
                                                                      stepTotal
                                                                    : 0
                                                            }
                                                        />
                                                        {!!image.completedSteps
                                                            .length && (
                                                            <details className="text-xs text-muted-foreground">
                                                                <summary className="cursor-pointer">
                                                                    Who did what
                                                                </summary>
                                                                {image.completedSteps.map(
                                                                    (step) => (
                                                                        <p
                                                                            key={
                                                                                step.stepName
                                                                            }
                                                                        >
                                                                            {
                                                                                step.stepName
                                                                            }{' '}
                                                                            ·{' '}
                                                                            {step
                                                                                .completedBy
                                                                                ?.userId
                                                                                ?.name ||
                                                                                step
                                                                                    .completedBy
                                                                                    ?.staffId ||
                                                                                'Editor'}
                                                                        </p>
                                                                    ),
                                                                )}
                                                            </details>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            setImageHistory(
                                                                image.imageName,
                                                            )
                                                        }
                                                    >
                                                        <History className="size-4" />
                                                        View
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {!shown.length && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={access.canDoQC ? 6 : 5}
                                                className="h-40 text-center text-muted-foreground"
                                            >
                                                {images.length
                                                    ? 'No images match your search or filter. Clear them to see all images.'
                                                    : 'No images yet. They appear here after an editor takes work on this order.'}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                    <TablePagination
                        page={current}
                        limit={limit}
                        total={filtered.length}
                        onPageChange={(next) => {
                            setPage(next);
                            setSelected([]);
                        }}
                        onLimitChange={(next) => {
                            setLimit(next);
                            setSelected([]);
                        }}
                        isFetching={query.isFetching}
                    />
                </TabsContent>
                <TabsContent value="history" className="mt-5">
                    <Card>
                        <CardContent className="p-5">
                            <ProductionActivity orderId={orderId} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            <Dialog
                open={!!dialog}
                onOpenChange={(open) => {
                    if (!open && !busy) setDialog(null);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {dialog === 'approve'
                                ? `Approve ${selected.length} images?`
                                : `Return ${selected.length} images for revision?`}
                        </DialogTitle>
                        <DialogDescription>
                            {dialog === 'approve'
                                ? 'Confirm that these images passed your quality check.'
                                : 'These images become available to editors again. Previous work stays in the history.'}
                        </DialogDescription>
                    </DialogHeader>
                    {dialog === 'revision' && (
                        <div className="space-y-2">
                            <Label htmlFor="revision-note">
                                What needs fixing?
                            </Label>
                            <Textarea
                                id="revision-note"
                                maxLength={2000}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Give clear instructions to the editor…"
                            />
                        </div>
                    )}
                    {error && (
                        <Alert variant="destructive">
                            <AlertTitle>Review was not saved</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            disabled={busy}
                            onClick={() => setDialog(null)}
                        >
                            Go back
                        </Button>
                        <Button
                            disabled={
                                busy ||
                                (dialog === 'revision'
                                    ? !note.trim() || !canRevise
                                    : !canApprove)
                            }
                            onClick={confirm}
                        >
                            {busy
                                ? 'Saving…'
                                : dialog === 'approve'
                                  ? 'Confirm approval'
                                  : 'Send for revision'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog
                open={!!imageHistory}
                onOpenChange={(open) => {
                    if (!open) setImageHistory(null);
                }}
            >
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="break-all">
                            {imageHistory}
                        </DialogTitle>
                        <DialogDescription>
                            Ownership and work recorded for this image.
                        </DialogDescription>
                    </DialogHeader>
                    {imageHistory && (
                        <ScrollBox maxHeight="65vh">
                            <ProductionActivity
                                key={imageHistory}
                                orderId={orderId}
                                initialImageName={imageHistory}
                            />
                        </ScrollBox>
                    )}
                </DialogContent>
            </Dialog>
            <OrderWorkflowDrawer
                open={legacy}
                onOpenChange={setLegacy}
                orderId={orderId}
            />
        </div>
    );
}
