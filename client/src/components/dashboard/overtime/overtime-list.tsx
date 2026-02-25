"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    useDeleteOvertimeMutation,
    useGetAllOvertimeQuery,
} from "@/redux/features/overtime/overtimeApi";
import {
    Edit,
    MoreHorizontal,
    Plus,
    Trash,
    Search,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { OvertimeDialog } from "./overtime-dialog";
import { IOvertime } from "@/types/overtime.type";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDebounce } from "@/hooks/use-debounce";

export default function OvertimeList() {
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [limit, setLimit] = useState(20);
    const debouncedSearch = useDebounce(searchTerm, 300);

    const {
        data: overtimeData,
        isLoading,
        isFetching,
        isError,
    } = useGetAllOvertimeQuery({
        page,
        limit,
        search: debouncedSearch,
    });

    const [deleteOvertime] = useDeleteOvertimeMutation();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedOvertime, setSelectedOvertime] = useState<IOvertime | null>(
        null,
    );

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this record?")) return;
        try {
            await deleteOvertime(id).unwrap();
            toast.success("Overtime deleted");
        } catch (error) {
            toast.error((error as Error).message || "Failed to delete");
        }
    };

    const handleEdit = (ot: IOvertime) => {
        setSelectedOvertime(ot);
        setIsDialogOpen(true);
    };

    const handleCreate = () => {
        setSelectedOvertime(null);
        setIsDialogOpen(true);
    };

    if (isError)
        return <div className="text-red-500">Error loading records.</div>;

    const records = overtimeData?.overtimes || [];
    const totalPages = overtimeData?.totalPages || 1;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">
                    Overtime Management
                </h2>
                <Button onClick={handleCreate}>
                    <Plus className="h-4 w-4" /> Add Overtime
                </Button>
            </div>

            <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <CardTitle>All Overtime Records</CardTitle>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search by name or ID..."
                            className="w-full sm:w-[250px] pl-9 bg-background/60"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setPage(1);
                            }}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b-border/60">
                                    <TableHead className="font-semibold">
                                        Staff
                                    </TableHead>
                                    <TableHead className="font-semibold">
                                        Date
                                    </TableHead>
                                    <TableHead className="font-semibold">
                                        Type
                                    </TableHead>
                                    <TableHead className="font-semibold">
                                        Duration
                                    </TableHead>
                                    <TableHead className="font-semibold">
                                        Status
                                    </TableHead>
                                    <TableHead className="text-right font-semibold">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading || isFetching ? (
                                    Array.from({ length: 10 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell>
                                                <div className="space-y-2">
                                                    <Skeleton className="h-4 w-[150px]" />
                                                    <Skeleton className="h-3 w-[100px]" />
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-4 w-[100px]" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-4 w-[80px]" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-4 w-[80px]" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-6 w-[80px] rounded-full" />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Skeleton className="h-8 w-[50px] ml-auto" />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : records.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="text-center py-16 text-muted-foreground"
                                        >
                                            <div className="flex flex-col items-center gap-3">
                                                <Search className="h-10 w-10 text-muted-foreground/30" />
                                                <p className="text-base font-medium">
                                                    No overtime records found
                                                </p>
                                                <p className="text-sm">
                                                    Try adjusting your search
                                                </p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    records.map((ot: IOvertime) => (
                                        <TableRow key={ot._id}>
                                            <TableCell>
                                                <div className="font-medium">
                                                    {ot.staffId?.name || "N/A"}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {ot.staffId?.staffId}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {format(
                                                    new Date(ot.date),
                                                    "MMM dd, yyyy",
                                                )}
                                            </TableCell>
                                            <TableCell className="capitalize">
                                                {ot.type.replace("_", " ")}
                                            </TableCell>
                                            <TableCell>
                                                {Math.floor(
                                                    ot.durationMinutes / 60,
                                                )}
                                                h {ot.durationMinutes % 60}m
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        ot.status === "approved"
                                                            ? "default"
                                                            : "secondary"
                                                    }
                                                >
                                                    {ot.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                        asChild
                                                    >
                                                        <Button
                                                            variant="ghost"
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            <span className="sr-only">
                                                                Open menu
                                                            </span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>
                                                            Actions
                                                        </DropdownMenuLabel>
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                handleEdit(ot)
                                                            }
                                                        >
                                                            <Edit className=" h-4 w-4" />{" "}
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                handleDelete(
                                                                    ot._id,
                                                                )
                                                            }
                                                            className="text-red-600"
                                                        >
                                                            <Trash className=" h-4 w-4" />{" "}
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 0 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                            <p className="text-sm text-muted-foreground mr-auto">
                                Showing {(page - 1) * limit + 1} to{" "}
                                {Math.min(
                                    page * limit,
                                    overtimeData?.total || 0,
                                )}{" "}
                                of{" "}
                                <span className="font-semibold text-foreground">
                                    {overtimeData?.total || 0}
                                </span>{" "}
                                entries
                            </p>

                            <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">
                                    Rows per page
                                </p>
                                <Select
                                    value={limit.toString()}
                                    onValueChange={(val) => {
                                        setLimit(Number(val));
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger className="w-auto">
                                        <SelectValue placeholder={limit} />
                                    </SelectTrigger>
                                    <SelectContent side="top">
                                        {[10, 20, 50, 100].map((pageSize) => (
                                            <SelectItem
                                                key={pageSize}
                                                value={pageSize.toString()}
                                            >
                                                {pageSize}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {totalPages > 1 && (
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setPage(1)}
                                        disabled={page === 1 || isFetching}
                                    >
                                        <ChevronsLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() =>
                                            setPage((p) => Math.max(1, p - 1))
                                        }
                                        disabled={page === 1 || isFetching}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>

                                    {/* Page Numbers Logic */}
                                    {(() => {
                                        const pageNumbers: (number | string)[] =
                                            [];
                                        if (totalPages <= 7) {
                                            for (
                                                let i = 1;
                                                i <= totalPages;
                                                i++
                                            )
                                                pageNumbers.push(i);
                                        } else {
                                            if (page <= 3) {
                                                pageNumbers.push(
                                                    1,
                                                    2,
                                                    3,
                                                    4,
                                                    "...",
                                                    totalPages,
                                                );
                                            } else if (page >= totalPages - 2) {
                                                pageNumbers.push(
                                                    1,
                                                    "...",
                                                    totalPages - 3,
                                                    totalPages - 2,
                                                    totalPages - 1,
                                                    totalPages,
                                                );
                                            } else {
                                                pageNumbers.push(
                                                    1,
                                                    "...",
                                                    page - 1,
                                                    page,
                                                    page + 1,
                                                    "...",
                                                    totalPages,
                                                );
                                            }
                                        }

                                        return pageNumbers.map((num, idx) =>
                                            num === "..." ? (
                                                <span
                                                    key={`ellipsis-${idx}`}
                                                    className="px-2 text-muted-foreground"
                                                >
                                                    ...
                                                </span>
                                            ) : (
                                                <Button
                                                    key={num}
                                                    variant={
                                                        page === num
                                                            ? "default"
                                                            : "outline"
                                                    }
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() =>
                                                        setPage(num as number)
                                                    }
                                                    disabled={isFetching}
                                                >
                                                    {num}
                                                </Button>
                                            ),
                                        );
                                    })()}

                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() =>
                                            setPage((p) =>
                                                Math.min(totalPages, p + 1),
                                            )
                                        }
                                        disabled={
                                            page === totalPages || isFetching
                                        }
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setPage(totalPages)}
                                        disabled={
                                            page === totalPages || isFetching
                                        }
                                    >
                                        <ChevronsRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <OvertimeDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                data={selectedOvertime}
            />
        </div>
    );
}
