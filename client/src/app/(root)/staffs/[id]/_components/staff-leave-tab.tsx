"use client";

import { useState } from "react";
import { useGetLeaveApplicationsQuery } from "@/redux/features/leave/leaveApi";
import type { ILeaveApplication } from "@/types/leave.type";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import {
    CalendarOff,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    XCircle,
    Clock,
} from "lucide-react";

export function StaffLeaveTab({ staffId }: { staffId: string }) {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    const {
        data: response,
        isLoading,
        isFetching,
    } = useGetLeaveApplicationsQuery({
        staffId,
        page,
        limit,
    });

    const leaves = response?.data || [];
    const meta = response?.meta;

    const getStatusStyles = (status: string) => {
        switch (status) {
            case "approved":
                return {
                    variant: "default" as const,
                    icon: CheckCircle2,
                    className:
                        "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 border-emerald-200",
                };
            case "rejected":
                return {
                    variant: "destructive" as const,
                    icon: XCircle,
                    className:
                        "bg-red-500/15 text-red-700 hover:bg-red-500/25 border-red-200",
                };
            case "pending":
                return {
                    variant: "secondary" as const,
                    icon: Clock,
                    className:
                        "bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 border-amber-200",
                };
            default:
                return {
                    variant: "outline" as const,
                    icon: Clock,
                    className: "",
                };
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 w-full">
                        <Skeleton className="h-10 w-full" />
                    </div>
                ))}
            </div>
        );
    }

    if (leaves.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/30 rounded-lg border border-dashed mt-4">
                <CalendarOff className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-foreground">
                    No Leaves Found
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-1">
                    This staff member hasn&apos;t submitted any leave
                    applications yet.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="w-[150px]">Type</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead>End Date</TableHead>
                            <TableHead className="w-[30%]">Reason</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {leaves.map((leave: ILeaveApplication) => {
                            const {
                                variant,
                                icon: Icon,
                                className,
                            } = getStatusStyles(leave.status);
                            return (
                                <TableRow
                                    key={leave._id}
                                    className="hover:bg-muted/50 transition-colors"
                                >
                                    <TableCell className="font-medium capitalize">
                                        {leave.leaveType.replace("_", " ")}
                                    </TableCell>
                                    <TableCell>
                                        {format(
                                            new Date(leave.startDate),
                                            "MMM dd, yyyy",
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {format(
                                            new Date(leave.endDate),
                                            "MMM dd, yyyy",
                                        )}
                                    </TableCell>
                                    <TableCell
                                        className="truncate max-w-[200px]"
                                        title={leave.reason}
                                    >
                                        <span className="text-muted-foreground">
                                            {leave.reason || "N/A"}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge
                                            variant={variant}
                                            className={`ml-auto font-normal flex w-fit items-center gap-1 self-end ${className}`}
                                        >
                                            <Icon className="h-3.5 w-3.5" />
                                            <span className="capitalize">
                                                {leave.status}
                                            </span>
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-6">
                        <div className="text-sm text-muted-foreground">
                            Page{" "}
                            <span className="font-medium text-foreground">
                                {meta.page}
                            </span>{" "}
                            of{" "}
                            <span className="font-medium text-foreground">
                                {meta.totalPages}
                            </span>{" "}
                            ({meta.total} total)
                        </div>
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-muted-foreground">
                                Rows per page
                            </p>
                            <Select
                                value={`${limit}`}
                                onValueChange={(value) => {
                                    setLimit(Number(value));
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="h-8 w-[70px] bg-background">
                                    <SelectValue placeholder={limit} />
                                </SelectTrigger>
                                <SelectContent side="top">
                                    {[5, 10, 20].map((pageSize) => (
                                        <SelectItem
                                            key={pageSize}
                                            value={`${pageSize}`}
                                        >
                                            {pageSize}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1 || isFetching}
                            className="bg-background"
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Prev
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                setPage((p) => Math.min(meta.totalPages, p + 1))
                            }
                            disabled={page >= meta.totalPages || isFetching}
                            className="bg-background"
                        >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
