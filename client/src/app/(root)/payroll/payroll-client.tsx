"use client";

import { useState } from "react";
import { useGetPayrollPreviewQuery } from "@/redux/features/payroll/payrollApi";
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
import {
    DollarSign,
    Users,
    Download,
    Filter,
    Wallet,
    CheckCircle2,
    Clock,
    Building2,
    Calendar as CalendarIcon,
    FileSpreadsheet,
    FileText,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PayrollTable from "../../../components/payroll/payroll-table";
import OvertimeTable from "../../../components/payroll/overtime-table";
import ExportPdfDialog from "../../../components/payroll/export-pdf-dialog";
import * as XLSX from "xlsx";
import { IPayrollItem } from "@/types/payroll.type";
import { IBranch } from "@/types/branch.type";
import { toast } from "sonner";

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

    const { data, isLoading, isFetching } = useGetPayrollPreviewQuery({
        month: formattedMonth,
        branchId,
    });

    const payrollData = (data?.data || []) as IPayrollItem[];

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
    const displayPaidCount = isOvertimeTab
        ? overtimePaidCount
        : salaryPaidCount;
    const displayPendingCount = isOvertimeTab
        ? overtimePendingCount
        : salaryPendingCount;
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
                "Account NO": row.bankAccountNo || "N/A",
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

    return (
        <div className="space-y-8 p-1">
            {/* Header & Stats Overview */}
            <div className="flex flex-col gap-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text">
                        Payroll Management
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Manage monthly salaries, attendance corrections, and
                        payments.
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Total Payable Card */}
                    <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-indigo-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-500/30">
                        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-indigo-500/10 blur-2xl transition-all duration-300 group-hover:bg-indigo-500/20" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-indigo-500/20">
                                    <Wallet className="h-5 w-5" />
                                </div>
                                <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-medium">
                                    {isOvertimeTab ? "Overtime" : "Salary"}
                                </span>
                            </div>
                            {isLoading ? (
                                <Skeleton className="h-8 w-28" />
                            ) : (
                                <h3 className="text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
                                    {formatCurrency(displayTotal)}
                                </h3>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                                Total Payable
                            </p>
                        </div>
                    </div>

                    {/* Paid Card */}
                    <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-green-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/5 hover:border-green-500/30">
                        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-green-500/10 blur-2xl transition-all duration-300 group-hover:bg-green-500/20" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-green-500/20">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                            </div>
                            {isLoading ? (
                                <Skeleton className="h-8 w-24" />
                            ) : (
                                <>
                                    <h3 className="text-2xl font-bold tracking-tight text-green-600 dark:text-green-400">
                                        {formatCurrency(displayPaid)}
                                    </h3>
                                    <p className="text-xs font-medium text-green-600/80 dark:text-green-400/80 mt-0.5">
                                        {displayPaidCount} Staff Paid
                                    </p>
                                </>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                                Paid Amount
                            </p>
                        </div>
                    </div>

                    {/* Pending Card */}
                    <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-orange-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/5 hover:border-orange-500/30">
                        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-orange-500/10 blur-2xl transition-all duration-300 group-hover:bg-orange-500/20" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-orange-500/20">
                                    <Clock className="h-5 w-5" />
                                </div>
                            </div>
                            {isLoading ? (
                                <Skeleton className="h-8 w-24" />
                            ) : (
                                <>
                                    <h3 className="text-2xl font-bold tracking-tight text-orange-600 dark:text-orange-400">
                                        {formatCurrency(displayPending)}
                                    </h3>
                                    <p className="text-xs font-medium text-orange-600/80 dark:text-orange-400/80 mt-0.5">
                                        {displayPendingCount} Staff Pending
                                    </p>
                                </>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                                Pending Amount
                            </p>
                        </div>
                    </div>

                    {/* Total Staff Card */}
                    <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-blue-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-500/30">
                        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-blue-500/10 blur-2xl transition-all duration-300 group-hover:bg-blue-500/20" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-500/20">
                                    <Users className="h-5 w-5" />
                                </div>
                            </div>
                            {isLoading ? (
                                <Skeleton className="h-8 w-16" />
                            ) : (
                                <h3 className="text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                                    {displayTotalStaff}
                                </h3>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                                Total Staff
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <Card className="border-border/60 shadow-md">
                <CardHeader className="pb-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <DollarSign className="h-5 w-5 text-primary" />
                            Payroll & Overtime
                        </CardTitle>

                        <div className="flex items-center gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                                        variant="default"
                                    >
                                        <Download className="h-4 w-4" />
                                        Export Report
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="w-48"
                                >
                                    <DropdownMenuLabel>
                                        Choose Format
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={handleExportExcel}
                                        className="cursor-pointer"
                                    >
                                        <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
                                        <span>
                                            Export{" "}
                                            {isOvertimeTab
                                                ? "Overtime"
                                                : "Salary"}{" "}
                                            to Excel
                                        </span>
                                    </DropdownMenuItem>
                                    {!isOvertimeTab && (
                                        <DropdownMenuItem
                                            onClick={handleExportPDF}
                                            className="cursor-pointer"
                                        >
                                            <FileText className="mr-2 h-4 w-4 text-red-600" />
                                            <span>
                                                Export{" "}
                                                {isOvertimeTab
                                                    ? "Overtime"
                                                    : "Salary"}{" "}
                                                to PDF
                                            </span>
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
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                            <TabsList className="grid w-full md:w-[400px] grid-cols-2">
                                <TabsTrigger value="salary">
                                    Salary Sheet
                                </TabsTrigger>
                                <TabsTrigger value="overtime">
                                    Overtime Sheet
                                </TabsTrigger>
                            </TabsList>

                            {activeTab === "salary" && (
                                <div className="flex gap-2">
                                    <Button
                                        variant={
                                            isSelectMode
                                                ? "secondary"
                                                : "outline"
                                        }
                                        size="sm"
                                        onClick={() =>
                                            setIsSelectMode(!isSelectMode)
                                        }
                                        className="gap-2"
                                    >
                                        <CheckCircle2 className="h-4 w-4" />
                                        {isSelectMode
                                            ? "Cancel Selection"
                                            : "Select Staff"}
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Filters Toolbar (Shared) */}
                        <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border/50 mb-4">
                            <div className="flex items-center gap-2">
                                <div className="bg-primary/10 p-2 rounded-full">
                                    <Filter className="h-4 w-4 text-primary" />
                                </div>
                                <span className="text-sm font-medium">
                                    Filters:
                                </span>
                            </div>

                            <div className="flex gap-2">
                                <Select
                                    value={selectedMonth.toString()}
                                    onValueChange={(v) => updateUrl("month", v)}
                                >
                                    <SelectTrigger className="w-auto">
                                        <CalendarIcon />
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
                                    onValueChange={(v) => updateUrl("year", v)}
                                >
                                    <SelectTrigger className="w-auto">
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
                            </div>

                            <div className="w-px h-6 bg-border mx-1 hidden md:block" />

                            <Select
                                value={branchId}
                                onValueChange={(v) => updateUrl("branch", v)}
                            >
                                <SelectTrigger className="w-auto">
                                    <Building2 />
                                    <SelectValue placeholder="All Branches" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Branches
                                    </SelectItem>
                                    {branches.map((branch) => (
                                        <SelectItem
                                            key={branch._id}
                                            value={branch._id}
                                        >
                                            {branch.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <TabsContent value="salary" className="mt-0">
                            <div className="rounded-md border border-border/60 overflow-hidden">
                                {isLoading || isFetching ? (
                                    <TableSkeleton />
                                ) : (
                                    <PayrollTable
                                        data={payrollData}
                                        month={formattedMonth}
                                        isSelectMode={isSelectMode}
                                    />
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="overtime" className="mt-0">
                            <div className="rounded-md border border-border/60 overflow-hidden">
                                {isLoading || isFetching ? (
                                    <TableSkeleton />
                                ) : (
                                    <OvertimeTable
                                        data={payrollData}
                                        month={formattedMonth}
                                    />
                                )}
                            </div>
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
