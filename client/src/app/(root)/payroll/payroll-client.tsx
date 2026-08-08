"use client";

import { useState } from "react";
import {
    useGetPayrollPreviewQuery,
    useGetLockStatusQuery,
    useLockMonthMutation,
    useUnlockMonthMutation,
} from "@/redux/features/payroll/payrollApi";
import { useGetAllBranchesQuery } from "@/redux/features/branch/branchApi";
import { format } from "date-fns";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PayrollTable from "../../../components/payroll/payroll-table";
import OvertimeTable from "../../../components/payroll/overtime-table";
import ExportPdfDialog from "../../../components/payroll/export-pdf-dialog";
import {
    DollarSign,
    Users,
    Download,
    Filter,
    Wallet,
    CheckCircle2,
    Clock,
    Building2,
    Lock,
    Unlock,
    FileSpreadsheet,
    FileText,
    ShieldCheck,
} from "lucide-react";
import * as XLSX from "xlsx";
import { IPayrollItem } from "@/types/payroll.type";
import { IBranch } from "@/types/branch.type";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

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

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

const TableSkeleton = () => (
    <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[150px]" />
                </div>
                <div className="ml-auto w-1/2 flex gap-4">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                </div>
            </div>
        ))}
    </div>
);

export default function PayrollPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // parsed URL params
    const tabParam = searchParams.get("tab") || "salary";
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");
    const branchParam = searchParams.get("branch") || "all";

    // State (Synced with URL)
    // Default to current month/year if not in URL
    const selectedMonth = monthParam
        ? parseInt(monthParam)
        : new Date().getMonth() + 1;
    const selectedYear = yearParam ? parseInt(yearParam) : currentYear;
    const branchId = branchParam;
    const activeTab = tabParam;

    const [isSelectMode, setIsSelectMode] = useState(false);
    const [showPdfDialog, setShowPdfDialog] = useState(false);

    const { data: session } = useSession();
    const userRole = session?.user?.role;
    const canWrite = ["super_admin", "admin", "hr_manager"].includes(
        userRole || "",
    );

    // Update URL Helper
    const updateUrl = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set(key, value);
        router.push(`${pathname}?${params.toString()}`);
    };

    // Derived Date for API
    const formattedMonth = `${selectedYear}-${selectedMonth.toString().padStart(2, "0")}`;

    // Queries
    const { data: branchesData } = useGetAllBranchesQuery({});
    const branches: IBranch[] = branchesData?.branches || [];

    const { data, isLoading } = useGetPayrollPreviewQuery({
        month: formattedMonth,
        branchId,
    });

    const payrollData = (data?.data?.staffs || []) as IPayrollItem[];
    const alerts = data?.data?.alerts || [];
    const suggestLock = data?.data?.suggestLock || false;

    // Lock status
    const { data: lockData } = useGetLockStatusQuery({
        month: formattedMonth,
    });
    const [lockMonth, { isLoading: isLocking }] = useLockMonthMutation();
    const [unlockMonth, { isLoading: isUnlocking }] = useUnlockMonthMutation();
    const isLocked = lockData?.data?.isLocked ?? false;

    const handleToggleLock = async () => {
        try {
            if (isLocked) {
                await unlockMonth({ month: formattedMonth }).unwrap();
                toast.success("Payroll unlocked");
            } else {
                await lockMonth({ month: formattedMonth }).unwrap();
                toast.success("Payroll locked — no further changes allowed");
            }
        } catch (error) {
            toast.error(
                (error as Error)?.message || "Failed to update lock status",
            );
        }
    };

    // --- Stats Calculation (Context Aware) ---
    // Salary Stats
    const totalSalary = payrollData.reduce(
        (acc, curr) => acc + (curr.payableSalary || 0),
        0,
    );
    const salaryPaid = payrollData
        .filter((i) => i.status === "paid")
        .reduce((acc, curr) => acc + (curr.payableSalary || 0), 0);
    const salaryPending = totalSalary - salaryPaid;
    const salaryPaidCount = payrollData.filter(
        (i) => i.status === "paid",
    ).length;
    const salaryPendingCount = payrollData.length - salaryPaidCount;

    // Overtime Stats
    const totalOvertime = payrollData.reduce(
        (acc, curr) => acc + (curr.otPayable || 0),
        0,
    );
    const overtimePaid = payrollData
        .filter((i) => i.otStatus === "paid")
        .reduce((acc, curr) => acc + (curr.otPaidAmount || 0), 0); // Use otPaidAmount for accuracy
    const overtimePending = totalOvertime - overtimePaid;
    const overtimePaidCount = payrollData.filter(
        (i) => i.otStatus === "paid",
    ).length;
    const overtimePendingCount = payrollData.filter(
        (i) => i.otPayable > 0 && i.otStatus !== "paid",
    ).length;

    // Active Display Stats
    const isOvertimeTab = activeTab === "overtime";

    const displayTotal = isOvertimeTab ? totalOvertime : totalSalary;
    const displayPaid = isOvertimeTab ? overtimePaid : salaryPaid;
    const displayPending = isOvertimeTab ? overtimePending : salaryPending;
    const displayTotalStaff = payrollData.length; // Total staff remains same, or could filter by those having OT

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("bn-BD", {
            style: "currency",
            currency: "BDT",
            maximumFractionDigits: 0,
        }).format(amount);
    };

    // --- Export Handlers ---
    const handleExportExcel = () => {
        if (!payrollData.length) return;

        const [year, monthNum] = formattedMonth.split("-");
        const monthName = format(
            new Date(parseInt(year!), parseInt(monthNum!) - 1, 1),
            "MMMM",
        );

        let dataToExport: Record<string, string | number>[] = [];
        let sheetName = "";

        if (isOvertimeTab) {
            sheetName = "Overtime";
            dataToExport = payrollData
                .filter((row) => row.otMinutes > 0) // Only export staff with OT
                .map((row, index) => ({
                    "Sl No": index + 1,
                    Name: row.name || "",
                    Designation: row.designation || "",
                    "Bank Name": row.bank?.bankName || "N/A",
                    "Account NO": row.bank?.accountNumber || "N/A",
                    "Routing NO": row.bank?.routingNumber || "N/A",
                    "OT Hours":
                        Math.floor(row.otMinutes / 60) +
                        "h " +
                        (row.otMinutes % 60) +
                        "m",
                    "OT Rate":
                        row.otMinutes > 0
                            ? (row.otPayable / (row.otMinutes / 60)).toFixed(2)
                            : "0.00",
                    "Total OT Amount": row.otPayable || 0,
                    Status: row.otStatus === "paid" ? "Paid" : "Pending",
                }));
        } else {
            sheetName = "Salary";
            dataToExport = payrollData.map((row, index) => ({
                "Sl No": index + 1,
                Name: row.name || "",
                Designation: row.designation || "",
                "Bank Name": row.bank?.bankName || "N/A",
                "Account NO": row.bank?.accountNumber || "N/A",
                "Routing NO": row.bank?.routingNumber || "N/A",
                "Basic Salary": row.salary || 0,
                "Payable Amount": row.payableSalary || 0,
                Status: row.status === "paid" ? "Paid" : "Pending",
            }));
        }

        if (dataToExport.length === 0) {
            toast.error("No data to export for " + sheetName);
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        // Auto-width columns
        const max_width = dataToExport.reduce(
            (w, r) => Math.max(w, (r.Name as string)?.length || 0),
            10,
        );
        worksheet["!cols"] = [
            { wch: 8 },
            { wch: max_width + 5 },
            { wch: 20 },
            { wch: 20 },
            { wch: 15 },
            { wch: 15 },
            { wch: 10 },
        ];

        XLSX.writeFile(
            workbook,
            `${monthName} ${year.slice(-2)} ${sheetName}.xlsx`,
        );
    };

    const handleExportPDF = () => {
        if (!payrollData.length) return;
        // Currently only supports salary, could be extended later
        setShowPdfDialog(true);
    };

    const completionRate = displayTotal > 0 ? (displayPaid / displayTotal) * 100 : 0;

    return (
        <div className="space-y-8 p-1 animate-in fade-in duration-500">
            {/* Header & Stats Overview */}
            <div className="flex flex-col gap-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text">
                            Payroll Operations
                        </h2>
                        <p className="text-muted-foreground mt-1">
                            Manage monthly salaries, attendance audits, and institutional disbursements.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Badge
                            variant="outline"
                            className={cn(
                                "px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs",
                                isLocked
                                    ? "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400"
                                    : "bg-green-500/10 text-green-600 border-green-500/30 dark:text-green-400"
                            )}
                        >
                            {isLocked ? <Lock className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                            <span>{isLocked ? "Payroll Locked" : "Editable Preview"}</span>
                        </Badge>

                        {canWrite && (
                            <Button
                                size="sm"
                                variant={isLocked ? "outline" : "secondary"}
                                className={cn(
                                    "h-9 gap-2 shadow-xs transition-all",
                                    isLocked
                                        ? "border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                                        : "bg-muted hover:bg-muted/80"
                                )}
                                onClick={handleToggleLock}
                                disabled={isLocking || isUnlocking}
                            >
                                {isLocked ? (
                                    <>
                                        <Unlock className="h-4 w-4" />
                                        Unlock Payroll
                                    </>
                                ) : (
                                    <>
                                        <Lock className="h-4 w-4 text-amber-500" />
                                        Lock Payroll
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Gross Liability Card */}
                    <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-slate-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-slate-500/5 hover:border-slate-500/30">
                        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-slate-500/10 blur-2xl transition-all duration-300 group-hover:bg-slate-500/20" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/10 text-slate-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-slate-500/20">
                                    <DollarSign className="h-5 w-5" />
                                </div>
                                {!isLoading && (
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] font-medium opacity-70 group-hover:opacity-100"
                                    >
                                        {isOvertimeTab ? "Overtime Total" : "Gross Liability"}
                                    </Badge>
                                )}
                            </div>
                            {isLoading ? (
                                <Skeleton className="h-8 w-28" />
                            ) : (
                                <div>
                                    <h3 className="text-3xl font-bold tracking-tight text-slate-700 dark:text-slate-200">
                                        {formatCurrency(displayTotal)}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-2 font-medium">
                                        {displayTotalStaff} active personnel evaluated
                                    </p>
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-slate-500/10 font-medium">
                                Total Payroll Budget
                            </p>
                        </div>
                    </div>

                    {/* Pending Settlement Card */}
                    <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-orange-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/5 hover:border-orange-500/30">
                        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-orange-500/10 blur-2xl transition-all duration-300 group-hover:bg-orange-500/20" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-orange-500/20">
                                    <Clock className="h-5 w-5" />
                                </div>
                                {!isLoading && (
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] font-medium bg-orange-500/5 text-orange-500 border-orange-500/20 px-1.5 py-0 h-5"
                                    >
                                        Pending
                                    </Badge>
                                )}
                            </div>
                            {isLoading ? (
                                <Skeleton className="h-8 w-28" />
                            ) : (
                                <div>
                                    <h3 className="text-3xl font-bold tracking-tight text-orange-600 dark:text-orange-400">
                                        {formatCurrency(displayPending)}
                                    </h3>
                                    <p className="text-xs text-orange-600/80 dark:text-orange-400/80 mt-2 font-medium">
                                        {isOvertimeTab ? overtimePendingCount : salaryPendingCount} staff awaiting payment
                                    </p>
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-orange-500/10 font-medium">
                                Outstanding Liability
                            </p>
                        </div>
                    </div>

                    {/* Disbursed Volume Card */}
                    <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-green-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/5 hover:border-green-500/30">
                        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-green-500/10 blur-2xl transition-all duration-300 group-hover:bg-green-500/20" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-green-500/20">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                                {!isLoading && (
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] font-medium bg-green-500/5 text-green-500 border-green-500/20 px-1.5 py-0 h-5"
                                    >
                                        Disbursed
                                    </Badge>
                                )}
                            </div>
                            {isLoading ? (
                                <Skeleton className="h-8 w-28" />
                            ) : (
                                <div>
                                    <h3 className="text-3xl font-bold tracking-tight text-green-600 dark:text-green-400">
                                        {formatCurrency(displayPaid)}
                                    </h3>
                                    <div className="mt-2 space-y-1">
                                        <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                                            <span>Paid ({isOvertimeTab ? overtimePaidCount : salaryPaidCount})</span>
                                            <span className="font-semibold text-green-600 dark:text-green-400">{Math.round(completionRate)}%</span>
                                        </div>
                                        <Progress value={completionRate} className="h-1.5 bg-green-500/10" />
                                    </div>
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-green-500/10 font-medium">
                                Successfully Paid Volume
                            </p>
                        </div>
                    </div>

                    {/* Personnel Engagement Card */}
                    <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-blue-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-500/30">
                        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-blue-500/10 blur-2xl transition-all duration-300 group-hover:bg-blue-500/20" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-500/20">
                                    <Users className="h-5 w-5" />
                                </div>
                                {!isLoading && (
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] font-medium bg-blue-500/5 text-blue-500 border-blue-500/20 px-1.5 py-0 h-5"
                                    >
                                        Staff
                                    </Badge>
                                )}
                            </div>
                            {isLoading ? (
                                <Skeleton className="h-8 w-20" />
                            ) : (
                                <div>
                                    <h3 className="text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                                        {displayTotalStaff}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-2 font-medium">
                                        {branchId === "all" ? "Across all branches" : "Filtered by selected branch"}
                                    </p>
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-blue-500/10 font-medium">
                                Active Personnel Count
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <Card className="border-border/60 shadow-md">
                {isLocked && (
                    <div className="flex items-center gap-3 px-6 py-3 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-b border-amber-500/20">
                        <Lock className="h-4 w-4" />
                        <div className="flex-1">
                            <p className="text-sm font-semibold">Payroll Period Locked</p>
                            <p className="text-xs opacity-80">This billing period is archived for data integrity and accounting auditing.</p>
                        </div>
                        {canWrite && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 border-amber-500/30 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300"
                                onClick={handleToggleLock}
                                disabled={isUnlocking}
                            >
                                <Unlock className="h-3.5 w-3.5 mr-2" />
                                Unlock Preview
                            </Button>
                        )}
                    </div>
                )}

                <CardHeader className="pb-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle className="flex items-center gap-2 text-xl font-bold">
                            <DollarSign className="h-5 w-5 text-primary" />
                            Payroll Preview & Management
                        </CardTitle>
                        <div className="flex items-center gap-3">
                            {activeTab === "salary" && canWrite && (
                                <Button
                                    variant={isSelectMode ? "default" : "outline"}
                                    className="gap-2 shadow-xs"
                                    onClick={() => setIsSelectMode(!isSelectMode)}
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    {isSelectMode ? "Cancel Bulk Mode" : "Bulk Pay Mode"}
                                </Button>
                            )}

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="border-primary text-primary hover:bg-primary/10 shadow-xs gap-2"
                                    >
                                        <Download className="h-4 w-4" />
                                        Export Reports
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer gap-2">
                                        <FileSpreadsheet className="h-4 w-4 text-green-600" />
                                        Export to Excel
                                    </DropdownMenuItem>
                                    {!isOvertimeTab && (
                                        <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer gap-2">
                                            <FileText className="h-4 w-4 text-red-600" />
                                            Export to PDF
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    <Tabs
                        value={activeTab}
                        onValueChange={(val) => updateUrl("tab", val)}
                        className="w-full"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                            <TabsList className="bg-muted/60 p-1 rounded-xl">
                                <TabsTrigger value="salary" className="font-semibold px-6 rounded-lg">
                                    Salary Preview
                                </TabsTrigger>
                                <TabsTrigger value="overtime" className="font-semibold px-6 rounded-lg">
                                    Overtime Balance
                                </TabsTrigger>
                            </TabsList>

                            {!isLocked && suggestLock && canWrite && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleToggleLock}
                                    className="gap-2 border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
                                >
                                    <Lock className="h-3.5 w-3.5" />
                                    Lock Billing Period
                                </Button>
                            )}
                        </div>

                        {/* Filter Toolbar */}
                        <div className="flex flex-wrap items-center gap-4 my-6 p-4 bg-muted/20 border border-border/60 rounded-xl">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Filter Period
                                </span>
                            </div>

                            <div className="flex gap-2">
                                <Select
                                    value={selectedMonth.toString()}
                                    onValueChange={(v) => updateUrl("month", v)}
                                >
                                    <SelectTrigger className="h-9 w-[140px] bg-background">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MONTHS.map((m) => (
                                            <SelectItem key={m.value} value={m.value.toString()}>
                                                {m.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={selectedYear.toString()}
                                    onValueChange={(v) => updateUrl("year", v)}
                                >
                                    <SelectTrigger className="h-9 w-[100px] bg-background">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {YEARS.map((y) => (
                                            <SelectItem key={y} value={y.toString()}>
                                                {y}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex-1 min-w-[200px]">
                                <Select
                                    value={branchId}
                                    onValueChange={(v) => updateUrl("branch", v)}
                                >
                                    <SelectTrigger className="h-9 w-full md:w-[240px] bg-background">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="h-4 w-4 text-muted-foreground" />
                                            <SelectValue placeholder="All Branches" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Branches</SelectItem>
                                        {branches.map((branch) => (
                                            <SelectItem key={branch._id} value={branch._id}>
                                                {branch.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <TabsContent value="salary" className="mt-0 space-y-4">
                            {isLoading ? (
                                <TableSkeleton />
                            ) : (
                                <PayrollTable
                                    data={payrollData}
                                    month={formattedMonth}
                                    isSelectMode={isSelectMode}
                                    isLocked={isLocked}
                                    branchId={branchId}
                                />
                            )}
                        </TabsContent>

                        <TabsContent value="overtime" className="mt-0 space-y-4">
                            {isLoading ? (
                                <TableSkeleton />
                            ) : (
                                <OvertimeTable
                                    data={payrollData}
                                    month={formattedMonth}
                                    isLocked={isLocked}
                                />
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <ExportPdfDialog
                open={showPdfDialog}
                onOpenChange={setShowPdfDialog}
                payrollData={payrollData}
                month={formattedMonth}
            />
        </div>
    );
}
