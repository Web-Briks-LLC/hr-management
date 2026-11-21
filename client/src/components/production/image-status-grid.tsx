"use client";
import { useState } from "react";
import Link from "next/link";
import { useGetSanitizedOrdersQuery } from "@/redux/features/production/productionApi";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableFrame,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/shared/earnings-table";
import { TablePagination } from "@/components/shared/table-pagination";
import { ArrowRight, Search, Layers } from "lucide-react";

const STATUS_TABS: [string, string][] = [
  ["all", "All orders"],
  ["pending", "Not started"],
  ["in_progress", "Being edited"],
  ["quality_check", "Quality check"],
  ["revision", "Sent back"],
  ["completed", "Completed"],
];
const STATUS_LABEL = Object.fromEntries(STATUS_TABS);

export function ImageStatusGrid(_props: { isAdmin?: boolean }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const {
    currentData: data,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetSanitizedOrdersQuery(
    { search, status, includeCompleted: true },
    { pollingInterval: 15000 },
  );
  const orders = data?.data || [];
  const pages = Math.max(1, Math.ceil(orders.length / limit));
  const current = Math.min(page, pages);
  return (
    <Card className="border-border/60 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Layers className="h-5 w-5 text-primary" />
          Orders &amp; quality check
        </CardTitle>
        <CardDescription className="mt-1">
          Every order and how far along it is. Open an order to see who is
          editing which images, review finished work, and send images back.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        >
          <ScrollArea className="w-full">
            <TabsList className="h-auto w-max gap-1 p-1">
              {STATUS_TABS.map(([value, label]) => (
                <TabsTrigger key={value} value={value} className="px-4 py-2">
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </Tabs>

        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/50 bg-muted/30 p-4">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-primary/10 p-2">
              <Search className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium">Find:</span>
          </div>
          <Input
            aria-label="Search orders by client or order ID"
            className="h-9 w-full max-w-xs bg-background/60"
            placeholder="Client ID or order name…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <TableFrame>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total images</TableHead>
                <TableHead className="text-right">Being edited</TableHead>
                <TableHead className="text-right">Waiting for review</TableHead>
                <TableHead className="text-right">Sent back</TableHead>
                <TableHead>Approved</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading || (isFetching && !data) ? (
                Array.from({ length: 5 }, (_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }, (_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-48 text-center">
                    <Button variant="outline" onClick={() => refetch()}>
                      Could not load orders. Try again
                    </Button>
                  </TableCell>
                </TableRow>
              ) : !orders.length ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <div className="rounded-full bg-muted/50 p-3">
                        <Layers className="h-6 w-6 opacity-30" />
                      </div>
                      <p className="text-lg font-medium">No orders found</p>
                      <p className="text-sm">Try another tab or search.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                orders
                  .slice((current - 1) * limit, current * limit)
                  .map((order) => (
                    <TableRow key={order._id} className="transition-colors hover:bg-muted/20">
                      <TableCell className="whitespace-nowrap font-mono font-semibold">
                        {order.clientId?.clientId || "—"}
                      </TableCell>
                      <TableCell className="max-w-64">
                        <Link
                          className="block truncate font-medium hover:text-primary"
                          href={`/production/orders/${order._id}`}
                          title={order.orderName}
                        >
                          {order.orderName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={order.status === "completed" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {STATUS_LABEL[order.status] ||
                            order.status.replaceAll("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {order.imageQuantity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {order.imageStats.inProgressCount}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {order.imageStats.pendingQcCount}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {order.imageStats.revisionCount}
                      </TableCell>
                      <TableCell>
                        <div className="min-w-28 space-y-1">
                          <span className="text-xs text-muted-foreground">
                            {order.imageStats.completedCount} of {order.imageQuantity}
                          </span>
                          <Progress
                            className="h-1.5"
                            value={
                              order.imageQuantity
                                ? (100 * order.imageStats.completedCount) / order.imageQuantity
                                : 0
                            }
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/production/orders/${order._id}`}>
                            Open
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </TableFrame>
        <TablePagination
          page={current}
          limit={limit}
          total={orders.length}
          onPageChange={setPage}
          onLimitChange={setLimit}
          isFetching={isFetching}
        />
      </CardContent>
    </Card>
  );
}
