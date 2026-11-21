"use client";
import { ScrollBox } from "@/components/shared/scroll-box";
import { TablePagination } from "@/components/shared/table-pagination";
import { useState } from "react";
import { useGetOrderActivityQuery } from "@/redux/features/production/productionApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { History, ArrowRight, Users } from "lucide-react";
const labels: Record<string, string> = {
  taken: "Images taken",
  held: "Put on hold",
  resumed: "Work resumed",
  released: "Released for others",
  submitted: "Work submitted",
  supervisor_submitted: "Submitted by supervisor",
  reassigned: "Handed to another editor",
  revision_requested: "Returned for revision",
  approved: "Quality check passed",
  locks_repaired: "Stale locks repaired",
};
export function ProductionActivity({
  orderId,
  initialImageName = "",
}: {
  orderId: string;
  initialImageName?: string;
}) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [imageName, setImageName] = useState(initialImageName);
  const {
    currentData: data,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useGetOrderActivityQuery(
    { orderId, page, limit, imageName: imageName || undefined },
    { pollingInterval: 15000 },
  );
  const result = data?.data;
  return (
    <section className="space-y-5" aria-label="Order work history">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold">
            <History className="size-4" /> Work history
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Who took, released, handed over and reviewed this work.
          </p>
        </div>
        <Badge variant="secondary">
          <Users className="mr-1 size-3" />
          {result?.contributorCount ?? "—"} editors involved
        </Badge>
      </div>
      <Input
        aria-label="Filter history by exact image filename"
        placeholder="Exact image filename (optional)"
        value={imageName}
        onChange={(e) => {
          setImageName(e.target.value);
          setPage(1);
        }}
      />
      {isLoading || (isFetching && !data) ? (
        <Skeleton className="h-32" />
      ) : isError ? (
        <Button variant="outline" onClick={() => refetch()}>
          Could not load history. Retry
        </Button>
      ) : !result?.events.length ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No recorded events match. Detailed activity is recorded from this
          update onward; earlier work remains in the legacy timeline.
        </div>
      ) : (
        <ol className="space-y-0">
          {result.events.map((event) => (
            <li
              key={event._id}
              className="relative border-l-2 border-border pb-6 pl-5 last:pb-0"
            >
              <span className="absolute -left-[5px] top-1.5 size-2 rounded-full bg-primary" />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  {labels[event.action] || event.action}
                </p>
                <time className="text-xs text-muted-foreground">
                  {new Date(event.createdAt).toLocaleString("en-GB", {
                    timeZone: "Asia/Dhaka",
                  })}
                </time>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                By {event.actorId?.name || "Recorded user"} ·{" "}
                {event.imageNames.length} images
              </p>
              {(event.fromStaffId || event.toStaffId) && (
                <p className="mt-2 flex items-center gap-2 text-sm">
                  {event.fromStaffId?.userId?.name ||
                    event.fromStaffId?.staffId ||
                    "Available"}
                  <ArrowRight className="size-3" />
                  {event.toStaffId?.userId?.name ||
                    event.toStaffId?.staffId ||
                    (event.action === "released"
                      ? "Available to take"
                      : labels[event.action])}
                </p>
              )}
              {!!event.completedSteps.length && (
                <p className="mt-2 text-sm">
                  Steps: {event.completedSteps.join(", ")}
                </p>
              )}
              {event.note && (
                <p className="mt-2 rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
                  {event.note}
                </p>
              )}
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer text-muted-foreground">
                  View image names
                </summary>
                <ScrollBox maxHeight="8rem" className="mt-2">
                  <p className="break-all">{event.imageNames.join(", ")}</p>
                </ScrollBox>
              </details>
            </li>
          ))}
        </ol>
      )}
      {result && (
        <TablePagination
          page={result.page}
          limit={limit}
          total={result.total}
          onPageChange={setPage}
          onLimitChange={setLimit}
          isFetching={isFetching}
        />
      )}
    </section>
  );
}
