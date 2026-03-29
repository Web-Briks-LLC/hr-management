"use client";

import { useState, useEffect } from "react";
import {
    useGetAllAttendanceQuery,
    useUpdateAttendanceStatusMutation,
} from "@/redux/features/attendance/attendanceApi";
import { AttendanceStatus } from "@/types/attendance.type";
import { useGetStaffsQuery } from "@/redux/features/staff/staffApi";
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
    UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfYear,
    endOfYear,
    startOfWeek,
    endOfWeek,
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

interface IStaffListItem {
    _id: string;
    staffId: string;
    designation: string;
    department: string;
    status: string;
    user?: {
        _id: string;
        name: string;
        email: string;
        image?: string;
        role: string;
    };
}

interface IAttendanceRecord {
    _id: string;
    staffId: {
        _id: string;
        staffId: string;
        name: string;
        designation: string;
        department: string;
        userId: string;
    };
    date: string;
    status: string;
    checkInAt?: string;
    checkOutAt?: string;
}

const statusOptions = [
    {
        value: "all",
        label: "All Status",
        color: "text-green-600",
        tabActive:
            "bg-slate-500/15 border-slate-500/40 text-slate-700 dark:text-slate-300",
        tabBadge: "bg-slate-500/20 text-slate-700 dark:text-slate-300",
    },
    {
        value: "present",
        label: "Present",
        color: "text-green-600",
        tabActive:
            "bg-green-500/15 border-green-500/40 text-green-700 dark:text-green-300",
        tabBadge: "bg-green-500/20 text-green-700 dark:text-green-300",
    },
    {
        value: "absent",
        label: "Absent",
        color: "text-red-600",
        tabActive:
            "bg-red-500/15 border-red-500/40 text-red-700 dark:text-red-300",
        tabBadge: "bg-red-500/20 text-red-700 dark:text-red-300",
    },
    {
        value: "late",
        label: "Late",
        color: "text-yellow-600",
        tabActive:
            "bg-yellow-500/15 border-yellow-500/40 text-yellow-700 dark:text-yellow-300",
        tabBadge: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
    },
    {
        value: "half_day",
        label: "Half Day",
        color: "text-orange-600",
        tabActive:
            "bg-orange-500/15 border-orange-500/40 text-orange-700 dark:text-orange-300",
        tabBadge: "bg-orange-500/20 text-orange-700 dark:text-orange-300",
    },
    {
        value: "early_exit",
        label: "Early Exit",
        color: "text-purple-600",
        tabActive:
            "bg-purple-500/15 border-purple-500/40 text-purple-700 dark:text-purple-300",
        tabBadge: "bg-purple-500/20 text-purple-700 dark:text-purple-300",
    },
    {
        value: "on_leave",
        label: "On Leave",
        color: "text-blue-600",
        tabActive:
            "bg-blue-500/15 border-blue-500/40 text-blue-700 dark:text-blue-300",
        tabBadge: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
    },
    {
        value: "weekend",
        label: "Weekend",
        color: "text-gray-600",
        tabActive:
            "bg-gray-500/15 border-gray-500/40 text-gray-700 dark:text-gray-300",
        tabBadge: "bg-gray-500/20 text-gray-700 dark:text-gray-300",
    },
    {
        value: "holiday",
        label: "Holiday",
        color: "text-pink-600",
        tabActive:
            "bg-pink-500/15 border-pink-500/40 text-pink-700 dark:text-pink-300",
        tabBadge: "bg-pink-500/20 text-pink-700 dark:text-pink-300",
    },
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
                const wStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
                const wEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
                start = format(wStart, "yyyy-MM-dd");
                end = format(wEnd, "yyyy-MM-dd");
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

    const handleStatusChange = async (id: string, newStatus: AttendanceStatus) => {
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

    // Staff queries for the info tabs
    const { data: totalMembersData, isLoading: isTotalLoading } =
        useGetStaffsQuery({
            page: 1,
            limit: 1000,
        });

    const totalMembers =
        totalMembersData?.meta?.total || totalMembersData?.staffs?.length || 0;
    const allStaffs = totalMembersData?.staffs || [];

    // Today's attendance for Checked-in Staffs tab
    const { data: todayAttendanceData, isLoading: isTodayAttendanceLoading } =
        useGetAllAttendanceQuery({
            startDate: format(new Date(), "yyyy-MM-dd"),
            endDate: format(new Date(), "yyyy-MM-dd"),
            limit: 1000,
        });

    const todayRecords = (todayAttendanceData?.data?.records ||
        []) as IAttendanceRecord[];
    const checkedInStaffs = todayRecords.filter((r) => r.checkInAt);
    const checkedInCount = checkedInStaffs.length;

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
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <TabsList className="grid w-full sm:w-[400px] grid-cols-2">
                        <TabsTrigger value="attendance">Attendance</TabsTrigger>
                        <TabsTrigger value="overtime">Overtime</TabsTrigger>
                    </TabsList>
                    <TabsList className="bg-transparent gap-2 h-auto">
                        <TabsTrigger
                            value="total-members"
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-200",
                                activeTab === "total-members"
                                    ? "bg-violet-500/15 border-violet-500/40 text-violet-700 dark:text-violet-300"
                                    : "bg-muted/50 border-border/60 hover:bg-muted",
                            )}
                        >
                            <Users className="h-4 w-4" />
                            Total Members
                            <Badge
                                variant="secondary"
                                className={cn(
                                    "font-mono text-[10px] px-1.5 py-0 h-4",
                                    activeTab === "total-members"
                                        ? "bg-violet-500/20 text-violet-700 dark:text-violet-300"
                                        : "bg-muted-foreground/10",
                                )}
                            >
                                {isTotalLoading ? "..." : totalMembers}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger
                            value="headcount"
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-200",
                                activeTab === "headcount"
                                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                                    : "bg-muted/50 border-border/60 hover:bg-muted",
                            )}
                        >
                            <UserCheck className="h-4 w-4" />
                            Headcount
                            <Badge
                                variant="secondary"
                                className={cn(
                                    "font-mono text-[10px] px-1.5 py-0 h-4",
                                    activeTab === "headcount"
                                        ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                        : "bg-muted-foreground/10",
                                )}
                            >
                                {isTodayAttendanceLoading
                                    ? "..."
                                    : checkedInCount}
                            </Badge>
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="attendance" className="mt-0 space-y-6">
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
                                        <TabsList className="h-auto bg-muted/50 p-1 w-max flex-wrap gap-1">
                                            {statusOptions.map((status) => {
                                                const count =
                                                    status.value === "all"
                                                        ? stats.total || 0
                                                        : stats[status.value] ||
                                                          0;
                                                const isActive =
                                                    statusFilter ===
                                                    status.value;

                                                return (
                                                    <TabsTrigger
                                                        key={status.value}
                                                        value={status.value}
                                                        className={cn(
                                                            "px-4 gap-2 text-sm border border-transparent transition-all duration-200",
                                                            isActive
                                                                ? status.tabActive
                                                                : "data-[state=active]:bg-background data-[state=active]:shadow-sm",
                                                        )}
                                                    >
                                                        {status.label}
                                                        <Badge
                                                            variant="secondary"
                                                            className={cn(
                                                                "font-mono text-[10px] px-1.5 py-0 h-4",
                                                                isActive
                                                                    ? status.tabBadge
                                                                    : "bg-muted-foreground/10",
                                                            )}
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
                                                                    value as AttendanceStatus,
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

                <TabsContent value="total-members" className="mt-0">
                    <Card className="border-border/60 shadow-md">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <Users className="h-5 w-5 text-violet-500" />
                                All Members
                                <Badge
                                    variant="secondary"
                                    className="bg-violet-500/15 text-violet-700 dark:text-violet-300 font-mono"
                                >
                                    {totalMembers}
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-lg overflow-hidden border-border/60">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40 hover:bg-muted/40 border-b-border/60">
                                            <TableHead className="font-semibold">
                                                Staff ID
                                            </TableHead>
                                            <TableHead className="font-semibold">
                                                Name
                                            </TableHead>
                                            <TableHead className="font-semibold">
                                                Email
                                            </TableHead>
                                            <TableHead className="font-semibold">
                                                Designation
                                            </TableHead>
                                            <TableHead className="font-semibold">
                                                Department
                                            </TableHead>
                                            <TableHead className="font-semibold">
                                                Role
                                            </TableHead>
                                            <TableHead className="font-semibold">
                                                Status
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isTotalLoading ? (
                                            Array.from({ length: 5 }).map(
                                                (_, i) => (
                                                    <TableRow key={i}>
                                                        {Array.from({
                                                            length: 7,
                                                        }).map((_, j) => (
                                                            <TableCell key={j}>
                                                                <Skeleton className="h-4 w-[80px]" />
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                ),
                                            )
                                        ) : allStaffs.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={7}
                                                    className="text-center py-16 text-muted-foreground"
                                                >
                                                    <div className="flex flex-col items-center gap-3">
                                                        <Users className="h-10 w-10 text-muted-foreground/30" />
                                                        <p className="text-base font-medium">
                                                            No members found
                                                        </p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            allStaffs.map(
                                                (staff: IStaffListItem) => (
                                                    <TableRow
                                                        key={staff._id}
                                                        className="hover:bg-muted/30"
                                                    >
                                                        <TableCell className="font-mono text-sm">
                                                            {staff.staffId ||
                                                                "-"}
                                                        </TableCell>
                                                        <TableCell className="font-medium">
                                                            <div className="text-sm font-semibold">
                                                                {staff.user
                                                                    ?.name ||
                                                                    "Unknown"}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">
                                                            {staff.user
                                                                ?.email || "-"}
                                                        </TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">
                                                            {staff.designation ||
                                                                "-"}
                                                        </TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">
                                                            {staff.department ||
                                                                "-"}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant="outline"
                                                                className="capitalize font-medium shadow-none"
                                                            >
                                                                {staff.user?.role?.replace(
                                                                    "_",
                                                                    " ",
                                                                ) || "-"}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant="outline"
                                                                className={cn(
                                                                    "capitalize font-medium shadow-none",
                                                                    staff.status ===
                                                                        "active"
                                                                        ? "text-green-600"
                                                                        : staff.status ===
                                                                            "inactive"
                                                                          ? "text-yellow-600"
                                                                          : "text-red-600",
                                                                )}
                                                            >
                                                                {staff.status ||
                                                                    "-"}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ),
                                            )
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="headcount" className="mt-0">
                    <Card className="border-border/60 shadow-md">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <UserCheck className="h-5 w-5 text-emerald-500" />
                                Headcount
                                <Badge
                                    variant="secondary"
                                    className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono"
                                >
                                    {checkedInCount}
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-lg overflow-hidden border-border/60">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40 hover:bg-muted/40 border-b-border/60">
                                            <TableHead className="font-semibold">
                                                Staff ID
                                            </TableHead>
                                            <TableHead className="font-semibold">
                                                Name
                                            </TableHead>
                                            <TableHead className="font-semibold">
                                                Designation
                                            </TableHead>
                                            <TableHead className="font-semibold">
                                                Department
                                            </TableHead>
                                            <TableHead className="font-semibold">
                                                Check In
                                            </TableHead>
                                            <TableHead className="font-semibold">
                                                Status
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isTodayAttendanceLoading ? (
                                            Array.from({ length: 5 }).map(
                                                (_, i) => (
                                                    <TableRow key={i}>
                                                        {Array.from({
                                                            length: 6,
                                                        }).map((_, j) => (
                                                            <TableCell key={j}>
                                                                <Skeleton className="h-4 w-[80px]" />
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                ),
                                            )
                                        ) : checkedInStaffs.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={6}
                                                    className="text-center py-16 text-muted-foreground"
                                                >
                                                    <div className="flex flex-col items-center gap-3">
                                                        <UserCheck className="h-10 w-10 text-muted-foreground/30" />
                                                        <p className="text-base font-medium">
                                                            No one has checked in today yet
                                                        </p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            checkedInStaffs.map(
                                                (record: IAttendanceRecord) => (
                                                    <TableRow
                                                        key={record._id}
                                                        className="hover:bg-muted/30"
                                                    >
                                                        <TableCell className="font-mono text-sm">
                                                            {record.staffId?.staffId ||
                                                                "-"}
                                                        </TableCell>
                                                        <TableCell className="font-medium">
                                                            <div className="text-sm font-semibold">
                                                                {record.staffId?.name ||
                                                                    "Unknown"}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">
                                                            {record.staffId?.designation ||
                                                                "-"}
                                                        </TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">
                                                            {record.staffId?.department ||
                                                                "-"}
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
                                                                {record.status?.replace(
                                                                    "_",
                                                                    " ",
                                                                ) || "-"}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ),
                                            )
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
