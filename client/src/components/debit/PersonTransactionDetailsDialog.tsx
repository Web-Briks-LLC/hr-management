"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  ReceiptText,
} from "lucide-react";
import type {
  Debit,
  DebitTransactionType,
  Person,
} from "@/redux/features/debit/debitApi";
import { useGetDebitsQuery } from "@/redux/features/debit/debitApi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";

interface PersonTransactionDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: Person | null;
  balance: number;
}

const PAGE_SIZE_OPTIONS = [5, 10, 20];

const formatCurrency = (amount: number) =>
  amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getTypeBadgeVariant = (type: DebitTransactionType) =>
  type === "Borrow" ? "destructive" : "secondary";

export function PersonTransactionDetailsDialog({
  open,
  onOpenChange,
  person,
  balance,
}: PersonTransactionDetailsDialogProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [statusFilter, setStatusFilter] = useState<
    "all" | DebitTransactionType
  >("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const queryArgs = useMemo(
    () => ({
      personId: person?._id,
      page,
      limit: pageSize,
      type: statusFilter,
      date: selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined,
    }),
    [page, pageSize, person?._id, selectedDate, statusFilter],
  );

  const { data, isFetching } = useGetDebitsQuery(queryArgs, {
    skip: !open || !person?._id,
  });

  const transactions = data?.data ?? [];
  const pagination = data?.pagination ?? {
    page: 1,
    limit: pageSize,
    total: 0,
    pages: 1,
  };

  const filteredSummary = transactions.reduce(
    (summary, transaction) => {
      if (transaction.type === "Borrow") {
        summary.borrowed += transaction.amount;
      } else {
        summary.returned += transaction.amount;
      }
      return summary;
    },
    { borrowed: 0, returned: 0 },
  );

  const handleStatusChange = (value: "all" | DebitTransactionType) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setPage(1);
  };

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    setPage(1);
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setSelectedDate(undefined);
    setPage(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ScrollArea className="h-[calc(90vh-88px)]">
        <DialogContent className="max-w-5xl!">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-primary" />
              {person?.name || "Person"} Transactions
            </DialogTitle>
            <DialogDescription>
              Review paginated debit records with transaction status and date
              filters.
            </DialogDescription>
          </DialogHeader>
          <Separator />

          <div className="flex flex-col gap-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="gap-0 py-0">
                <CardContent className="space-y-1 px-5 py-4">
                  <p className="text-sm text-muted-foreground">
                    Current Balance
                  </p>
                  <p
                    className={cn(
                      "text-2xl font-semibold",
                      balance > 0
                        ? "text-red-500"
                        : balance < 0
                          ? "text-emerald-500"
                          : "text-muted-foreground",
                    )}
                  >
                    ৳{formatCurrency(Math.abs(balance))}
                  </p>
                </CardContent>
              </Card>
              <Card className="gap-0 py-0">
                <CardContent className="space-y-1 px-5 py-4">
                  <p className="text-sm text-muted-foreground">
                    Borrowed On This View
                  </p>
                  <p className="text-2xl font-semibold text-red-500">
                    ৳{formatCurrency(filteredSummary.borrowed)}
                  </p>
                </CardContent>
              </Card>
              <Card className="gap-0 py-0">
                <CardContent className="space-y-1 px-5 py-4">
                  <p className="text-sm text-muted-foreground">
                    Returned On This View
                  </p>
                  <p className="text-2xl font-semibold text-emerald-500">
                    ৳{formatCurrency(filteredSummary.returned)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Status</p>
                  <Select
                    value={statusFilter}
                    onValueChange={(value) =>
                      handleStatusChange(value as "all" | DebitTransactionType)
                    }
                  >
                    <SelectTrigger className="w-full min-w-40">
                      <SelectValue placeholder="All status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All status</SelectItem>
                      <SelectItem value="Borrow">Borrow</SelectItem>
                      <SelectItem value="Return">Return</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Date</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-between font-normal",
                          !selectedDate && "text-muted-foreground",
                        )}
                      >
                        {selectedDate
                          ? format(selectedDate, "PPP")
                          : "All dates"}
                        <CalendarIcon className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Per page</p>
                  <Select
                    value={String(pageSize)}
                    onValueChange={handlePageSizeChange}
                  >
                    <SelectTrigger className="w-full min-w-28">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                variant="outline"
                className="justify-start lg:justify-center"
                onClick={clearFilters}
              >
                <Filter className="h-4 w-4" />
                Reset Filters
              </Button>
            </div>

            <div className="overflow-hidden rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isFetching ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Loading transactions...
                      </TableCell>
                    </TableRow>
                  ) : transactions.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No transactions found for this filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((transaction: Debit) => (
                      <TableRow key={transaction._id}>
                        <TableCell className="font-medium">
                          {format(new Date(transaction.date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getTypeBadgeVariant(transaction.type)}
                          >
                            {transaction.type}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-mono font-medium",
                            transaction.type === "Borrow"
                              ? "text-red-500"
                              : "text-emerald-500",
                          )}
                        >
                          ৳{formatCurrency(transaction.amount)}
                        </TableCell>
                        <TableCell className="max-w-xs text-muted-foreground">
                          {transaction.description || "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing{" "}
                {pagination.total === 0
                  ? 0
                  : (pagination.page - 1) * pagination.limit + 1}
                -
                {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                of {pagination.total} transactions
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => current - 1)}
                  disabled={pagination.page === 1 || isFetching}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="min-w-24 text-center text-sm font-medium">
                  Page {pagination.page} of {pagination.pages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={pagination.page >= pagination.pages || isFetching}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </ScrollArea>
    </Dialog>
  );
}
