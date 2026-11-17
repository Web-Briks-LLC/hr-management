"use client";
import { useState } from "react";
import Link from "next/link";
import { useGetSanitizedOrdersQuery } from "@/redux/features/production/productionApi";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">
          Every order, from first image to final review
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Open an order to see ownership, review images and follow its work
          history.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Search orders by client or order ID"
            className="pl-9 h-9 bg-background/60"
            placeholder="Search Client ID or Order ID…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        >
          <SelectTrigger
            className="w-[160px] h-9 bg-background/60"
            aria-label="Filter order status"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[
              "all",
              "pending",
              "in_progress",
              "quality_check",
              "revision",
              "completed",
            ].map((value) => (
              <SelectItem key={value} value={value}>
                {value === "all" ? "All orders" : value.replaceAll("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <TableFrame>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client ID</TableHead>
              <TableHead>Order ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Images</TableHead>
              <TableHead className="text-right">Editing</TableHead>
              <TableHead className="text-right">To review</TableHead>
              <TableHead className="text-right">Revision</TableHead>
              <TableHead>QC approved</TableHead>
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
                    Could not load orders. Retry
                  </Button>
                </TableCell>
              </TableRow>
            ) : !orders.length ? (
              <TableRow>
                <TableCell colSpan={9} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <div className="bg-muted/50 p-3 rounded-full">
                      <Layers className="h-6 w-6" />
                    </div>
                    <p>No orders match these filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              orders
                .slice((current - 1) * limit, current * limit)
                .map((order) => (
                  <TableRow key={order._id}>
                    <TableCell className="font-medium whitespace-nowrap">
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
                        variant={
                          order.status === "completed" ? "default" : "secondary"
                        }
                        className="capitalize text-xs"
                      >
                        {order.status.replaceAll("_", " ")}
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
                          {order.imageStats.completedCount} /{" "}
                          {order.imageQuantity}
                        </span>
                        <Progress
                          className="h-1.5"
                          value={
                            order.imageQuantity
                              ? (100 * order.imageStats.completedCount) /
                                order.imageQuantity
                              : 0
                          }
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/production/orders/${order._id}`}>
                          Open order
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
    </div>
  );
}
