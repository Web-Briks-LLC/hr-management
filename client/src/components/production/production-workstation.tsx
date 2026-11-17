'use client';
import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
    Play,
    Pause,
    UploadCloud,
    ArrowRight,
    CheckCircle2,
    LockKeyhole,
    X,
    History,
    FileImage,
} from 'lucide-react';
import { OrderPicker } from './order-picker';
import { ProductionActivity } from './production-activity';
import { useProductionAccess } from '@/hooks/use-production-access';
import { useSocket } from '@/contexts/SocketContext';
import {
    resolveOrderSteps,
    type ISanitizedProductionOrder,
    type IProductionWorkSession,
} from '@/types/production.type';
import {
    useGetActiveSessionQuery,
    useGetHeldWorkSessionsQuery,
    useGetOrderImagesQuery,
    useStartWorkSessionMutation,
    usePauseWorkSessionMutation,
    useResumeWorkSessionMutation,
    useFinishWorkSessionMutation,
    useCancelWorkSessionMutation,
} from '@/redux/features/production/productionApi';

const errorMessage = (error: unknown) =>
    (error as { data?: { message?: string } })?.data?.message ||
    'Could not save. Please refresh and try again.';
const orderOf = (session: IProductionWorkSession) =>
    typeof session.orderId === 'object' ? session.orderId : null;
function WorkClock({ session }: { session: IProductionWorkSession }) {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);
    const end =
        session.status === 'paused' && session.pausedAt
            ? new Date(session.pausedAt).getTime()
            : now;
    const seconds = Math.max(
        0,
        Math.floor((end - new Date(session.startTime).getTime()) / 1000) -
            (session.totalPausedSeconds || 0),
    );
    return (
        <span className="font-mono text-3xl font-semibold tabular-nums">
            {[
                Math.floor(seconds / 3600),
                Math.floor(seconds / 60) % 60,
                seconds % 60,
            ]
                .map((n) => String(n).padStart(2, '0'))
                .join(':')}
        </span>
    );
}

