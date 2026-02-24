"use client";

import { useState, useEffect } from "react";
import {
    useGetAllAttendanceQuery,
    useUpdateAttendanceStatusMutation,
} from "@/redux/features/attendance/attendanceApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Role } from "@/constants/role";
import MyOvertime from "@/components/dashboard/overtime/my-overtime";
import OvertimeList from "@/components/dashboard/overtime/overtime-list";
import {
    ChevronLeft,
    ChevronRight,
    Search,
    ChevronsLeft,
    ChevronsRight,
    Calendar as CalendarIcon,
    Users,
    CheckCircle2,
    Clock,
    XCircle,
    CalendarOff,
} from "lucide-react";
import { toast } from "sonner";
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfYear,
    endOfYear,
} from "date-fns";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { Skeleton } from "@/components/ui/skeleton";

const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "present", label: "Present", color: "text-green-600" },
    { value: "absent", label: "Absent", color: "text-red-600" },
    { value: "late", label: "Late", color: "text-yellow-600" },
    { value: "half_day", label: "Half Day", color: "text-orange-600" },
    { value: "early_exit", label: "Early Exit", color: "text-purple-600" },
    { value: "on_leave", label: "On Leave", color: "text-blue-600" },
    { value: "weekend", label: "Weekend", color: "text-gray-600" },
    { value: "holiday", label: "Holiday", color: "text-pink-600" },
];

const FILTER_TYPES = {
    ALL: "all",
    TODAY: "today",
    WEEKLY: "weekly",
    MONTHLY: "monthly",
    YEARLY: "yearly",
    CUSTOM: "custom",
};

const MONTHS = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
];

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
const perPageOptions = [10, 20, 50, 100];

