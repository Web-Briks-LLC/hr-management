"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Clock,
  Download,
  FileSpreadsheet,
  Filter,
  Image as ImageIcon,
  Layers,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatTile } from "@/components/production/stat-tile";
import { EditorCell } from "@/components/production/editor-cell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/earnings-table";
import { TablePagination } from "@/components/shared/table-pagination";
import { useGetMonthlyEditorReportQuery } from "@/redux/features/production/productionApi";

const hours = (sec: number) => (sec / 3600).toFixed(2);

export function MonthlyEditorReport({ isSupervisor }: { isSupervisor: boolean }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [editorId, setEditorId] = useState("all");
  const [tab, setTab] = useState<"editors" | "log">("editors");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data, isLoading, isFetching } = useGetMonthlyEditorReportQuery({
    month,
    year,
  });
  const report = data?.data;

  const rows = useMemo(
    () =>
      (report?.rows || []).filter(
        (r) => editorId === "all" || r.staffObjectId === editorId,
      ),
    [report, editorId],
  );
  const editors = report?.editors || [];
  const shownEditors = editors.filter(
    (e) => editorId === "all" || e.staffId === editorId,
  );
  const listLength =
    isSupervisor && tab === "editors" ? shownEditors.length : rows.length;
  const safePage = Math.min(page, Math.max(1, Math.ceil(listLength / limit)));
  const years = [year - 2, year - 1, year, year + 1].filter(
    (y) => y <= now.getFullYear(),
  );

  const exportExcel = () => {
    if (!rows.length) {
      toast.error("No work recorded for this selection");
      return;
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        shownEditors.map((e) => ({
          "Employee ID": e.employeeId,
          Editor: e.name,
          "Working days": e.workingDays,
          Sessions: e.sessions,
          Orders: e.ordersCount,
          Clients: e.clientsCount,
          Images: e.images,
          "Work hours": Number(hours(e.workSeconds)),
          "Avg sec / image": e.avgSecondsPerImage,
        })),
      ),
      "Editor summary",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        rows.map((r) => ({
          Date: format(new Date(r.date), "yyyy-MM-dd"),
          Editor: r.editorName,
          "Client ID": r.clientCode,
          ...(r.clientName ? { Client: r.clientName } : {}),
          Order: r.orderName,
          "Order images": r.orderImages,
          "Images taken": r.images,
          "Work hours": Number(hours(r.workSeconds)),
          Steps: r.steps,
        })),
      ),
      "Work log",
    );
    XLSX.writeFile(
      wb,
      `production-report-${year}-${String(month).padStart(2, "0")}.xlsx`,
    );
  };

  const totalImages = rows.reduce((a, r) => a + r.images, 0);
  const totalSeconds = rows.reduce((a, r) => a + r.workSeconds, 0);
  const cards = [
    { label: "Editors", value: shownEditors.length, hint: "With recorded work", icon: Users, tone: "slate" as const },
    { label: "Work sessions", value: rows.length, hint: "Batches finished", icon: Layers, tone: "blue" as const },
    { label: "Images edited", value: totalImages, hint: "In the selected month", icon: ImageIcon, tone: "green" as const },
    { label: "Work hours", value: hours(totalSeconds), hint: "Hold time excluded", icon: Clock, tone: "orange" as const },
  ];
  const empty = (cols: number) => (
    <TableRow>
      <TableCell colSpan={cols} className="h-48 text-center">
        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <div className="rounded-full bg-muted/50 p-3">
            <FileSpreadsheet className="h-6 w-6 opacity-30" />
          </div>
          <p className="text-lg font-medium">
            {isLoading ? "Loading…" : "No work recorded"}
          </p>
          <p className="text-sm">
            {isLoading ? "" : "Try another month or editor."}
          </p>
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <StatTile key={c.label} {...c} isLoading={isLoading} />
        ))}
      </div>

      <Card className="border-border/60 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Monthly report
              </CardTitle>
              <CardDescription className="mt-1">
                {isSupervisor
                  ? "What each editor did in the month: clients, orders, images and work time."
                  : "What you worked on in the month: clients, orders, images and work time."}
              </CardDescription>
            </div>
            <Button
              className="bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
              onClick={exportExcel}
            >
              <Download className="h-4 w-4" />
              Download Excel
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/50 bg-muted/30 p-4">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-primary/10 p-2">
                <Filter className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium">Filters:</span>
            </div>
            <Select
              value={String(month)}
              onValueChange={(v) => {
                setMonth(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[140px] bg-background/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i} value={String(i + 1)}>
                    {format(new Date(2000, i, 1), "MMMM")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(year)}
              onValueChange={(v) => {
                setYear(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[100px] bg-background/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isSupervisor && (
              <Select
                value={editorId}
                onValueChange={(v) => {
                  setEditorId(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-[200px] bg-background/60">
                  <SelectValue placeholder="All editors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All editors</SelectItem>
                  {editors.map((e) => (
                    <SelectItem key={e.staffId} value={e.staffId}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <Tabs
            value={isSupervisor ? tab : "log"}
            onValueChange={(v) => {
              setTab(v as "editors" | "log");
              setPage(1);
            }}
          >
            {isSupervisor && (
              <TabsList className="mb-4 h-auto gap-1 p-1">
                <TabsTrigger value="editors" className="gap-2 px-4 py-2">
                  <Users className="size-4" />
                  Per editor
                  <Badge variant="secondary" className="ml-1">
                    {shownEditors.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="log" className="gap-2 px-4 py-2">
                  <Layers className="size-4" />
                  Work log
                  <Badge variant="secondary" className="ml-1">
                    {rows.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            )}

            <div className="overflow-hidden rounded-md border border-border/60">
              {isSupervisor && (
                <TabsContent value="editors" className="m-0">
                  <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow className="border-b-border/60 hover:bg-muted/40">
                          <TableHead>Editor</TableHead>
                          <TableHead className="text-right">Days worked</TableHead>
                          <TableHead className="text-right">Clients</TableHead>
                          <TableHead className="text-right">Orders</TableHead>
                          <TableHead className="text-right">Images</TableHead>
                          <TableHead className="text-right">Work hours</TableHead>
                          <TableHead className="text-right">Avg / image</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {shownEditors.length === 0
                          ? empty(7)
                          : shownEditors
                              .slice((safePage - 1) * limit, safePage * limit)
                              .map((e) => (
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
                                  <TableCell className="text-right">{e.workingDays}</TableCell>
                                  <TableCell className="text-right">{e.clientsCount}</TableCell>
                                  <TableCell className="text-right">{e.ordersCount}</TableCell>
                                  <TableCell className="text-right font-mono font-bold">{e.images}</TableCell>
                                  <TableCell className="text-right font-mono">{hours(e.workSeconds)} h</TableCell>
                                  <TableCell className="text-right font-mono">{e.avgSecondsPerImage}s</TableCell>
                                </TableRow>
                              ))}
                      </TableBody>
                    </Table>
                </TabsContent>
              )}

              <TabsContent value="log" className="m-0">
                <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow className="border-b-border/60 hover:bg-muted/40">
                        <TableHead>Date</TableHead>
                        {isSupervisor && <TableHead>Editor</TableHead>}
                        <TableHead>Client</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead className="text-right">Images taken</TableHead>
                        <TableHead className="text-right">Work time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.length === 0
                        ? empty(isSupervisor ? 6 : 5)
                        : rows
                            .slice((safePage - 1) * limit, safePage * limit)
                            .map((r) => (
                              <TableRow
                                key={r.sessionId}
                                className="transition-colors hover:bg-muted/20"
                              >
                                <TableCell className="whitespace-nowrap text-muted-foreground">
                                  {format(new Date(r.date), "dd MMM, HH:mm")}
                                </TableCell>
                                {isSupervisor && (
                                  <TableCell>
                                    <EditorCell
                                      name={r.editorName}
                                      image={r.editorImage}
                                      employeeId={r.employeeId}
                                    />
                                  </TableCell>
                                )}
                                <TableCell>
                                  <div className="font-mono font-semibold">
                                    {r.clientCode || "—"}
                                  </div>
                                  {r.clientName && (
                                    <div className="text-[11px] text-muted-foreground">
                                      {r.clientName}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="font-mono font-semibold">
                                    {r.orderName}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground">
                                    {r.orderImages} images in order
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-mono font-bold">
                                  {r.images}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  {hours(r.workSeconds)} h
                                </TableCell>
                              </TableRow>
                            ))}
                    </TableBody>
                  </Table>
              </TabsContent>
            </div>
          </Tabs>

          <TablePagination
            page={safePage}
            limit={limit}
            total={isSupervisor && tab === "editors" ? shownEditors.length : rows.length}
            onPageChange={setPage}
            onLimitChange={setLimit}
            isFetching={isFetching}
          />
        </CardContent>
      </Card>
    </div>
  );
}
