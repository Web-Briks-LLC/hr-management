"use client";

import { useState, useMemo } from "react";
import { useSession } from "@/lib/auth-client";
import { Role } from "@/constants/role";
import { useGetAllBranchesQuery } from "@/redux/features/branch/branchApi";
import { useGetUnifiedTransactionsQuery } from "@/redux/features/transaction/transactionApi";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
    Loader,
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Download,
    RefreshCcw,
    Filter,
    ArrowUpRight,
    ArrowDownRight,
    TrendingUp,
    TrendingDown,
    BookOpen,
    Wallet,
    Search,
    Lock,
    ShieldAlert,
    Check,
} from "lucide-react";
import { IconFileExcel } from "@tabler/icons-react";
import * as XLSX from "xlsx";
import { INormalizedTransaction } from "@/types/transaction.type";

const TRANSACTION_TYPES = [
    { value: "earning", label: "Revenue Earning" },
    { value: "expense", label: "Expense Payout" },
    { value: "debit", label: "Debit (Borrow/Return)" },
    { value: "wallet", label: "Wallet Withdrawal" },
    { value: "profit_share", label: "Profit Distribution" },
    { value: "profit_transfer", label: "Profit Transfer" },
];

export default function TransactionsClient() {
    const { data: session, isPending: sessionLoading } = useSession();

    // 1. Filter States
    const [search, setSearch] = useState("");
    const [branchFilter, setBranchFilter] = useState("all");
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });

    // 2. Pagination States
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Role verification
    const isAuthorized = useMemo(() => {
        if (!session?.user) return false;
        return [Role.SUPER_ADMIN, Role.ADMIN].includes(session.user.role as Role);
    }, [session]);

    // Fetch branches for filter dropdown
    const { data: branchesData } = useGetAllBranchesQuery(undefined, {
        skip: !isAuthorized,
    });
    const branches = branchesData?.branches || [];

    // Parse API query params
    const queryParams = useMemo(() => {
        const params: any = {};
        if (search) params.search = search;
        if (branchFilter !== "all") params.branchId = branchFilter;
        if (dateRange.from) {
            params.startDate = format(dateRange.from, "yyyy-MM-dd");
        }
        if (dateRange.to) {
            params.endDate = format(dateRange.to, "yyyy-MM-dd");
        }
        if (selectedTypes.length > 0) {
            params.type = selectedTypes.join(",");
        }
        return params;
    }, [search, branchFilter, dateRange, selectedTypes]);

    // Fetch ledger data using RTK Query
    const {
        data: apiResponse,
        isLoading,
        isFetching,
        refetch,
    } = useGetUnifiedTransactionsQuery(queryParams, {
        skip: !isAuthorized,
    });

    const reportData = apiResponse?.data;
    const summary = reportData?.summary || {
        openingBalance: 0,
        totalInflow: 0,
        totalOutflow: 0,
        netChange: 0,
        closingBalance: 0,
    };
    const transactions = reportData?.transactions || [];

    // Client-side pagination logic
    const paginatedTransactions = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        return transactions.slice(startIndex, startIndex + pageSize);
    }, [transactions, currentPage, pageSize]);

    const totalPages = Math.ceil(transactions.length / pageSize) || 1;

    // Currency Formatter
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "BDT",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount || 0);
    };

    // Date formatter helper
    const formatDateTime = (dateStr: string | Date) => {
        try {
            return format(new Date(dateStr), "dd MMM yyyy hh:mm a");
        } catch (e) {
            return String(dateStr);
        }
    };

    // Toggle Type Filters
    const handleTypeToggle = (typeVal: string) => {
        setCurrentPage(1);
        setSelectedTypes(prev =>
            prev.includes(typeVal)
                ? prev.filter(t => t !== typeVal)
                : [...prev, typeVal]
        );
    };

    const handleClearTypes = () => {
        setCurrentPage(1);
        setSelectedTypes([]);
    };

    const handleSelectAllTypes = () => {
        setCurrentPage(1);
        setSelectedTypes(TRANSACTION_TYPES.map(t => t.value));
    };

    // PDF head-less Puppeteer download
    const handleExportPDF = () => {
        const baseUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/transactions/export-pdf`;
        const query = new URLSearchParams();

        if (queryParams.startDate) query.append("startDate", queryParams.startDate);
        if (queryParams.endDate) query.append("endDate", queryParams.endDate);
        if (queryParams.type) query.append("type", queryParams.type);
        if (queryParams.search) query.append("search", queryParams.search);
        if (queryParams.branchId) query.append("branchId", queryParams.branchId);

        const downloadUrl = `${baseUrl}?${query.toString()}`;
        window.open(downloadUrl, "_blank");
        toast.success("Initiating backend Puppeteer A4 PDF compile...");
    };

    // Client-side Excel export
    const handleExportExcel = () => {
        if (transactions.length === 0) {
            toast.error("No transactions found to export");
            return;
        }

        const excelRows = transactions.map((tx, idx) => ({
            "Sl No": idx + 1,
            "Date": formatDateTime(tx.date),
            "Title / Description": tx.title,
            "Type": tx.type.toUpperCase().replace("_", " "),
            "Direction": tx.flow.toUpperCase(),
            "Amount (BDT)": tx.amountInBDT,
            "Running Balance (BDT)": tx.runningBalance || 0,
            "Reference Notes": tx.note || "",
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Unified Ledger");

        // Set column widths
        worksheet["!cols"] = [
            { wch: 8 },
            { wch: 22 },
            { wch: 45 },
            { wch: 18 },
            { wch: 12 },
            { wch: 18 },
            { wch: 22 },
            { wch: 35 },
        ];

        const startStr = queryParams.startDate || "Beginning";
        const endStr = queryParams.endDate || format(new Date(), "yyyy-MM-dd");

        XLSX.writeFile(workbook, `Unified_Transaction_Ledger_${startStr}_to_${endStr}.xlsx`);
        toast.success("Excel ledger downloaded successfully!");
    };

    // Render Section: Guard / Auth Loading
    if (sessionLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="flex justify-between items-center">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-96" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-28 rounded-2xl" />
                    ))}
                </div>
                <Skeleton className="h-96 rounded-xl" />
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
                <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-rose-500/10 via-card to-card p-10 max-w-md shadow-xl border-rose-500/20">
                    <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-rose-500/10 blur-2xl transition-all duration-300" />
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 mx-auto mb-6">
                        <Lock className="h-8 w-8" />
                    </div>
                    <h3 className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 mb-2">
                        Access Restricted
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">
                        Only account administrators and super-administrators have permission to view the central transaction ledger.
                    </p>
                    <div className="flex items-center gap-2 justify-center text-xs text-rose-500/70">
                        <ShieldAlert className="h-4 w-4" />
                        <span>Security Audit logged.</span>
                    </div>
                </div>
            </div>
        );
    }

    // Colors & Badges logic for normalizers
    const getTypeBadgeStyle = (type: string) => {
        switch (type) {
            case "earning":
                return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
            case "expense":
                return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
            case "debit":
                return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
            case "wallet":
                return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
            case "profit_share":
                return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
            case "profit_transfer":
                return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
            default:
                return "bg-slate-500/10 text-slate-600 border-slate-500/20";
        }
    };

    const getTypeLabel = (type: string) => {
        return type.toUpperCase().replace("_", " ");
    };

    return (
        <div className="space-y-6">
            {/* Top Title Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Unified Transaction Ledger</h2>
                    <p className="text-muted-foreground mt-1">
                        Chronological cash book mapping revenues, expenses, borrows, payouts, and transfers with real-time balance tracking.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => refetch()}
                        disabled={isLoading || isFetching}
                        className="bg-background/60 hover:bg-background h-10 w-10 shadow-xs"
                    >
                        <RefreshCcw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                    </Button>
                    <Button
                        onClick={handleExportExcel}
                        variant="outline"
                        disabled={isLoading || transactions.length === 0}
                        className="font-semibold shadow-xs"
                    >
                        <IconFileExcel className="mr-2 h-4 w-4 text-emerald-600" />
                        Export Excel
                    </Button>
                    <Button
                        onClick={handleExportPDF}
                        disabled={isLoading || transactions.length === 0}
                        className="font-semibold shadow-md shadow-primary/10"
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Export PDF
                    </Button>
                </div>
            </div>

            {/* Premium KPI Glassmorphic Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {/* 1. Opening Balance */}
                <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-slate-500/5 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:border-slate-500/30">
                    <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-slate-500/5 blur-2xl group-hover:bg-slate-500/10" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/10 text-slate-500 dark:text-slate-400">
                                <BookOpen className="h-5 w-5" />
                            </div>
                        </div>
                        {isLoading ? (
                            <Skeleton className="h-8 w-28" />
                        ) : (
                            <h3 className="text-2xl font-bold tracking-tight text-slate-600 dark:text-slate-400">
                                {formatCurrency(summary.openingBalance)}
                            </h3>
                        )}
                        <p className="text-xs text-muted-foreground mt-2 font-medium">Opening Balance</p>
                    </div>
                </div>

                {/* 2. Total Inflow */}
                <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-emerald-500/5 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:border-emerald-500/30 hover:shadow-emerald-500/5">
                    <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-emerald-500/5 blur-2xl group-hover:bg-emerald-500/10" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                                <ArrowUpRight className="h-5 w-5" />
                            </div>
                        </div>
                        {isLoading ? (
                            <Skeleton className="h-8 w-28" />
                        ) : (
                            <h3 className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                                + {formatCurrency(summary.totalInflow)}
                            </h3>
                        )}
                        <p className="text-xs text-muted-foreground mt-2 font-medium">Total Inflows</p>
                    </div>
                </div>

                {/* 3. Total Outflow */}
                <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-rose-500/5 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:border-rose-500/30 hover:shadow-rose-500/5">
                    <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-rose-500/5 blur-2xl group-hover:bg-rose-500/10" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
                                <ArrowDownRight className="h-5 w-5" />
                            </div>
                        </div>
                        {isLoading ? (
                            <Skeleton className="h-8 w-28" />
                        ) : (
                            <h3 className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
                                - {formatCurrency(summary.totalOutflow)}
                            </h3>
                        )}
                        <p className="text-xs text-muted-foreground mt-2 font-medium">Total Outflows</p>
                    </div>
                </div>

                {/* 4. Net Change */}
                <div className={`group relative overflow-hidden rounded-2xl border bg-linear-to-br p-5 transition-all duration-300 hover:shadow-xl ${
                    summary.netChange >= 0
                        ? "from-blue-500/5 via-card to-card hover:border-blue-500/30 hover:shadow-blue-500/5"
                        : "from-amber-500/5 via-card to-card hover:border-amber-500/30 hover:shadow-amber-500/5"
                }`}>
                    <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-blue-500/5 blur-2xl group-hover:bg-blue-500/10" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-2">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                                summary.netChange >= 0 ? "bg-blue-500/10 text-blue-500" : "bg-amber-500/10 text-amber-500"
                            }`}>
                                {summary.netChange >= 0 ? (
                                    <TrendingUp className="h-5 w-5" />
                                ) : (
                                    <TrendingDown className="h-5 w-5" />
                                )}
                            </div>
                        </div>
                        {isLoading ? (
                            <Skeleton className="h-8 w-28" />
                        ) : (
                            <h3 className={`text-2xl font-bold tracking-tight ${
                                summary.netChange >= 0 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"
                            }`}>
                                {summary.netChange >= 0 ? "+" : ""} {formatCurrency(summary.netChange)}
                            </h3>
                        )}
                        <p className="text-xs text-muted-foreground mt-2 font-medium">Net Cash Flow</p>
                    </div>
                </div>

                {/* 5. Closing Balance */}
                <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-violet-500/5 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:border-violet-500/30 hover:shadow-violet-500/5">
                    <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-violet-500/5 blur-2xl group-hover:bg-violet-500/10" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
                                <Wallet className="h-5 w-5" />
                            </div>
                        </div>
                        {isLoading ? (
                            <Skeleton className="h-8 w-28" />
                        ) : (
                            <h3 className="text-2xl font-bold tracking-tight text-violet-600 dark:text-violet-400">
                                {formatCurrency(summary.closingBalance)}
                            </h3>
                        )}
                        <p className="text-xs text-muted-foreground mt-2 font-medium">Closing Balance</p>
                    </div>
                </div>
            </div>

            {/* Central Filter Toolbar Card */}
            <Card className="shadow-xs border-border/50">
                <CardContent className="p-4 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                            <div className="bg-primary/10 p-2 rounded-xl text-primary">
                                <Filter className="h-4 w-4" />
                            </div>
                            <span>Quick Filters:</span>
                        </div>

                        {/* A. Search description */}
                        <div className="relative max-w-[240px] w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search note/description..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="pl-9 h-10 bg-background/60"
                            />
                        </div>

                        {/* B. Date range popover */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-[280px] h-10 bg-background/60 justify-start text-left font-normal text-sm border-dashed shadow-xs"
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                    {dateRange.from ? (
                                        dateRange.to ? (
                                            <>
                                                {format(dateRange.from, "dd MMM yyyy")} -{" "}
                                                {format(dateRange.to, "dd MMM yyyy")}
                                            </>
                                        ) : (
                                            format(dateRange.from, "PPP")
                                        )
                                    ) : (
                                        <span>Pick ledger range</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    selected={{
                                        from: dateRange.from,
                                        to: dateRange.to,
                                    }}
                                    onSelect={(range) => {
                                        setDateRange({
                                            from: range?.from,
                                            to: range?.to,
                                        });
                                        setCurrentPage(1);
                                    }}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>

                        {/* C. Branch select filter (for expense payouts) */}
                        <Select
                            value={branchFilter}
                            onValueChange={(val) => {
                                setBranchFilter(val);
                                setCurrentPage(1);
                            }}
                        >
                            <SelectTrigger className="w-[180px] h-10 bg-background/60 text-sm font-medium">
                                <SelectValue placeholder="All Branches" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="font-medium">Global (All Branches)</SelectItem>
                                {branches.map((b: any) => (
                                    <SelectItem key={b._id} value={b._id} className="font-medium">
                                        {b.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* D. Type filter Popover (Custom Multi-select) */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="h-10 bg-background/60 text-sm font-medium border-dashed shadow-xs"
                                >
                                    Filter Types
                                    {selectedTypes.length > 0 ? (
                                        <Badge className="ml-2 bg-primary/20 text-primary border-primary/20 hover:bg-primary/20 shadow-none font-semibold text-[10px] px-1.5 py-0.5 rounded-full">
                                            {selectedTypes.length}
                                        </Badge>
                                    ) : (
                                        <span className="ml-2 text-xs text-muted-foreground font-normal">All</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-3 space-y-3" align="start">
                                <div className="flex justify-between items-center border-b pb-2">
                                    <span className="text-xs font-bold text-muted-foreground">Transaction Types</span>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleSelectAllTypes}
                                            className="h-6 px-1.5 text-[10px] text-primary hover:bg-primary/5 font-semibold"
                                        >
                                            Select All
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleClearTypes}
                                            className="h-6 px-1.5 text-[10px] text-destructive hover:bg-destructive/5 font-semibold"
                                        >
                                            Clear
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2 max-h-56 overflow-y-auto">
                                    {TRANSACTION_TYPES.map((t) => {
                                        const checked = selectedTypes.includes(t.value);
                                        return (
                                            <div
                                                key={t.value}
                                                className="flex items-center space-x-2 rounded-md hover:bg-muted/50 p-1 cursor-pointer transition-colors"
                                                onClick={() => handleTypeToggle(t.value)}
                                            >
                                                <Checkbox
                                                    checked={checked}
                                                    onCheckedChange={() => {}} // Handled by div onClick
                                                    className="pointer-events-none"
                                                />
                                                <Label className="text-xs font-medium cursor-pointer flex-1">
                                                    {t.label}
                                                </Label>
                                            </div>
                                        );
                                    })}
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* Reset filters button */}
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setSearch("");
                                setBranchFilter("all");
                                setSelectedTypes([]);
                                setDateRange({
                                    from: startOfMonth(new Date()),
                                    to: endOfMonth(new Date()),
                                });
                                setCurrentPage(1);
                                toast.success("Filters reset to default!");
                            }}
                            className="text-xs text-muted-foreground font-semibold hover:text-foreground h-10 ml-auto"
                        >
                            Reset
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Unified Transactions Table Card */}
            <Card className="shadow-xs border-border/50">
                <CardHeader className="pb-3 border-b border-border/50">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div>
                            <CardTitle className="text-lg font-bold">Ledger Book</CardTitle>
                            <CardDescription>
                                Consolidated chronological transactions within selected period.
                            </CardDescription>
                        </div>
                        <div className="text-sm font-semibold text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-xl border border-border/40">
                            Total Records: <span className="text-foreground">{transactions.length}</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="w-[180px] font-semibold text-center border-r">Date & Time</TableHead>
                                    <TableHead className="w-[320px] font-semibold border-r">Transaction Details</TableHead>
                                    <TableHead className="w-[140px] font-semibold border-r">Type</TableHead>
                                    <TableHead className="w-[130px] font-semibold text-center border-r">Direction</TableHead>
                                    <TableHead className="w-[180px] font-semibold text-right border-r">Amount</TableHead>
                                    <TableHead className="w-[200px] font-semibold text-right border-r">Running Balance</TableHead>
                                    <TableHead className="w-[160px] font-semibold">Creator</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    [...Array(6)].map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="border-r"><Skeleton className="h-4 w-32 mx-auto" /></TableCell>
                                            <TableCell className="border-r">
                                                <Skeleton className="h-4 w-48 mb-2" />
                                                <Skeleton className="h-3 w-36" />
                                            </TableCell>
                                            <TableCell className="border-r"><Skeleton className="h-6 w-24" /></TableCell>
                                            <TableCell className="border-r"><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                                            <TableCell className="border-r"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                                            <TableCell className="border-r"><Skeleton className="h-4 w-28 ml-auto" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : transactions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-36 text-center text-muted-foreground font-medium text-sm">
                                            No transaction records found for the selected parameters.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedTransactions.map((tx: INormalizedTransaction) => {
                                        const isInflow = tx.flow === "inflow";
                                        return (
                                            <TableRow key={tx.id} className="hover:bg-muted/20 transition-colors">
                                                {/* 1. Date & Time */}
                                                <TableCell className="border-r text-center text-xs font-semibold text-muted-foreground bg-muted/5">
                                                    {formatDateTime(tx.date)}
                                                </TableCell>

                                                {/* 2. Details */}
                                                <TableCell className="border-r font-medium">
                                                    <div className="text-sm font-bold text-foreground">{tx.title}</div>
                                                    {tx.note && (
                                                        <div className="text-xs text-muted-foreground mt-1 max-w-[300px] break-words italic line-clamp-2">
                                                            {tx.note}
                                                        </div>
                                                    )}
                                                </TableCell>

                                                {/* 3. Type badge */}
                                                <TableCell className="border-r">
                                                    <Badge variant="outline" className={`font-bold text-[10px] px-2 py-0.5 shadow-none tracking-wide ${getTypeBadgeStyle(tx.type)}`}>
                                                        {getTypeLabel(tx.type)}
                                                    </Badge>
                                                </TableCell>

                                                {/* 4. Direction flow badge */}
                                                <TableCell className="border-r text-center">
                                                    {isInflow ? (
                                                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold text-[10px] py-0.5 px-2 shadow-none">
                                                            INFLOW
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 font-bold text-[10px] py-0.5 px-2 shadow-none">
                                                            OUTFLOW
                                                        </Badge>
                                                    )}
                                                </TableCell>

                                                {/* 5. Amount */}
                                                <TableCell className="border-r text-right font-bold text-sm bg-muted/5">
                                                    <span className={isInflow ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                                                        {isInflow ? "+" : "-"} {formatCurrency(tx.amountInBDT)}
                                                    </span>
                                                </TableCell>

                                                {/* 6. Running Balance */}
                                                <TableCell className="border-r text-right font-black text-sm text-foreground bg-primary/5">
                                                    {formatCurrency(tx.runningBalance || 0)}
                                                </TableCell>

                                                {/* 7. CreatedBy */}
                                                <TableCell className="text-xs font-semibold text-muted-foreground">
                                                    {typeof tx.createdBy === "object" ? tx.createdBy.name : tx.createdBy || "System"}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination Bar */}
                    {transactions.length > 0 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-border/50 gap-4">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Showing <span className="text-foreground font-bold">{(currentPage - 1) * pageSize + 1}</span> to{" "}
                                <span className="text-foreground font-bold">
                                    {Math.min(currentPage * pageSize, transactions.length)}
                                </span>{" "}
                                of <span className="text-foreground font-bold">{transactions.length}</span> entries
                            </span>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage === 1 || isLoading}
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    className="h-8 text-xs font-bold shadow-xs"
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    Previous
                                </Button>
                                <div className="flex items-center text-xs font-bold px-3 py-1 bg-muted/50 rounded-lg border">
                                    Page {currentPage} of {totalPages}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage === totalPages || isLoading}
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    className="h-8 text-xs font-bold shadow-xs"
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