export default function AttendancePage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const tabParam = searchParams.get("tab") || "attendance";
    const activeTab = tabParam;

    const { data: session } = useSession();
    const role = session?.user?.role;

    const updateUrl = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set(key, value);
        router.push(`${pathname}?${params.toString()}`);
    };

    // UI State
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [searchTerm, setSearchTerm] = useState("");

    // Filter State
    const [filterType, setFilterType] = useState(FILTER_TYPES.TODAY);
    const [selectedMonth, setSelectedMonth] = useState(
        new Date().getMonth() + 1,
    );
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [dateRange, setDateRange] = useState<DateRange | undefined>(
        undefined,
    );
    const [statusFilter, setStatusFilter] = useState("all");

    // Computed Filters for API
    const [apiFilters, setApiFilters] = useState({
        startDate: "",
        endDate: "",
        search: "",
        status: "",
    });

    // Update API filters when UI state changes
    useEffect(() => {
        let start = "";
        let end = "";

        const now = new Date();

        switch (filterType) {
            case FILTER_TYPES.TODAY:
                start = format(now, "yyyy-MM-dd");
                end = format(now, "yyyy-MM-dd");
                break;
            case FILTER_TYPES.WEEKLY:
                const wStart = new Date(now);
                wStart.setDate(wStart.getDate() - 7);
                start = format(wStart, "yyyy-MM-dd");
                end = format(now, "yyyy-MM-dd");
                break;
            case FILTER_TYPES.MONTHLY:
                const mStart = startOfMonth(
                    new Date(selectedYear, selectedMonth - 1),
                );
                const mEnd = endOfMonth(
                    new Date(selectedYear, selectedMonth - 1),
                );
                start = format(mStart, "yyyy-MM-dd");
                end = format(mEnd, "yyyy-MM-dd");
                break;
            case FILTER_TYPES.YEARLY:
                const yStart = startOfYear(new Date(selectedYear, 0));
                const yEnd = endOfYear(new Date(selectedYear, 0));
                start = format(yStart, "yyyy-MM-dd");
                end = format(yEnd, "yyyy-MM-dd");
                break;
            case FILTER_TYPES.CUSTOM:
                if (dateRange && dateRange.from)
                    start = format(dateRange.from, "yyyy-MM-dd");
                if (dateRange && dateRange.to)
                    end = format(dateRange.to, "yyyy-MM-dd");
                break;
        }

        // Debounce search
        const timeoutId = setTimeout(() => {
            setApiFilters({
                startDate: start,
                endDate: end,
                search: searchTerm,
                status: statusFilter === "all" ? "" : statusFilter,
            });
            setPage(1); // Reset page on filter change
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [
        filterType,
        selectedMonth,
        selectedYear,
        dateRange,
        searchTerm,
        statusFilter,
    ]);

    const { data, isLoading, isFetching } = useGetAllAttendanceQuery({
        ...apiFilters,
        page,
        limit,
    });

    const [updateStatus] = useUpdateAttendanceStatusMutation();

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            await updateStatus({ id, status: newStatus }).unwrap();
            toast.success("Attendance status updated successfully");
        } catch (error: unknown) {
            const apiError = error as { data?: { message?: string } };
            toast.error(apiError?.data?.message || "Failed to update status");
        }
    };

    const records = data?.data?.records || [];
    const pagination = data?.data?.pagination;
    const stats: Record<string, number> = data?.data?.stats || {};

    return (
        <div className="p-6 space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text">
                    Attendance & Overtime
                </h2>
                <p className="text-muted-foreground mt-1">
                    Track staff attendance, overtime, check-ins, and daily
                    status.
                </p>
            </div>

            <Tabs
                value={activeTab}
                onValueChange={(val) => updateUrl("tab", val)}
                className="w-full"
            >
                <TabsList className="grid w-full md:w-[400px] grid-cols-2 mb-6">
                    <TabsTrigger value="attendance">Attendance</TabsTrigger>
                    <TabsTrigger value="overtime">Overtime</TabsTrigger>
                </TabsList>

                <TabsContent value="attendance" className="mt-0 space-y-6">
                    {/* Statistics Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {/* Total Card */}
                        <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-slate-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-slate-500/5 hover:border-slate-500/30">
                            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-slate-500/10 blur-2xl transition-all duration-300 group-hover:bg-slate-500/20" />
                            <div className="relative">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/10 text-slate-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-slate-500/20">
                                        <Users className="h-5 w-5" />
                                    </div>
                                </div>
                                {isLoading || isFetching ? (
                                    <Skeleton className="h-8 w-20" />
                                ) : (
                                    <h3 className="text-3xl font-bold tracking-tight text-slate-600 dark:text-slate-300">
                                        {stats.total || 0}
                                    </h3>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                    Total Records
                                </p>
                            </div>
                        </div>

                        {/* Present Card */}
                        <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-green-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/5 hover:border-green-500/30">
                            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-green-500/10 blur-2xl transition-all duration-300 group-hover:bg-green-500/20" />
                            <div className="relative">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-green-500/20">
                                        <CheckCircle2 className="h-5 w-5" />
                                    </div>
                                </div>
                                {isLoading || isFetching ? (
                                    <Skeleton className="h-8 w-20" />
                                ) : (
                                    <h3 className="text-3xl font-bold tracking-tight text-green-600 dark:text-green-400">
                                        {stats.present || 0}
                                    </h3>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                    Present
                                </p>
                            </div>
                        </div>

                        {/* Late Card */}
                        <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-yellow-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/5 hover:border-yellow-500/30">
                            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-yellow-500/10 blur-2xl transition-all duration-300 group-hover:bg-yellow-500/20" />
                            <div className="relative">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-yellow-500/20">
                                        <Clock className="h-5 w-5" />
                                    </div>
                                </div>
                                {isLoading || isFetching ? (
                                    <Skeleton className="h-8 w-20" />
                                ) : (
                                    <h3 className="text-3xl font-bold tracking-tight text-yellow-600 dark:text-yellow-400">
                                        {stats.late || 0}
                                    </h3>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                    Late
                                </p>
                            </div>
                        </div>

                        {/* Absent Card */}
                        <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-red-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-red-500/5 hover:border-red-500/30">
                            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-red-500/10 blur-2xl transition-all duration-300 group-hover:bg-red-500/20" />
                            <div className="relative">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-red-500/20">
                                        <XCircle className="h-5 w-5" />
                                    </div>
                                </div>
                                {isLoading || isFetching ? (
                                    <Skeleton className="h-8 w-20" />
                                ) : (
                                    <h3 className="text-3xl font-bold tracking-tight text-red-600 dark:text-red-400">
                                        {stats.absent || 0}
                                    </h3>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                    Absent
                                </p>
                            </div>
                        </div>

                        {/* On Leave Card */}
                        <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-blue-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-500/30">
                            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-blue-500/10 blur-2xl transition-all duration-300 group-hover:bg-blue-500/20" />
                            <div className="relative">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-500/20">
                                        <CalendarOff className="h-5 w-5" />
                                    </div>
                                </div>
                                {isLoading || isFetching ? (
                                    <Skeleton className="h-8 w-20" />
                                ) : (
                                    <h3 className="text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                                        {stats.on_leave || 0}
                                    </h3>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                    On Leave
                                </p>
                            </div>
                        </div>
                    </div>

                    <Card className="border-border/60 shadow-md">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-xl">
                                Attendance Records
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Filters Toolbar */}
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col xl:flex-row gap-4 justify-between bg-muted/30 p-4 rounded-lg border border-border/50">
                                    <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
                                        <div className="relative w-full sm:w-72">
                                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Search by staff name..."
                                                className="pl-8 bg-background/60"
                                                value={searchTerm}
                                                onChange={(e) =>
                                                    setSearchTerm(
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </div>

                                        <Select
                                            value={limit.toString()}
                                            onValueChange={(value) => {
                                                setLimit(parseInt(value));
                                                setPage(1);
                                            }}
                                        >
                                            <SelectTrigger className="w-auto whitespace-nowrap bg-background/60">
                                                <SelectValue placeholder="Limit" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {perPageOptions.map(
                                                    (option) => (
                                                        <SelectItem
                                                            key={option}
                                                            value={option.toString()}
                                                        >
                                                            {option}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex gap-2 items-center flex-wrap">
                                        <Select
                                            value={filterType}
                                            onValueChange={setFilterType}
                                        >
                                            <SelectTrigger className="w-auto bg-background/60">
                                                <SelectValue placeholder="Date Options" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem
                                                    value={FILTER_TYPES.ALL}
                                                >
                                                    All Time
                                                </SelectItem>
                                                <SelectItem
                                                    value={FILTER_TYPES.TODAY}
                                                >
                                                    Today
                                                </SelectItem>
                                                <SelectItem
                                                    value={FILTER_TYPES.WEEKLY}
                                                >
                                                    Weekly
                                                </SelectItem>
                                                <SelectItem
                                                    value={FILTER_TYPES.MONTHLY}
                                                >
                                                    Monthly
                                                </SelectItem>
                                                <SelectItem
                                                    value={FILTER_TYPES.YEARLY}
                                                >
                                                    Yearly
                                                </SelectItem>
                                                <SelectItem
                                                    value={FILTER_TYPES.CUSTOM}
                                                >
                                                    Custom Range
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>

                                        {filterType ===
                                            FILTER_TYPES.MONTHLY && (
                                            <>
                                                <Select
                                                    value={selectedMonth.toString()}
                                                    onValueChange={(v) =>
                                                        setSelectedMonth(
                                                            Number(v),
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger className="w-auto bg-background/60">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {MONTHS.map((m) => (
                                                            <SelectItem
                                                                key={m.value}
                                                                value={m.value.toString()}
                                                            >
                                                                {m.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Select
                                                    value={selectedYear.toString()}
                                                    onValueChange={(v) =>
                                                        setSelectedYear(
                                                            Number(v),
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger className="w-auto bg-background/60">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {YEARS.map((y) => (
                                                            <SelectItem
                                                                key={y}
                                                                value={y.toString()}
                                                            >
                                                                {y}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </>
                                        )}

                                        {filterType === FILTER_TYPES.YEARLY && (
                                            <Select
                                                value={selectedYear.toString()}
                                                onValueChange={(v) =>
                                                    setSelectedYear(Number(v))
                                                }
                                            >
                                                <SelectTrigger className="w-auto bg-background/60">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {YEARS.map((y) => (
                                                        <SelectItem
                                                            key={y}
                                                            value={y.toString()}
                                                        >
                                                            {y}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}

                                        {filterType === FILTER_TYPES.CUSTOM && (
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        id="date"
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-[240px] justify-start text-left font-normal bg-background/60",
                                                            !dateRange?.from &&
                                                                "text-muted-foreground",
                                                        )}
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {dateRange?.from ? (
                                                            dateRange.to ? (
                                                                <>
                                                                    {format(
                                                                        dateRange.from,
                                                                        "LLL dd, y",
                                                                    )}{" "}
                                                                    -{" "}
                                                                    {format(
                                                                        dateRange.to,
                                                                        "LLL dd, y",
                                                                    )}
                                                                </>
                                                            ) : (
                                                                format(
                                                                    dateRange.from,
                                                                    "LLL dd, y",
                                                                )
                                                            )
                                                        ) : (
                                                            <span>
                                                                Pick a date
                                                            </span>
                                                        )}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent
                                                    className="w-auto p-0"
                                                    align="end"
                                                >
                                                    <Calendar
                                                        initialFocus
                                                        mode="range"
                                                        defaultMonth={
                                                            dateRange?.from
                                                        }
                                                        selected={dateRange}
                                                        onSelect={setDateRange}
                                                        numberOfMonths={2}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        )}

                                        {(searchTerm ||
                                            filterType !==
                                                FILTER_TYPES.TODAY) && (
                                            <Button
                                                variant="secondary"
                                                onClick={() => {
                                                    setSearchTerm("");
                                                    setFilterType(
                                                        FILTER_TYPES.TODAY,
                                                    );
                                                    setDateRange({
                                                        from: undefined,
                                                        to: undefined,
                                                    });
                                                }}
                                            >
                                                Clear Filters
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Status Tabs */}
                                <div className="w-full overflow-x-auto pb-2">
                                    <Tabs
                                        value={statusFilter}
                                        onValueChange={(val) => {
                                            setStatusFilter(val);
                                            setPage(1);
                                        }}
                                        className="w-full"
                                    >
                                        <TabsList className="h-10 bg-muted/50 p-1 w-max">
                                            {statusOptions.map((status) => {
                                                // Find count from stats (if 'all', use total)
                                                const count =
                                                    status.value === "all"
                                                        ? stats.total || 0
                                                        : stats[status.value] ||
                                                          0;

                                                return (
                                                    <TabsTrigger
                                                        key={status.value}
                                                        value={status.value}
                                                        className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 gap-2 text-sm"
                                                    >
                                                        {status.label}
                                                        <Badge
                                                            variant="secondary"
                                                            className="font-mono text-[10px] px-1.5 py-0 h-4 bg-muted-foreground/10"
                                                        >
                                                            {count}
                                                        </Badge>
                                                    </TabsTrigger>
                                                );
                                            })}
                                        </TabsList>
                                    </Tabs>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="border rounded-lg overflow-hidden border-border/60">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40 hover:bg-muted/40 border-b-border/60">
                                            <TableHead className="font-semibold">
                                                Employee ID
                                            </TableHead>
                                            <TableHead className="font-semibold">
                                                Name
                                            </TableHead>
                                            <TableHead className="font-semibold">
                                                Shift
                                            </TableHead>
                                            <TableHead className="font-semibold">
                                                Branch
                                            </TableHead>
                                            <TableHead className="font-semibold">
                                                Date
                                            </TableHead>
                                            <TableHead className="font-semibold">
                                                Check In
                                            </TableHead>
                                            <TableHead className="font-semibold">
                                                Check Out
                                            </TableHead>
                                            <TableHead className="font-semibold">
                                                Status
                                            </TableHead>
                                            <TableHead className="text-right font-semibold">
                                                Action
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading || isFetching ? (
                                            Array.from({ length: 10 }).map(
                                                (_, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell>
                                                            <Skeleton className="h-4 w-[80px]" />
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="space-y-2">
                                                                <Skeleton className="h-4 w-[150px]" />
                                                                <Skeleton className="h-3 w-[100px]" />
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Skeleton className="h-4 w-[80px]" />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Skeleton className="h-4 w-[80px]" />
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
                                                            <Skeleton className="h-8 w-[100px] ml-auto" />
                                                        </TableCell>
                                                    </TableRow>
                                                ),
                                            )
                                        ) : records.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={9}
                                                    className="text-center py-16 text-muted-foreground"
                                                >
                                                    <div className="flex flex-col items-center gap-3">
                                                        <Search className="h-10 w-10 text-muted-foreground/30" />
                                                        <p className="text-base font-medium">
                                                            No attendance
                                                            records found
                                                        </p>
                                                        <p className="text-sm">
                                                            Try adjusting your
                                                            filters or date
                                                            range
                                                        </p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            records.map((record: any) => (
                                                <TableRow
                                                    key={record._id}
                                                    className="hover:bg-muted/30"
                                                >
                                                    <TableCell className="font-mono text-sm">
                                                        {record.staffId
                                                            ?.staffId || "-"}
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        <div className="text-sm font-semibold">
                                                            {record.staffId
                                                                ?.name ||
                                                                "Unknown Staff"}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {record.staffId
                                                                ?.designation ||
                                                                "-"}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground text-sm">
                                                        {record.shiftId?.name ||
                                                            "-"}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground text-sm">
                                                        {record.staffId
                                                            ?.branchId?.name ||
                                                            "-"}
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {format(
                                                            new Date(
                                                                record.date,
                                                            ),
                                                            "MMM dd, yyyy",
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-sm font-mono text-muted-foreground">
                                                        {record.checkInAt
                                                            ? format(
                                                                  new Date(
                                                                      record.checkInAt,
                                                                  ),
                                                                  "hh:mm a",
                                                              )
                                                            : "-"}
                                                    </TableCell>
                                                    <TableCell className="text-sm font-mono text-muted-foreground">
                                                        {record.checkOutAt
                                                            ? format(
                                                                  new Date(
                                                                      record.checkOutAt,
                                                                  ),
                                                                  "hh:mm a",
                                                              )
                                                            : "-"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant="outline"
                                                            className={cn(
                                                                "capitalize font-medium shadow-none",
                                                                statusOptions.find(
                                                                    (o) =>
                                                                        o.value ===
                                                                        record.status,
                                                                )?.color,
                                                            )}
                                                        >
                                                            {record.status.replace(
                                                                "_",
                                                                " ",
                                                            )}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Select
                                                            value={
                                                                record.status
                                                            }
                                                            onValueChange={(
                                                                value,
                                                            ) =>
                                                                handleStatusChange(
                                                                    record._id,
                                                                    value,
                                                                )
                                                            }
                                                            disabled={
                                                                isFetching
                                                            }
                                                        >
                                                            <SelectTrigger className="h-8 text-xs font-medium w-[120px] ml-auto">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {statusOptions
                                                                    .filter(
                                                                        (o) =>
                                                                            o.value !==
                                                                            "all",
                                                                    )
                                                                    .map(
                                                                        (
                                                                            option,
                                                                        ) => (
                                                                            <SelectItem
                                                                                key={
                                                                                    option.value
                                                                                }
                                                                                value={
                                                                                    option.value
                                                                                }
                                                                            >
                                                                                {
                                                                                    option.label
                                                                                }
                                                                            </SelectItem>
                                                                        ),
                                                                    )}
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {pagination && (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                                    <p className="text-sm text-muted-foreground">
                                        Showing {(page - 1) * limit + 1} to{" "}
                                        {Math.min(
                                            page * limit,
                                            pagination.total,
                                        )}{" "}
                                        of{" "}
                                        <span className="font-semibold text-foreground">
                                            {pagination.total}
                                        </span>{" "}
                                        entries
                                    </p>

                                    {pagination.pages > 1 && (
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => setPage(1)}
                                                disabled={
                                                    page === 1 || isFetching
                                                }
                                            >
                                                <ChevronsLeft className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() =>
                                                    setPage((p) =>
                                                        Math.max(1, p - 1),
                                                    )
                                                }
                                                disabled={
                                                    page === 1 || isFetching
                                                }
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </Button>

                                            {/* Page Numbers Logic */}
                                            {(() => {
                                                const totalPages =
                                                    pagination.pages;
                                                const pageNumbers: (
                                                    | number
                                                    | string
                                                )[] = [];

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
                                                    } else if (
                                                        page >=
                                                        totalPages - 2
                                                    ) {
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

                                                return pageNumbers.map(
                                                    (num, idx) =>
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
                                                                    setPage(
                                                                        num as number,
                                                                    )
                                                                }
                                                                disabled={
                                                                    isFetching
                                                                }
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
                                                        Math.min(
                                                            pagination.pages,
                                                            p + 1,
                                                        ),
                                                    )
                                                }
                                                disabled={
                                                    page === pagination.pages ||
                                                    isFetching
                                                }
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() =>
                                                    setPage(pagination.pages)
                                                }
                                                disabled={
                                                    page === pagination.pages ||
                                                    isFetching
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
                </TabsContent>

                <TabsContent value="overtime" className="mt-0">
                    {role === Role.STAFF ? <MyOvertime /> : <OvertimeList />}
                </TabsContent>
            </Tabs>
        </div>
    );
}
