"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

/** The Earnings pagination, shared so every table uses the same controls. */
export function TablePagination({
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
  isFetching = false,
}: {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  isFetching?: boolean;
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const current = Math.min(Math.max(1, page), totalPages);
  const pageNumbers: (number | string)[] =
    totalPages <= 7
      ? Array.from({ length: totalPages }, (_, index) => index + 1)
      : current <= 3
        ? [1, 2, 3, 4, "...", totalPages]
        : current >= totalPages - 2
          ? [
              1,
              "...",
              totalPages - 3,
              totalPages - 2,
              totalPages - 1,
              totalPages,
            ]
          : [1, "...", current - 1, current, current + 1, "...", totalPages];
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">
          Showing {total ? (current - 1) * limit + 1 : 0} to{" "}
          {Math.min(current * limit, total)} of {total} entries
        </p>
        <Select
          value={String(limit)}
          disabled={isFetching}
          onValueChange={(value) => {
            onLimitChange(Number(value));
            onPageChange(1);
          }}
        >
          <SelectTrigger className="h-8 w-[70px]" aria-label="Entries per page">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 20, 50, 100].map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {totalPages > 1 && (
        <nav aria-label="Table pagination" className="flex items-center gap-1">
          <Button
            aria-label="First page"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(1)}
            disabled={current === 1 || isFetching}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            aria-label="Previous page"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(current - 1)}
            disabled={current === 1 || isFetching}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {pageNumbers.map((num, index) =>
            typeof num === "string" ? (
              <span
                key={`ellipsis-${index}`}
                className="px-2 text-muted-foreground"
              >
                ...
              </span>
            ) : (
              <Button
                key={num}
                aria-label={`Page ${num}`}
                aria-current={current === num ? "page" : undefined}
                variant={current === num ? "default" : "outline"}
                size="icon"
                className="h-8 w-8"
                onClick={() => onPageChange(num)}
                disabled={isFetching}
              >
                {num}
              </Button>
            ),
          )}
          <Button
            aria-label="Next page"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(current + 1)}
            disabled={current === totalPages || isFetching}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            aria-label="Last page"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(totalPages)}
            disabled={current === totalPages || isFetching}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </nav>
      )}
    </div>
  );
}
