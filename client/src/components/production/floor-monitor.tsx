"use client";
import { TablePagination } from "@/components/shared/table-pagination";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatTile } from "@/components/production/stat-tile";
import { EditorCell } from "@/components/production/editor-cell";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { AppDialog } from "@/components/shared/app-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/earnings-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  useGetLiveWorkSessionsQuery,
  useGetProductionEditorsQuery,
  useAdminCancelWorkSessionMutation,
  useAdminFinishWorkSessionMutation,
  useReassignWorkSessionMutation,
} from "@/redux/features/production/productionApi";
import { useSocket } from "@/contexts/SocketContext";
import {
  resolveOrderSteps,
  type ILiveWorkSession,
} from "@/types/production.type";
import {
  Users,
  Activity,
  Pause,
  MoreVertical,
  CheckCircle2,
  XCircle,
  UserCog,
  Clock,
  RefreshCw,
  UserX,
  Search,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
  let secs =
    Math.floor((nowTs - start) / 1000) - (session.totalPausedSeconds || 0);
  if (session.isOnHold && session.pausedAt) {
    secs -= Math.floor((nowTs - new Date(session.pausedAt).getTime()) / 1000);
  }
  return Math.max(0, secs);
}

function fmtDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s
    .toString()
    .padStart(2, "0")}`;
}

export function FloorMonitor() {
  const { socket } = useSocket();
  const nowTs = useLiveClock();

  const { data, isLoading, refetch, isFetching } = useGetLiveWorkSessionsQuery(
    undefined,
    { pollingInterval: 20000 },
  );
  const { data: editorsData } = useGetProductionEditorsQuery();

  const [adminCancel, { isLoading: isCancelling }] =
    useAdminCancelWorkSessionMutation();
  const [adminFinish, { isLoading: isFinishing }] =
    useAdminFinishWorkSessionMutation();
  const [reassign, { isLoading: isReassigning }] =
    useReassignWorkSessionMutation();

  const sessions = data?.data?.sessions || [];

  const summary = data?.data?.summary || {
    totalEditors: 0,
    workingEditors: 0,
    onHoldEditors: 0,
    idleEditors: 0,
    editorsWorking: 0,
    activeSessions: 0,
    heldSessions: 0,
    imagesInProgress: 0,
  };
  const editors = editorsData?.data || [];

  // Dialog state
  const [target, setTarget] = useState<ILiveWorkSession | null>(null);
  const [dialog, setDialog] = useState<"finish" | "reassign" | "cancel" | null>(
    null,
  );
  const [finishSteps, setFinishSteps] = useState<string[]>([]);
  const [finishNotes, setFinishNotes] = useState("");
  const [reassignTo, setReassignTo] = useState("");
  const [reassignNote, setReassignNote] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    if (!socket) return;
    const handle = () => refetch();
    const events = [
      "production:session_started",
      "production:session_finished",
      "production:session_cancelled",
      "production:session_paused",
      "production:session_resumed",
      "production:session_reassigned",
      "production:images_updated",
    ];
    events.forEach((e) => socket.on(e, handle));
    return () => events.forEach((e) => socket.off(e, handle));
  }, [socket, refetch]);

  const openFinish = (s: ILiveWorkSession) => {
    setTarget(s);
    setFinishSteps([]);
    setFinishNotes("");
    setDialog("finish");
  };
  const openReassign = (s: ILiveWorkSession) => {
    setTarget(s);
    setReassignTo("");
    setReassignNote("");
    setDialog("reassign");
  };
  const openCancel = (s: ILiveWorkSession) => {
    setTarget(s);
    setCancelReason("");
    setDialog("cancel");
  };
  const closeDialog = () => {
    setDialog(null);
    setTarget(null);
  };

  const handleFinish = async () => {
    if (!target) return;
    if (finishSteps.length === 0) {
      toast.error("Tick at least one completed step");
      return;
    }
    try {
      const res = await adminFinish({
        sessionId: target._id,
        completedSteps: finishSteps,
        notes: finishNotes || undefined,
      }).unwrap();
      toast.success(res.message || "Session force-finished");
      closeDialog();
    } catch (e: any) {
      toast.error(e?.data?.message || "Failed to finish session");
    }
  };

  const handleReassign = async () => {
    if (!target || !reassignTo) {
      toast.error("Pick an editor to reassign to");
      return;
    }
    try {
      const res = await reassign({
        sessionId: target._id,
        newStaffId: reassignTo,
        note: reassignNote || undefined,
      }).unwrap();
      toast.success(res.message || "Session reassigned");
      closeDialog();
    } catch (e: any) {
      toast.error(e?.data?.message || "Failed to reassign session");
    }
  };

  const handleCancel = async () => {
    if (!target) return;
    try {
      const res = await adminCancel({
        sessionId: target._id,
        reason: cancelReason || undefined,
      }).unwrap();
      toast.success(res.message || "Session cancelled");
      closeDialog();
    } catch (e: any) {
      toast.error(e?.data?.message || "Failed to cancel session");
    }
  };

  type ViewTab = "working" | "idle" | "all";
  const [view, setView] = useState<ViewTab>("working");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const roster = data?.data?.roster || [];
  const needle = search.trim().toLowerCase();
  const matches = (...parts: (string | undefined | null)[]) =>
    !needle || parts.some((p) => p?.toLowerCase().includes(needle));

  const workingRows = sessions.filter((s) =>
    matches(
      s.staff.name,
      s.staff.staffId,
      s.order.client?.name,
      s.order.client?.clientId,
      s.order.orderName,
    ),
  );
  const idleRows = roster.filter(
    (r) => r.state === "idle" && matches(r.name, r.employeeId),
  );
  const allRows = roster.filter((r) => matches(r.name, r.employeeId));
  const sessionById = new Map(sessions.map((x) => [x._id, x]));

  const activeTotal =
    view === "working"
      ? workingRows.length
      : view === "idle"
        ? idleRows.length
        : allRows.length;
  const safePage = Math.min(page, Math.max(1, Math.ceil(activeTotal / limit)));
  const from = (safePage - 1) * limit;
  const to = safePage * limit;

  const stateBadge = (state: "working" | "on_hold" | "idle") =>
    state === "working" ? (
      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold">
        Working
      </Badge>
    ) : state === "on_hold" ? (
      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs font-bold">
        On hold
      </Badge>
    ) : (
      <Badge variant="outline" className="text-xs font-semibold text-muted-foreground">
        Not started
      </Badge>
    );

  const stats = [
    {
      label: "Total editors",
      value: summary.totalEditors,
      hint: "Available for production",
      icon: Users,
      tone: "slate" as const,
    },
    {
      label: "Working now",
      value: summary.workingEditors,
      hint: "Have a batch in progress",
      icon: Activity,
      tone: "green" as const,
    },
    {
      label: "On hold",
      value: summary.onHoldEditors,
      hint: "Only paused batches",
      icon: Pause,
      tone: "orange" as const,
    },
    {
      label: "Not started",
      value: summary.idleEditors,
      hint: "No batch taken yet",
      icon: UserX,
      tone: "blue" as const,
    },
  ];

  const skeletonRows = (cols: number) =>
    [...Array(4)].map((_, i) => (
      <TableRow key={i}>
        <TableCell colSpan={cols}>
          <Skeleton className="h-8 w-full" />
        </TableCell>
      </TableRow>
    ));

  const emptyRow = (cols: number, title: string, text: string) => (
    <TableRow>
      <TableCell colSpan={cols} className="h-48 text-center">
        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <div className="rounded-full bg-muted/50 p-3">
            <Clock className="h-6 w-6 opacity-30" />
          </div>
          <p className="text-lg font-medium">{title}</p>
          <p className="text-sm">{text}</p>
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <StatTile key={s.label} {...s} isLoading={isLoading} />
        ))}
      </div>

      <Card className="border-border/60 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Users className="h-5 w-5 text-primary" />
                Team activity
              </CardTitle>
              <CardDescription className="mt-1">
                Who is editing, for which client and order, and who has not
                picked up work yet. Updates live.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              className="border-primary text-primary shadow-sm hover:bg-primary/10"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw
                className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <Tabs
            value={view}
            onValueChange={(v) => {
              setView(v as ViewTab);
              setPage(1);
            }}
          >
            <ScrollArea className="mb-4 w-full">
              <TabsList className="h-auto w-max gap-1 p-1">
                <TabsTrigger value="working" className="gap-2 px-4 py-2">
                  <Activity className="size-4" />
                  Working now
                  <Badge variant="secondary" className="ml-1">
                    {sessions.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="idle" className="gap-2 px-4 py-2">
                  <UserX className="size-4" />
                  Not started
                  <Badge variant="secondary" className="ml-1">
                    {summary.idleEditors}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="all" className="gap-2 px-4 py-2">
                  <Users className="size-4" />
                  All editors
                  <Badge variant="secondary" className="ml-1">
                    {summary.totalEditors}
                  </Badge>
                </TabsTrigger>
              </TabsList>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>

            {/* Search toolbar */}
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border/50 bg-muted/30 p-4">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-primary/10 p-2">
                  <Search className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium">Find:</span>
              </div>
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Editor, client or order…"
                className="h-9 w-full max-w-xs bg-background/60"
              />
            </div>

            <div className="overflow-hidden rounded-md border border-border/60">
              {/* ---- Working now ---- */}
              <TabsContent value="working" className="m-0">
                <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow className="border-b-border/60 hover:bg-muted/40">
                        <TableHead>Editor</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead>Images</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Time on batch</TableHead>
                        <TableHead>Taken</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading
                        ? skeletonRows(8)
                        : workingRows.length === 0
                          ? emptyRow(
                              8,
                              "Nobody is working right now",
                              needle
                                ? "No batch matches your search."
                                : "Batches show up here as soon as an editor takes work.",
                            )
                          : workingRows.slice(from, to).map((s) => {
                              const elapsed = computeElapsed(s, nowTs);
                              const progress = s.order.progress;
                              return (
                                <TableRow
                                  key={s._id}
                                  className="transition-colors hover:bg-muted/20"
                                >
                                  <TableCell>
                                    <EditorCell
                                      name={s.staff.name}
                                      image={s.staff.image}
                                      employeeId={s.staff.staffId}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    {s.order.client ? (
                                      <>
                                        <div className="font-mono font-semibold">
                                          {s.order.client.clientId}
                                        </div>
                                        <div className="text-[11px] text-muted-foreground">
                                          {s.order.client.name}
                                        </div>
                                      </>
                                    ) : (
                                      "—"
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="font-mono font-semibold">
                                      {s.order.orderName}
                                    </div>
                                    {s.isReassignment && (
                                      <Badge
                                        variant="outline"
                                        className="mt-1 border-blue-500/30 text-[10px] text-blue-600 dark:text-blue-400"
                                      >
                                        taken over
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="font-semibold">
                                      {s.imageCount} of{" "}
                                      {s.order.imageQuantity ?? "?"}
                                    </div>
                                    {progress && (
                                      <div className="text-[11px] text-muted-foreground">
                                        {progress.registered} started ·{" "}
                                        {progress.pendingQc} in review ·{" "}
                                        {progress.completed} approved
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {stateBadge(
                                      s.isOnHold ? "on_hold" : "working",
                                    )}
                                  </TableCell>
                                  <TableCell className="font-mono font-bold">
                                    {fmtDuration(elapsed)}
                                    {s.priorAccumulatedSeconds > 0 && (
                                      <span className="block text-xs font-normal text-muted-foreground">
                                        +
                                        {Math.round(
                                          s.priorAccumulatedSeconds / 60,
                                        )}
                                        m earlier
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap text-muted-foreground">
                                    {formatDistanceToNow(
                                      new Date(s.startTime),
                                      { addSuffix: true },
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                        >
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent
                                        align="end"
                                        className="text-sm"
                                      >
                                        <DropdownMenuItem
                                          onClick={() => openFinish(s)}
                                        >
                                          <CheckCircle2 className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                                          Submit completed steps
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => openReassign(s)}
                                        >
                                          <UserCog className="mr-2 h-3.5 w-3.5 text-blue-600" />
                                          Hand over to editor
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() => openCancel(s)}
                                          className="text-destructive focus:text-destructive"
                                        >
                                          <XCircle className="mr-2 h-3.5 w-3.5" />
                                          Release for others
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                    </TableBody>
                  </Table>
              </TabsContent>

              {/* ---- Not started ---- */}
              <TabsContent value="idle" className="m-0">
                <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow className="border-b-border/60 hover:bg-muted/40">
                        <TableHead>Editor</TableHead>
                        <TableHead>Images done today</TableHead>
                        <TableHead>Work time today</TableHead>
                        <TableHead>Last finished</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading
                        ? skeletonRows(4)
                        : idleRows.length === 0
                          ? emptyRow(
                              4,
                              "Everyone has work in hand",
                              needle
                                ? "No editor matches your search."
                                : "Editors without a batch will be listed here.",
                            )
                          : idleRows.slice(from, to).map((e) => (
                              <TableRow
                                key={e.staffId}
                                className="transition-colors hover:bg-muted/20"
                              >
                                <TableCell>
                                  <EditorCell
                                    name={e.name}
                                    image={e.image}
                                    employeeId={e.employeeId}
                                  />
                                </TableCell>
                                <TableCell className="font-mono">
                                  {e.todayImages}
                                </TableCell>
                                <TableCell className="font-mono">
                                  {e.todaySeconds
                                    ? fmtDuration(e.todaySeconds)
                                    : "—"}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {e.lastActiveAt
                                    ? formatDistanceToNow(
                                        new Date(e.lastActiveAt),
                                        { addSuffix: true },
                                      )
                                    : "Nothing finished today"}
                                </TableCell>
                              </TableRow>
                            ))}
                    </TableBody>
                  </Table>
              </TabsContent>

              {/* ---- All editors ---- */}
              <TabsContent value="all" className="m-0">
                <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow className="border-b-border/60 hover:bg-muted/40">
                        <TableHead>Editor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Working on</TableHead>
                        <TableHead className="text-right">Images held</TableHead>
                        <TableHead className="text-right">Done today</TableHead>
                        <TableHead className="text-right">Time today</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading
                        ? skeletonRows(6)
                        : allRows.length === 0
                          ? emptyRow(
                              6,
                              "No editors found",
                              "Try a different search.",
                            )
                          : allRows.slice(from, to).map((e) => {
                              const mine = e.sessionIds
                                .map((id) => sessionById.get(id))
                                .filter(
                                  (x): x is ILiveWorkSession => Boolean(x),
                                );
                              const first = mine[0];
                              return (
                                <TableRow
                                  key={e.staffId}
                                  className="transition-colors hover:bg-muted/20"
                                >
                                  <TableCell>
                                    <EditorCell
                                      name={e.name}
                                      image={e.image}
                                      employeeId={e.employeeId}
                                    />
                                  </TableCell>
                                  <TableCell>{stateBadge(e.state)}</TableCell>
                                  <TableCell>
                                    {first ? (
                                      <>
                                        <div className="font-mono font-semibold">
                                          {first.order.orderName}
                                        </div>
                                        <div className="text-[11px] text-muted-foreground">
                                          {first.order.client?.name ||
                                            "No client"}
                                          {mine.length > 1 &&
                                            ` · +${mine.length - 1} more batch`}
                                        </div>
                                      </>
                                    ) : (
                                      <span className="text-muted-foreground">
                                        —
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    {mine.reduce((a, m) => a + m.imageCount, 0)}
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    {e.todayImages}
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    {e.todaySeconds
                                      ? fmtDuration(e.todaySeconds)
                                      : "—"}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                    </TableBody>
                  </Table>
              </TabsContent>
            </div>
          </Tabs>

          <TablePagination
            page={safePage}
            limit={limit}
            total={activeTotal}
            onPageChange={setPage}
            onLimitChange={setLimit}
            isFetching={isFetching}
          />
        </CardContent>
      </Card>

      {/* Force Finish dialog */}
      <AppDialog
        open={dialog === "finish"}
        onOpenChange={(o) => !o && closeDialog()}
        maxWidth="lg"
        title="Submit this editor’s work"
        description={
          target
            ? `Close ${target.staff.name}'s session on ${target.order.orderName}. Their logged work time is preserved.`
            : ""
        }
        icon={<CheckCircle2 className="h-5 w-5" />}
        footer={
          <>
            <Button
              variant="outline"
              onClick={closeDialog}
              disabled={isFinishing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleFinish}
              disabled={isFinishing || finishSteps.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Save completed steps
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Completed steps
          </Label>
          <div className="space-y-2 rounded-xl border p-3 bg-muted/10">
            {resolveOrderSteps(target?.order.requiredSteps).map((step, idx) => {
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
                          : prev.filter((n) => n !== step.name),
                      )
                    }
                  />
                  <span className="text-sm">{step.name}</span>
                </div>
              );
            })}
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
        open={dialog === "reassign"}
        onOpenChange={(o) => !o && closeDialog()}
        maxWidth="lg"
        title="Hand over to another editor"
        description={
          target
            ? `${target.staff.name}'s logged time on ${target.order.orderName} is frozen and still counts. The new editor can start working immediately.`
            : ""
        }
        icon={<UserCog className="h-5 w-5" />}
        footer={
          <>
            <Button
              variant="outline"
              onClick={closeDialog}
              disabled={isReassigning}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReassign}
              disabled={isReassigning || !reassignTo}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              Confirm handover
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
                    <SelectItem key={e._id} value={e._id} className="text-sm">
                      {e.name}
                      {e.designation ? ` · ${e.designation}` : ""}
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
                Batch:{" "}
                <strong className="text-foreground">{target.imageCount}</strong>{" "}
                image(s)
              </div>
              <div>
                Time so far by {target.staff.name}:{" "}
                <strong className="text-foreground">
                  {fmtDuration(computeElapsed(target, nowTs))}
                </strong>{" "}
                (carried into cumulative)
              </div>
            </div>
          )}
        </div>
      </AppDialog>

      {/* Force Cancel alert */}
      <AlertDialog
        open={dialog === "cancel"}
        onOpenChange={(o) => !o && closeDialog()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Release this editor’s images?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {target
                ? `${target.staff.name}'s ${target.imageCount}-image batch on ${target.order.orderName} will be unlocked. Their logged time is still recorded.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            placeholder="Handover note (optional)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="text-xs h-9"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>
              Keep with editor
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleCancel();
              }}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Release images
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
