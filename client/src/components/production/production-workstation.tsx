'use client';
import { ScrollBox } from '@/components/shared/scroll-box';
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
    'Something went wrong while saving. Refresh the page and try again. If it keeps happening, tell your Team Leader.';
const orderOf = (session: IProductionWorkSession) =>
    typeof session.orderId === 'object' ? session.orderId : null;
type WorkDialog = {
    stage: 'confirm' | 'details';
    type: 'release' | 'submit';
    origin: 'release' | 'submit';
    session: IProductionWorkSession;
};
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
    const [dialog, setDialog] = useState<WorkDialog | null>(null);
    const [steps, setSteps] = useState<string[]>([]);
    const [note, setNote] = useState('');
    const [releaseAll, setReleaseAll] = useState(true);
    const [releaseNames, setReleaseNames] = useState<string[]>([]);
    const [releaseError, setReleaseError] = useState('');
    const [skippedNames, setSkippedNames] = useState<string[]>([]);
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
    const blockedStems = new Set(images
        .filter((image) => image.currentSessionId || ['pending_qc', 'completed'].includes(image.status))
        .map((image) => image.imageName.replace(/\.[^.]+$/, '')));
    const available = images.filter(
        (image) =>
            !image.currentSessionId &&
            !blockedStems.has(image.imageName.replace(/\.[^.]+$/, '')) &&
            ['unassigned', 'partially_completed', 'in_revision'].includes(
                image.status,
            ),
    );
    const visibleAvailable = available.filter((image) =>
        image.imageName.toLowerCase().includes(search.toLowerCase()),
    );
    const registered = new Set(images.map((image) => image.imageName));
    const byStem = new Map<string, string[]>();
    for (const image of images) {
        const stem = image.imageName.replace(/\.[^.]+$/, '');
        if (!byStem.has(stem)) byStem.set(stem, []);
        byStem.get(stem)!.push(image.imageName);
    }
    const imageByName = new Map(
        images.map((image) => [image.imageName, image]),
    );
    const ambiguousNames = staged.filter(
        (name) => !registered.has(name) &&
            (byStem.get(name.replace(/\.[^.]+$/, ''))?.length || 0) > 1,
    );
    const duplicateNames = staged.filter((name, index) =>
        staged.findIndex((other) => other.replace(/\.[^.]+$/, '') === name.replace(/\.[^.]+$/, '')) !== index,
    );
    const newCount = new Set(staged.filter((name) => !registered.has(name) && !ambiguousNames.includes(name))
        .map((name) => name.replace(/\.[^.]+$/, ''))).size;
    const capacity = Math.max(
        0,
        (order?.imageQuantity || 0) - (summary?.totalRegistered || 0),
    );
    const invalidNames = staged.filter((name) => {
        const image = imageByName.get(name);
        return (
            image &&
            (image.currentSessionId || blockedStems.has(name.replace(/\.[^.]+$/, '')) ||
                !['unassigned', 'partially_completed', 'in_revision'].includes(
                    image.status,
                ))
        );
    }).concat(ambiguousNames, duplicateNames).filter((name, index, all) => all.indexOf(name) === index);
    const heldNames = new Set(held.flatMap((session) => session.imageNames));
    const blockedImages = invalidNames.map((name) => {
        const image = imageByName.get(name);
        if (duplicateNames.includes(name)) return {
            name,
            reason: 'duplicates another selected image with a different extension',
            hint: 'Keep just one filename for this image.',
        };
        if (!image) return {
            name,
            reason: 'matches multiple registered filenames',
            hint: 'Select the exact image from the available list.',
        };
        if (['unassigned', 'partially_completed', 'in_revision'].includes(image.status) &&
            blockedStems.has(name.replace(/\.[^.]+$/, '')))
            return {
                name,
                reason: 'has another copy already locked or submitted',
                hint: 'Ask your Team Leader to review its work history.',
            };
        const owner =
            image.currentAssignedStaffId?.userId?.name ||
            image.currentAssignedStaffId?.staffId;
        if (heldNames.has(name))
            return {
                name,
                reason: 'is on your held work',
                hint: 'Resume your held work to continue it.',
            };
        if (image.currentSessionId)
            return {
                name,
                reason: owner
                    ? `is being edited by ${owner}`
                    : 'is being edited by another editor',
                hint: owner
                    ? `Ask ${owner} to release it, or request your Team Leader to reassign it.`
                    : 'Ask that editor to release it, or request your Team Leader to reassign it.',
            };
        if (image.status === 'pending_qc')
            return {
                name,
                reason: 'was already submitted and is waiting for review',
                hint: 'Remove it from your selection.',
            };
        if (image.status === 'completed')
            return {
                name,
                reason: 'was already approved',
                hint: 'Remove it from your selection. A Team Leader can send it back for revision if needed.',
            };
        return {
            name,
            reason: 'cannot be taken right now',
            hint: 'Remove it from your selection or refresh the list.',
        };
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
    const addNames = (names: string[]) => {
        let matched = 0;
        const resolved = names.map((raw) => {
            const name = raw.trim();
            if (registered.has(name)) return name;
            const matches = byStem.get(name.replace(/\.[^.]+$/, '')) || [];
            if (matches.length === 1) {
                matched++;
                return matches[0];
            }
            return name;
        });
        const rejected = resolved.filter((name) => {
            const image = imageByName.get(name);
            return image && (image.currentSessionId ||
                blockedStems.has(name.replace(/\.[^.]+$/, '')) ||
                !['unassigned', 'partially_completed', 'in_revision'].includes(image.status));
        });
        setSkippedNames(rejected);
        setStaged((previous) => [
            ...new Set([
                ...previous.filter((name) => !invalidNames.includes(name)),
                ...resolved.filter((name) => name && !rejected.includes(name)),
            ]),
        ]);
        if (rejected.length) toast.error(`${rejected.length} image${rejected.length === 1 ? ' is' : 's are'} already locked or submitted. Ask your Team Leader for revision if needed.`);
        if (matched && !rejected.length) toast.info(`${matched} filename${matched === 1 ? '' : 's'} matched registered images; their existing records will be used.`);
    };
    const dropzone = useDropzone({
        disabled: !order || !!running || busy || !summary || imagesQuery.isError,
        onDrop: (files) => addNames(files.map((f) => f.name)),
    });
    const releaseDropzone = useDropzone({
        disabled: dialog?.stage !== 'details' || dialog.type !== 'release' || releaseAll || busy,
        onDrop: (files) => {
            if (!dialog) return;
            const names = dialog.session.imageNames;
            const selected: string[] = [];
            const invalid: string[] = [];
            for (const file of files) {
                const name = file.name.trim();
                const matches = names.includes(name) ? [name] : names.filter(
                    (candidate) => candidate.replace(/\.[^.]+$/, '') === name.replace(/\.[^.]+$/, ''),
                );
                if (matches.length === 1) selected.push(matches[0]);
                else invalid.push(name);
            }
            setReleaseNames((previous) => [...new Set([...previous, ...selected])]);
            setReleaseError(invalid.length ? `${invalid.length} filename(s) did not match one exact image in this batch. Check the names and try again.` : '');
        },
    });
    const changeOrder = (next: ISanitizedProductionOrder | null) => {
        setOrder(next);
        setStaged([]);
        setSkippedNames([]);
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
        setDialog({ stage: 'confirm', type, origin: type, session });
        setSteps([]);
        setNote('');
        setInlineError('');
        setReleaseAll(true);
        setReleaseNames([]);
        setReleaseError('');
    };
    const chooseDialog = (all: boolean) => {
        if (!dialog || dialog.stage !== 'confirm') return;
        setReleaseAll(all);
        setReleaseNames([]);
        setReleaseError('');
        setSteps([]);
        setNote('');
        setInlineError('');
        setDialog({ ...dialog, stage: 'details', type: all ? dialog.type : 'release' });
    };
    const submitDialog = async () => {
        if (!dialog || dialog.stage !== 'details') return;
        const ok = await run(
            () =>
                dialog.type === 'release'
                    ? release({
                          sessionId: dialog.session._id,
                          reason: note || undefined,
                          imageNames: releaseAll ? undefined : releaseNames,
                      }).unwrap()
                    : finish({
                          sessionId: dialog.session._id,
                          completedSteps: steps,
                          notes: note || undefined,
                      }).unwrap(),
            dialog.type === 'release'
                ? releaseAll
                    ? 'All images released. Anyone can take them now.'
                    : `${releaseNames.length} image(s) released. ${dialog.session.imageCount - releaseNames.length} remain assigned to you.`
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
                <AlertTitle>We could not load your current work</AlertTitle>
                <AlertDescription>
                    This is usually a connection problem. Check your internet,
                    then try again before taking images.
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
                    <AlertTitle>That did not work</AlertTitle>
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
                                <ScrollBox maxHeight="10rem" className="mt-3">
                                    <p className="break-all text-muted-foreground">
                                        {running.imageNames.join(', ')}
                                    </p>
                                </ScrollBox>
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
                                            We could not load the images for this order. Tap to try again
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
                                            <ScrollBox maxHeight="16rem" className="rounded-lg border">
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
                                            </ScrollBox>
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
                                            {!!skippedNames.length && (
                                                <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                                                    <p className="font-medium text-destructive">{skippedNames.length} file(s) were not added because they are locked or already submitted.</p>
                                                    <p className="mt-1 break-all text-xs text-muted-foreground">{skippedNames.slice(0, 5).join(', ')}{skippedNames.length > 5 ? `, and ${skippedNames.length - 5} more` : ''}</p>
                                                    <p className="mt-1 text-xs text-muted-foreground">Submitted images need a QC revision before anyone can take them again.</p>
                                                </div>
                                            )}
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
                                        {staged.filter((name) => registered.has(name)).length} already
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
                                    <ScrollBox maxHeight="16rem" className="rounded-md"><div className="space-y-1">
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
                                    </div></ScrollBox>
                                    {newCount > capacity && (
                                        <p
                                            role="alert"
                                            className="text-sm text-destructive"
                                        >
                                            This order only has room for{' '}
                                            {capacity} more new image
                                            {capacity === 1 ? '' : 's'} (
                                            {order.imageQuantity} ordered,{' '}
                                            {summary?.totalRegistered ?? 0}{' '}
                                            already registered). Remove{' '}
                                            {newCount - capacity} new filename
                                            {newCount - capacity === 1
                                                ? ''
                                                : 's'}{' '}
                                            to continue, or ask your Team
                                            Leader to increase the order
                                            quantity.
                                        </p>
                                    )}
                                    {!!blockedImages.length && (
                                        <div
                                            role="alert"
                                            className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm"
                                        >
                                            <p className="font-medium text-destructive">
                                                {blockedImages.length === 1
                                                    ? '1 selected image cannot be taken'
                                                    : `${blockedImages.length} selected images cannot be taken`}
                                            </p>
                                            <ul className="space-y-2">
                                                {blockedImages
                                                    .slice(0, 5)
                                                    .map((item) => (
                                                        <li key={item.name}>
                                                            <span className="break-all font-medium">
                                                                {item.name}
                                                            </span>{' '}
                                                            <span className="text-muted-foreground">
                                                                {item.reason}.
                                                            </span>
                                                            <span className="block text-xs text-muted-foreground">
                                                                {item.hint}
                                                            </span>
                                                        </li>
                                                    ))}
                                            </ul>
                                            {blockedImages.length > 5 && (
                                                <p className="text-xs text-muted-foreground">
                                                    and{' '}
                                                    {blockedImages.length - 5}{' '}
                                                    more.
                                                </p>
                                            )}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={busy}
                                                onClick={() =>
                                                    setStaged((previous) =>
                                                        previous.filter(
                                                            (name) =>
                                                                !invalidNames.includes(
                                                                    name,
                                                                ),
                                                        ),
                                                    )
                                                }
                                            >
                                                Remove{' '}
                                                {blockedImages.length === 1
                                                    ? 'this image'
                                                    : 'these images'}{' '}
                                                from my selection
                                            </Button>
                                        </div>
                                    )}
                                    <Button
                                        className="w-full"
                                        size="lg"
                                        disabled={
                                            busy ||
                                            !staged.length ||
                                            blocked ||
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
                                            if (ok) {
                                                setStaged([]);
                                                setSkippedNames([]);
                                            }
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
                    We could not load your held work. Tap to try again
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
                open={dialog?.stage === 'confirm'}
                onOpenChange={(open) => {
                    if (!open && dialog?.stage === 'confirm') setDialog(null);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {dialog?.type === 'release'
                                ? `Release all ${dialog.session.imageCount} images?`
                                : `Submit all ${dialog?.session.imageCount || 0} images?`}
                        </DialogTitle>
                        <DialogDescription>
                            {dialog?.type === 'release'
                                ? 'You can release the whole batch or choose specific images. Saved steps stay recorded.'
                                : 'If some images are unfinished, release those images before submitting the rest.'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => chooseDialog(false)}>
                            {dialog?.type === 'release' ? 'No, choose images' : 'No, release some images'}
                        </Button>
                        <Button onClick={() => chooseDialog(true)}>
                            {dialog?.type === 'release' ? 'Yes, release all' : 'Yes, submit all'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog
                open={dialog?.stage === 'details'}
                onOpenChange={(open) => {
                    if (!open && dialog?.stage === 'details' && !busy) setDialog(null);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {dialog?.type === 'release'
                                ? releaseAll ? 'Release all images' : 'Choose images to release'
                                : 'Which steps did you finish?'}
                        </DialogTitle>
                        <DialogDescription>
                            {dialog?.type === 'release'
                                ? releaseAll
                                    ? `All ${dialog.session.imageCount} images will be available to other editors. Saved steps stay recorded.`
                                    : 'Drop or choose the files to release. The rest stay assigned to you.'
                                : `Select the steps completed on all ${dialog?.session.imageCount || 0} images in this batch.`}
                        </DialogDescription>
                    </DialogHeader>
                    {dialog?.type === 'release' && !releaseAll && (
                        <div className="space-y-3">
                            <div {...releaseDropzone.getRootProps()} className="cursor-pointer rounded-lg border-2 border-dashed p-5 text-center text-sm hover:bg-muted/40">
                                <input {...releaseDropzone.getInputProps()} />
                                <UploadCloud className="mx-auto mb-2 size-5" />
                                Drop files to release, or click to choose
                            </div>
                            <p className="text-xs text-muted-foreground">{releaseNames.length} of {dialog.session.imageCount} selected for release. The rest remain assigned to you.</p>
                            {!!releaseNames.length && <ScrollBox maxHeight="10rem" className="rounded-md border p-2"><div className="space-y-1">
                                {releaseNames.map((name) => <div key={name} className="flex items-center gap-2 text-xs">
                                    <span className="min-w-0 flex-1 truncate" title={name}>{name}</span>
                                    <Button variant="ghost" size="icon" className="size-6" aria-label={`Keep ${name}`} onClick={() => setReleaseNames((previous) => previous.filter((item) => item !== name))}><X className="size-3" /></Button>
                                </div>)}
                            </div></ScrollBox>}
                            {releaseError && <p role="alert" className="text-sm text-destructive">{releaseError}</p>}
                        </div>
                    )}
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
                            onClick={() => {
                                if (dialog) setDialog({ ...dialog, stage: 'confirm', type: dialog.origin });
                            }}
                        >
                            Go back
                        </Button>
                        <Button
                            disabled={
                                busy ||
                                (dialog?.type === 'submit' && !steps.length) ||
                                (dialog?.type === 'release' && !releaseAll && !releaseNames.length)
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
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Order activity</DialogTitle>
                        <DialogDescription>
                            The work trail for this order, in Bangladesh time.
                        </DialogDescription>
                    </DialogHeader>
                    {history && (
                        <ScrollBox maxHeight="65vh">
                            <ProductionActivity key={history} orderId={history} />
                        </ScrollBox>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