export function ProductionWorkstation() {
    const { socket } = useSocket();
    const access = useProductionAccess();
    const activeQuery = useGetActiveSessionQuery(undefined, {
        pollingInterval: 15000,
    });
    const heldQuery = useGetHeldWorkSessionsQuery(undefined, {
        pollingInterval: 15000,
    });
    const active = activeQuery.data?.data;
    const running = active?.status === 'active' ? active : null;
    const held = heldQuery.data?.data || [];
    const [order, setOrder] = useState<ISanitizedProductionOrder | null>(null);
    const [status, setStatus] = useState('all');
    const [staged, setStaged] = useState<string[]>([]);
    const [search, setSearch] = useState('');
    const [visibleCount, setVisibleCount] = useState(100);
    const [stagedSearch, setStagedSearch] = useState('');
    const [history, setHistory] = useState<string | null>(null);
    const [dialog, setDialog] = useState<{
        type: 'release' | 'submit';
        session: IProductionWorkSession;
    } | null>(null);
    const [steps, setSteps] = useState<string[]>([]);
    const [note, setNote] = useState('');
    const [inlineError, setInlineError] = useState('');
    const [start, startState] = useStartWorkSessionMutation();
    const [pause, pauseState] = usePauseWorkSessionMutation();
    const [resume, resumeState] = useResumeWorkSessionMutation();
    const [finish, finishState] = useFinishWorkSessionMutation();
    const [release, releaseState] = useCancelWorkSessionMutation();
    const busy = [
        startState,
        pauseState,
        resumeState,
        finishState,
        releaseState,
    ].some((s) => s.isLoading);
    const selectedId = running ? orderOf(running)?._id : order?._id;
    const imagesQuery = useGetOrderImagesQuery(
        { orderId: selectedId || '' },
        { skip: !selectedId, pollingInterval: 15000 },
    );
    const images = imagesQuery.currentData?.data?.images || [];
    const summary = imagesQuery.currentData?.data?.summary;
    const available = images.filter(
        (image) =>
            !image.currentSessionId &&
            ['unassigned', 'partially_completed', 'in_revision'].includes(
                image.status,
            ),
    );
    const visibleAvailable = available.filter((image) =>
        image.imageName.toLowerCase().includes(search.toLowerCase()),
    );
    const registered = new Set(images.map((image) => image.imageName));
    const imageByName = new Map(
        images.map((image) => [image.imageName, image]),
    );
    const newCount = staged.filter((name) => !registered.has(name)).length;
    const capacity = Math.max(
        0,
        (order?.imageQuantity || 0) - (summary?.totalRegistered || 0),
    );
    const invalidNames = staged.filter((name) => {
        const image = imageByName.get(name);
        return (
            image &&
            (image.currentSessionId ||
                !['unassigned', 'partially_completed', 'in_revision'].includes(
                    image.status,
                ))
        );
    });
    const blocked = newCount > capacity || invalidNames.length > 0;
    useEffect(() => {
        if (!socket) return;
        const update = () => {
            activeQuery.refetch();
            heldQuery.refetch();
            if (selectedId) imagesQuery.refetch();
        };
        const events = [
            'production:images_updated',
            'production:images_locked',
            'production:session_started',
            'production:session_finished',
            'production:session_cancelled',
            'production:session_paused',
            'production:session_resumed',
            'production:session_reassigned',
        ];
        events.forEach((e) => socket.on(e, update));
        return () => {
            events.forEach((e) => socket.off(e, update));
        };
    }, [
        socket,
        selectedId,
        activeQuery.refetch,
        heldQuery.refetch,
        imagesQuery.refetch,
    ]);
    const addNames = (names: string[]) =>
        setStaged((previous) => [
            ...new Set([
                ...previous,
                ...names.map((n) => n.trim()).filter(Boolean),
            ]),
        ]);
    const dropzone = useDropzone({
        disabled: !order || !!running || busy || imagesQuery.isFetching,
        onDrop: (files) => addNames(files.map((f) => f.name)),
    });
    const changeOrder = (next: ISanitizedProductionOrder | null) => {
        setOrder(next);
        setStaged([]);
        setSearch('');
        setVisibleCount(100);
        setStagedSearch('');
        setInlineError('');
    };
    const run = async (operation: () => Promise<unknown>, success: string) => {
        setInlineError('');
        try {
            await operation();
            toast.success(success);
            return true;
        } catch (error) {
            const message = errorMessage(error);
            setInlineError(message);
            toast.error(message);
            return false;
        }
    };
    const openDialog = (
        type: 'release' | 'submit',
        session: IProductionWorkSession,
    ) => {
        setDialog({ type, session });
        setSteps([]);
        setNote('');
        setInlineError('');
    };
    const submitDialog = async () => {
        if (!dialog) return;
        const ok = await run(
            () =>
                dialog.type === 'release'
                    ? release({
                          sessionId: dialog.session._id,
                          reason: note || undefined,
                      }).unwrap()
                    : finish({
                          sessionId: dialog.session._id,
                          completedSteps: steps,
                          notes: note || undefined,
                      }).unwrap(),
            dialog.type === 'release'
                ? 'Images released. Anyone can take them now.'
                : 'Work saved. Completed images go to quality check; remaining work is available.',
        );
        if (ok) setDialog(null);
    };
    if (!access.isLoading && !access.staff)
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Your supervisor workspace is ready</CardTitle>
                    <CardDescription>
                        Use Orders & quality check to review work, or Team
                        activity to hand over and release images. Taking images
                        yourself requires a linked staff profile.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    if (activeQuery.isLoading) return <Skeleton className="h-72 w-full" />;
    if (activeQuery.isError)
        return (
            <Alert variant="destructive">
                <AlertTitle>We could not check your current work</AlertTitle>
                <AlertDescription>
                    Check again before taking images.
                    <Button
                        className="mt-3"
                        variant="outline"
                        onClick={() => activeQuery.refetch()}
                    >
                        Try again
                    </Button>
                </AlertDescription>
            </Alert>
        );
    return (
        <div className="space-y-6">
            {inlineError && !dialog && (
                <Alert variant="destructive">
                    <AlertTitle>Action could not be completed</AlertTitle>
                    <AlertDescription>{inlineError}</AlertDescription>
                </Alert>
            )}
            {running ? (
                <Card className="border-primary/30">
                    <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <Badge className="mb-3">Working now</Badge>
                                <CardTitle className="text-xl">
                                    {orderOf(running)?.orderName}
                                </CardTitle>
                                <CardDescription className="mt-1">
                                    {running.imageCount} images are reserved for
                                    you.
                                </CardDescription>
                            </div>
                            <WorkClock session={running} />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {orderOf(running)?.instruction && (
                            <div className="rounded-lg bg-muted p-4 text-sm whitespace-pre-wrap">
                                <strong className="block mb-1">
                                    Order instructions
                                </strong>
                                {orderOf(running)?.instruction}
                            </div>
                        )}
                        <div className="grid gap-3 md:grid-cols-3">
                            <div className="rounded-lg border p-4">
                                <Button
                                    className="w-full"
                                    disabled={busy}
                                    onClick={() =>
                                        openDialog('submit', running)
                                    }
                                >
                                    <CheckCircle2 className="size-4" /> Submit
                                    work
                                </Button>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Choose the steps you completed.
                                </p>
                            </div>
                            <div className="rounded-lg border p-4">
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    disabled={busy}
                                    onClick={() =>
                                        run(
                                            () =>
                                                pause({
                                                    sessionId: running._id,
                                                }).unwrap(),
                                            'Timer paused. These images stay with you.',
                                        )
                                    }
                                >
                                    <Pause className="size-4" /> Hold for me
                                </Button>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Pause the timer. Keep your images.
                                </p>
                            </div>
                            <div className="rounded-lg border p-4">
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    disabled={busy}
                                    onClick={() =>
                                        openDialog('release', running)
                                    }
                                >
                                    <ArrowRight className="size-4" /> Release
                                    for others
                                </Button>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Stop working. Let someone else take over.
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <details className="flex-1 text-sm">
                                <summary className="cursor-pointer">
                                    View my {running.imageCount} image names
                                </summary>
                                <p className="mt-3 max-h-40 overflow-auto break-all text-muted-foreground">
                                    {running.imageNames.join(', ')}
                                </p>
                            </details>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setHistory(selectedId || null)}
                            >
                                <History className="size-4" /> Order history
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="grid gap-2 sm:grid-cols-3">
                        {[
                            'Choose an order',
                            'Choose your images',
                            'Start working',
                        ].map((label, i) => (
                            <div
                                key={label}
                                className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3 text-sm"
                            >
                                <span className="flex size-6 items-center justify-center rounded-full bg-background font-semibold border">
                                    {i + 1}
                                </span>
                                {label}
                            </div>
                        ))}
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle>What will you work on?</CardTitle>
                            <CardDescription>
                                Find the client or order, then take available
                                images or add filenames.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <OrderPicker
                                value={order}
                                onChange={changeOrder}
                                status={status}
                                onStatusChange={(next) => {
                                    setStatus(next);
                                    changeOrder(null);
                                }}
                                disabled={busy}
                            />
                            {order && (
                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/50 p-4">
                                    <div className="space-y-1">
                                        <p className="font-medium">
                                            {order.clientId?.clientId} ·{' '}
                                            {order.orderName}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {order.imageQuantity} ordered ·{' '}
                                            {summary?.totalRegistered ?? '…'}{' '}
                                            registered · {available.length}{' '}
                                            available to take
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setHistory(order._id)}
                                    >
                                        <History className="size-4" /> History
                                    </Button>
                                </div>
                            )}
                            {order?.instruction && (
                                <p className="text-sm whitespace-pre-wrap">
                                    <strong>Instructions: </strong>
                                    {order.instruction}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                    {order && (
                        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">
                                        Choose images
                                    </CardTitle>
                                    <CardDescription>
                                        Released and unfinished images can be
                                        taken again without using extra order
                                        slots.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {imagesQuery.isError ? (
                                        <Button
                                            variant="outline"
                                            onClick={() =>
                                                imagesQuery.refetch()
                                            }
                                        >
                                            Could not load images. Retry
                                        </Button>
                                    ) : imagesQuery.isLoading ? (
                                        <Skeleton className="h-40" />
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    aria-label="Search available images"
                                                    placeholder="Search available image names…"
                                                    value={search}
                                                    onChange={(e) =>
                                                        setSearch(
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                                <Button
                                                    variant="outline"
                                                    disabled={
                                                        !visibleAvailable.length ||
                                                        busy
                                                    }
                                                    onClick={() =>
                                                        addNames(
                                                            visibleAvailable.map(
                                                                (i) =>
                                                                    i.imageName,
                                                            ),
                                                        )
                                                    }
                                                >
                                                    Select all matching
                                                </Button>
                                            </div>
                                            <div className="max-h-64 overflow-y-auto rounded-lg border">
                                                {visibleAvailable.length ? (
                                                    visibleAvailable
                                                        .slice(0, visibleCount)
                                                        .map((image) => (
                                                            <label
                                                                key={image._id}
                                                                className="flex cursor-pointer items-center gap-3 border-b last:border-0 px-4 py-3 hover:bg-muted/40"
                                                            >
                                                                <Checkbox
                                                                    checked={staged.includes(
                                                                        image.imageName,
                                                                    )}
                                                                    disabled={
                                                                        busy
                                                                    }
                                                                    onCheckedChange={(
                                                                        checked,
                                                                    ) =>
                                                                        checked
                                                                            ? addNames(
                                                                                  [
                                                                                      image.imageName,
                                                                                  ],
                                                                              )
                                                                            : setStaged(
                                                                                  (
                                                                                      prev,
                                                                                  ) =>
                                                                                      prev.filter(
                                                                                          (
                                                                                              n,
                                                                                          ) =>
                                                                                              n !==
                                                                                              image.imageName,
                                                                                      ),
                                                                              )
                                                                    }
                                                                />
                                                                <span className="min-w-0 flex-1">
                                                                    <span className="block truncate text-sm font-medium">
                                                                        {
                                                                            image.imageName
                                                                        }
                                                                    </span>
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {image.isRevision
                                                                            ? 'Revision requested'
                                                                            : image
                                                                                    .completedSteps
                                                                                    .length
                                                                              ? `${image.completedSteps.length} steps already done`
                                                                              : 'Ready to take'}
                                                                    </span>
                                                                </span>
                                                                <Badge variant="secondary">
                                                                    Available
                                                                </Badge>
                                                            </label>
                                                        ))
                                                ) : (
                                                    <p className="p-6 text-sm text-muted-foreground">
                                                        {search
                                                            ? 'No matching available images.'
                                                            : 'No released images yet. Add filenames below to begin new work.'}
                                                    </p>
                                                )}
                                            </div>
                                            {visibleAvailable.length >
                                                visibleCount && (
                                                <Button
                                                    variant="ghost"
                                                    onClick={() =>
                                                        setVisibleCount(
                                                            (n) => n + 100,
                                                        )
                                                    }
                                                >
                                                    Show more images (
                                                    {visibleAvailable.length -
                                                        visibleCount}{' '}
                                                    remaining)
                                                </Button>
                                            )}
                                            <div
                                                {...dropzone.getRootProps()}
                                                className={`cursor-pointer rounded-lg border-2 border-dashed p-7 text-center transition-colors ${dropzone.isDragActive ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'}`}
                                            >
                                                <input
                                                    {...dropzone.getInputProps()}
                                                    aria-label="Choose image files"
                                                />
                                                <UploadCloud className="mx-auto mb-3 size-7 text-muted-foreground" />
                                                <p className="font-medium">
                                                    Drop images here or click to
                                                    choose
                                                </p>
                                                <p className="mt-1 text-sm text-muted-foreground">
                                                    Only filenames are
                                                    registered. Files stay on
                                                    your computer.
                                                </p>
                                            </div>
                                            <p className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <LockKeyhole className="size-3" />{' '}
                                                Images held by another editor
                                                cannot be taken.
                                            </p>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                            <Card className="h-fit lg:sticky lg:top-4">
                                <CardHeader>
                                    <CardTitle className="text-base">
                                        Your selection{' '}
                                        <Badge
                                            variant="secondary"
                                            className="ml-2"
                                        >
                                            {staged.length}
                                        </Badge>
                                    </CardTitle>
                                    <CardDescription>
                                        {newCount} new ·{' '}
                                        {staged.length - newCount} already
                                        registered
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {staged.length > 100 && (
                                        <>
                                            <Input
                                                aria-label="Search selected filenames"
                                                placeholder="Find a selected filename…"
                                                value={stagedSearch}
                                                onChange={(e) =>
                                                    setStagedSearch(
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Showing up to 100 names. All{' '}
                                                {staged.length} selected images
                                                will be taken.
                                            </p>
                                        </>
                                    )}
                                    <div className="max-h-64 overflow-auto space-y-1">
                                        {staged.length ? (
                                            staged
                                                .filter((name) =>
                                                    name
                                                        .toLowerCase()
                                                        .includes(
                                                            stagedSearch.toLowerCase(),
                                                        ),
                                                )
                                                .slice(0, 100)
                                                .map((name) => (
                                                    <div
                                                        key={name}
                                                        className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1"
                                                    >
                                                        <FileImage className="size-3 shrink-0" />
                                                        <span
                                                            className="truncate flex-1 text-xs"
                                                            title={name}
                                                        >
                                                            {name}
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-7"
                                                            aria-label={`Remove ${name}`}
                                                            disabled={busy}
                                                            onClick={() =>
                                                                setStaged(
                                                                    (prev) =>
                                                                        prev.filter(
                                                                            (
                                                                                n,
                                                                            ) =>
                                                                                n !==
                                                                                name,
                                                                        ),
                                                                )
                                                            }
                                                        >
                                                            <X className="size-3" />
                                                        </Button>
                                                    </div>
                                                ))
                                        ) : (
                                            <p className="py-4 text-sm text-muted-foreground">
                                                Select available images or drop
                                                your files to build a work
                                                batch.
                                            </p>
                                        )}
                                    </div>
                                    {newCount > capacity && (
                                        <p
                                            role="alert"
                                            className="text-sm text-destructive"
                                        >
                                            This order has room for {capacity}{' '}
                                            new images. Remove{' '}
                                            {newCount - capacity} new filenames
                                            to continue.
                                        </p>
                                    )}
                                    {!!invalidNames.length && (
                                        <p
                                            role="alert"
                                            className="text-sm text-destructive"
                                        >
                                            {invalidNames.length} selected
                                            images are no longer available.
                                            Remove them or refresh your
                                            selection.
                                        </p>
                                    )}
                                    <Button
                                        className="w-full"
                                        size="lg"
                                        disabled={
                                            busy ||
                                            !staged.length ||
                                            blocked ||
                                            imagesQuery.isFetching ||
                                            imagesQuery.isError ||
                                            !summary
                                        }
                                        onClick={async () => {
                                            const ok = await run(
                                                () =>
                                                    start({
                                                        orderId: order._id,
                                                        imageNames: staged,
                                                    }).unwrap(),
                                                'Images are yours. Your work timer has started.',
                                            );
                                            if (ok) setStaged([]);
                                        }}
                                    >
                                        <Play className="size-4" />
                                        {startState.isLoading
                                            ? 'Taking images…'
                                            : `Take ${staged.length || ''} images & start`}
                                    </Button>
                                    {!!staged.length && (
                                        <Button
                                            variant="ghost"
                                            className="w-full"
                                            disabled={busy}
                                            onClick={() => setStaged([])}
                                        >
                                            Clear selection
                                        </Button>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                        You can take any batch size within this
                                        order’s {order.imageQuantity}-image
                                        quantity.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </>
            )}
            {heldQuery.isError && (
                <Button variant="outline" onClick={() => heldQuery.refetch()}>
                    Could not load held work. Retry
                </Button>
            )}
            {!!held.length && (
                <section className="space-y-3">
                    <div>
                        <h3 className="font-semibold">
                            Held for you{' '}
                            <Badge variant="secondary">{held.length}</Badge>
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            These timers are paused. Resume them or release the
                            images for someone else.
                        </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                        {held.map((session) => (
                            <Card key={session._id}>
                                <CardContent className="pt-5 space-y-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-medium">
                                                {orderOf(session)?.orderName}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {session.imageCount} images ·
                                                Reserved for you
                                            </p>
                                        </div>
                                        <Badge variant="outline">On hold</Badge>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            size="sm"
                                            disabled={busy || !!running}
                                            onClick={() =>
                                                run(
                                                    () =>
                                                        resume({
                                                            sessionId:
                                                                session._id,
                                                        }).unwrap(),
                                                    'Work resumed. Timer started.',
                                                )
                                            }
                                        >
                                            <Play className="size-3" />
                                            Resume
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={busy}
                                            onClick={() =>
                                                openDialog('release', session)
                                            }
                                        >
                                            Release for others
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                setHistory(
                                                    orderOf(session)?._id ||
                                                        null,
                                                )
                                            }
                                        >
                                            History
                                        </Button>
                                    </div>
                                    {running && (
                                        <p className="text-xs text-muted-foreground">
                                            Hold or submit your current work
                                            before resuming.
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>
            )}
            <Dialog
                open={!!dialog}
                onOpenChange={(open) => {
                    if (!open && !busy) setDialog(null);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {dialog?.type === 'release'
                                ? 'Release these images?'
                                : 'Which steps did you finish?'}
                        </DialogTitle>
                        <DialogDescription>
                            {dialog?.type === 'release'
                                ? `${dialog.session.imageCount} images will become available to other editors. Previously saved steps stay recorded. Work not submitted here is not marked complete.`
                                : 'Check only the steps completed on every image in this batch. Unfinished steps become available for another editor.'}
                        </DialogDescription>
                    </DialogHeader>
                    {dialog?.type === 'submit' && (
                        <div className="space-y-3">
                            {resolveOrderSteps(
                                orderOf(dialog.session)?.requiredSteps,
                            ).map((step) => (
                                <label
                                    key={step.name}
                                    className="flex cursor-pointer items-center gap-3 rounded-lg border p-3"
                                >
                                    <Checkbox
                                        checked={steps.includes(step.name)}
                                        onCheckedChange={(checked) =>
                                            setSteps((prev) =>
                                                checked
                                                    ? [...prev, step.name]
                                                    : prev.filter(
                                                          (n) =>
                                                              n !== step.name,
                                                      ),
                                            )
                                        }
                                    />
                                    <span className="text-sm">{step.name}</span>
                                </label>
                            ))}
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="work-note">
                            {dialog?.type === 'release'
                                ? 'Handover note (optional)'
                                : 'Work note (optional)'}
                        </Label>
                        <Textarea
                            id="work-note"
                            maxLength={dialog?.type === 'release' ? 500 : 1000}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Anything the next person should know?"
                        />
                    </div>
                    {inlineError && (
                        <p role="alert" className="text-sm text-destructive">
                            {inlineError}
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
                                (dialog?.type === 'submit' && !steps.length)
                            }
                            onClick={submitDialog}
                        >
                            {busy
                                ? 'Saving…'
                                : dialog?.type === 'release'
                                  ? 'Release images'
                                  : 'Save completed steps'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog
                open={!!history}
                onOpenChange={(open) => {
                    if (!open) setHistory(null);
                }}
            >
                <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Order activity</DialogTitle>
                        <DialogDescription>
                            The work trail for this order, in Bangladesh time.
                        </DialogDescription>
                    </DialogHeader>
                    {history && (
                        <ProductionActivity key={history} orderId={history} />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
