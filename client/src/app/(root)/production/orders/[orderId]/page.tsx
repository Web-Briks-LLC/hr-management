'use client';
import { ScrollBox } from '@/components/shared/scroll-box';
import { TablePagination } from '@/components/shared/table-pagination';
import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
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
import { Card, CardContent } from '@/components/ui/card';
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
import { ArrowLeft, CheckCircle2, RotateCcw, History } from 'lucide-react';
const labels: Record<string, string> = {
    unassigned: 'Available',
    in_progress: 'Reserved / editing',
    partially_completed: 'Available · partly done',
    pending_qc: 'Awaiting review',
    completed: 'Approved',
    in_revision: 'Revision · available',
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
                    'Could not save review. Refresh and try again.',
            );
        }
    };
    if (query.isLoading || access.isLoading)
        return <Skeleton className="h-96" />;
    if (query.isError || !order)
        return (
            <Button variant="outline" onClick={() => query.refetch()}>
                Could not load this order. Retry
            </Button>
        );
    return (
        <div className="mx-auto w-full min-w-0 max-w-7xl space-y-6 pb-10">
            <Button asChild variant="ghost" className="-ml-3">
                <Link href="/production?tab=images">
                    <ArrowLeft className="size-4" />
                    All production orders
                </Link>
            </Button>
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-sm text-muted-foreground">
                        {order.clientId?.clientId || 'Production order'}
                    </p>
                    <h1 className="mt-1 text-2xl font-semibold">
                        {order.orderName}
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {order.imageQuantity} images ordered · {images.length}{' '}
                        registered
                    </p>
                </div>
                <Button variant="outline" onClick={() => setLegacy(true)}>
                    <History className="size-4" /> Earlier records
                </Button>
            </header>
            {order.instruction && (
                <Card>
                    <CardContent className="p-4 text-sm whitespace-pre-wrap">
                        <strong>Order instructions: </strong>
                        {order.instruction}
                    </CardContent>
                </Card>
            )}
            <Tabs defaultValue="images">
                <TabsList>
                    <TabsTrigger value="images">Images & review</TabsTrigger>
                    <TabsTrigger value="history">Work history</TabsTrigger>
                </TabsList>
                <TabsContent value="images" className="mt-5 space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Input
                            aria-label="Search image names"
                            placeholder="Search image names…"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                                setSelected([]);
                            }}
                        />
                        <Select
                            value={status}
                            onValueChange={(s) => {
                                setStatus(s);
                                setPage(1);
                                setSelected([]);
                            }}
                        >
                            <SelectTrigger className="sm:w-64">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All images</SelectItem>
                                {Object.entries(labels).map(
                                    ([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                            {label}
                                        </SelectItem>
                                    ),
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    {access.canDoQC && (
                        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-3">
                            <span className="text-sm font-medium">
                                {selected.length} selected
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!reviewable.length}
                                onClick={() =>
                                    setSelected(
                                        reviewable.map((i) => i.imageName),
                                    )
                                }
                            >
                                Select reviewable on this page
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
                            {!!selected.length && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setSelected([])}
                                >
                                    Clear
                                </Button>
                            )}
                        </div>
                    )}
                    <div className="rounded-md border border-border/60 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {access.canDoQC && (
                                        <TableHead className="w-10" />
                                    )}
                                    <TableHead>Image</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Currently with</TableHead>
                                    <TableHead>Saved steps</TableHead>
                                    <TableHead />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {shown.map((image) => (
                                    <TableRow key={image._id}>
                                        {access.canDoQC && (
                                            <TableCell>
                                                <Checkbox
                                                    aria-label={`Select ${image.imageName}`}
                                                    disabled={
                                                        !!image.currentSessionId ||
                                                        ![
                                                            'pending_qc',
                                                            'completed',
                                                        ].includes(image.status)
                                                    }
                                                    checked={selected.includes(
                                                        image.imageName,
                                                    )}
                                                    onCheckedChange={(
                                                        checked,
                                                    ) =>
                                                        setSelected((prev) =>
                                                            checked
                                                                ? [
                                                                      ...prev,
                                                                      image.imageName,
                                                                  ]
                                                                : prev.filter(
                                                                      (n) =>
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
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {
                                                        image.revisionHistory.at(
                                                            -1,
                                                        )?.instruction
                                                    }
                                                </p>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    image.status === 'completed'
                                                        ? 'default'
                                                        : 'secondary'
                                                }
                                            >
                                                {labels[image.status]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {image.currentAssignedStaffId
                                                ?.userId?.name ||
                                                image.currentAssignedStaffId
                                                    ?.staffId ||
                                                '—'}
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm">
                                                {image.completedSteps.length} /{' '}
                                                {image.requiredSteps.length}
                                            </span>
                                            {!!image.completedSteps.length && (
                                                <details className="text-xs text-muted-foreground">
                                                    <summary className="cursor-pointer">
                                                        Details
                                                    </summary>
                                                    {image.completedSteps.map(
                                                        (step) => (
                                                            <p
                                                                key={
                                                                    step.stepName
                                                                }
                                                            >
                                                                {step.stepName}{' '}
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
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    setImageHistory(
                                                        image.imageName,
                                                    )
                                                }
                                            >
                                                History
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!shown.length && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="h-32 text-center text-muted-foreground"
                                        >
                                            No images match. New images appear
                                            here after an editor takes work.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
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
                        <p role="alert" className="text-sm text-destructive">
                            {error}
                        </p>
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
