"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Award,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  Layers,
  Users,
  Zap,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { EditorCell } from "@/components/production/editor-cell";
import { StatTile } from "@/components/production/stat-tile";
import { useGetStaffPerformanceAnalyticsQuery } from "@/redux/features/production/productionApi";

const PERIODS: Record<string, string> = {
  today: "Today",
  week: "This week",
  month: "This month",
  year: "This year",
  all: "All time",
};

export function StaffPerformanceAnalytics() {
  const [filterType, setFilterType] = useState("month");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data: response, isLoading } = useGetStaffPerformanceAnalyticsQuery({
    filterType,
  });
  const data = response?.data;
  const summary = data?.summary || {
    totalImages: 0,
    totalSessions: 0,
    totalHours: 0,
    activeStaffCount: 0,
  };
  const editors = useMemo(() => data?.staffPerformance || [], [data]);
  const steps = data?.stepBreakdown || [];
  const shifts = data?.shiftPerformance || [];

  const safePage = Math.min(page, Math.max(1, Math.ceil(editors.length / limit)));
  const topImages = editors[0]?.totalImages || 1;

  const exportCsv = () => {
    if (!editors.length) {
      toast.error("Nothing to export for this period");
      return;
    }
    const head = ["Employee ID", "Editor", "Sessions", "Images", "Hours", "Seconds per image"];
    const lines = editors.map((e) =>
      [e.employeeId, `"${e.staffName}"`, e.totalSessions, e.totalImages, e.totalHours, e.avgSecondsPerImage].join(","),
    );
    const link = document.createElement("a");
    link.href = encodeURI(`data:text/csv;charset=utf-8,${[head.join(","), ...lines].join("\n")}`);
    link.download = `editor-ranking_${filterType}_${format(new Date(), "yyyyMMdd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Ranking downloaded");
  };

  const empty = (cols: number, text: string) => (
    <TableRow>
      <TableCell colSpan={cols} className="h-40 text-center text-muted-foreground">
        {isLoading ? "Loading…" : text}
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Images edited" value={summary.totalImages.toLocaleString()} hint="Finished in this period" icon={Layers} tone="green" isLoading={isLoading} />
        <StatTile label="Batches finished" value={summary.totalSessions.toLocaleString()} hint="Work sessions completed" icon={CheckCircle2} tone="blue" isLoading={isLoading} />
        <StatTile label="Work hours" value={`${summary.totalHours} h`} hint="Hold time excluded" icon={Clock} tone="orange" isLoading={isLoading} />
        <StatTile label="Editors" value={summary.activeStaffCount} hint="Who finished work" icon={Users} tone="slate" isLoading={isLoading} />
      </div>

      <Card className="border-border/60 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Award className="h-5 w-5 text-primary" />
                Editor ranking
              </CardTitle>
              <CardDescription className="mt-1">
                Who edited the most, how long it took, and how fast each editor
                works. Pick a period to compare.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              className="border-primary text-primary shadow-sm hover:bg-primary/10"
              onClick={exportCsv}
            >
              <Download className="h-4 w-4" />
              Download CSV
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/50 bg-muted/30 p-4">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-primary/10 p-2">
                <Filter className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium">Period:</span>
            </div>
            <Select
              value={filterType}
              onValueChange={(v) => {
                setFilterType(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[150px] bg-background/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PERIODS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="ranking">
            <TabsList className="mb-4 h-auto gap-1 p-1">
              <TabsTrigger value="ranking" className="gap-2 px-4 py-2">
                <Award className="size-4" /> Ranking
              </TabsTrigger>
              <TabsTrigger value="services" className="gap-2 px-4 py-2">
                <Zap className="size-4" /> Services done
              </TabsTrigger>
              <TabsTrigger value="shifts" className="gap-2 px-4 py-2">
                <Clock className="size-4" /> By shift
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ranking" className="m-0 space-y-4">
              <div className="overflow-hidden rounded-md border border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-border/60 hover:bg-muted/40">
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Editor</TableHead>
                      <TableHead className="text-right">Batches</TableHead>
                      <TableHead className="min-w-40">Images edited</TableHead>
                      <TableHead className="text-right">Work hours</TableHead>
                      <TableHead className="text-right">Time per image</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading || !editors.length
                      ? empty(6, "No finished work in this period.")
                      : editors
                          .slice((safePage - 1) * limit, safePage * limit)
                          .map((e, i) => (
                            <TableRow key={e.staffId} className="transition-colors hover:bg-muted/20">
                              <TableCell className="font-mono text-muted-foreground">
                                {(safePage - 1) * limit + i + 1}
                              </TableCell>
                              <TableCell>
                                <EditorCell name={e.staffName} image={e.image} employeeId={e.employeeId} />
                              </TableCell>
                              <TableCell className="text-right font-mono">{e.totalSessions}</TableCell>
                              <TableCell>
                                <div className="font-mono font-bold">{e.totalImages.toLocaleString()}</div>
                                <Progress className="mt-1 h-1.5" value={(100 * e.totalImages) / topImages} />
                              </TableCell>
                              <TableCell className="text-right font-mono">{e.totalHours} h</TableCell>
                              <TableCell className="text-right">
                                <Badge variant="outline" className="font-mono">
                                  {e.avgSecondsPerImage}s
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                page={safePage}
                limit={limit}
                total={editors.length}
                onPageChange={setPage}
                onLimitChange={setLimit}
              />
            </TabsContent>

            <TabsContent value="services" className="m-0">
              <div className="overflow-hidden rounded-md border border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-border/60 hover:bg-muted/40">
                      <TableHead>Service step</TableHead>
                      <TableHead className="text-right">Times completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {steps.length === 0
                      ? empty(2, "No service steps recorded in this period.")
                      : steps.map((s) => (
                          <TableRow key={s.stepName} className="transition-colors hover:bg-muted/20">
                            <TableCell className="font-medium">{s.stepName}</TableCell>
                            <TableCell className="text-right font-mono font-bold">
                              {s.count.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="shifts" className="m-0">
              <div className="overflow-hidden rounded-md border border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-border/60 hover:bg-muted/40">
                      <TableHead>Shift</TableHead>
                      <TableHead className="text-right">Batches</TableHead>
                      <TableHead className="text-right">Images</TableHead>
                      <TableHead className="text-right">Work hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shifts.length === 0
                      ? empty(4, "No shift records in this period.")
                      : shifts.map((s, i) => (
                          <TableRow key={s.shiftId || i} className="transition-colors hover:bg-muted/20">
                            <TableCell className="font-medium">{s.shiftName}</TableCell>
                            <TableCell className="text-right font-mono">{s.totalSessions}</TableCell>
                            <TableCell className="text-right font-mono font-bold">{s.totalImages.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-mono">{s.totalHours} h</TableCell>
                          </TableRow>
                        ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
