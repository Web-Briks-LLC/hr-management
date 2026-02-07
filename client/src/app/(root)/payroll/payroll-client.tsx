'use client';

import { useState } from 'react';
import { useGetPayrollPreviewQuery } from '@/redux/features/payroll/payrollApi';
import { useGetAllBranchesQuery } from '@/redux/features/branch/branchApi';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DollarSign,
    Users,
    Download,
    Filter,
    Wallet,
    CheckCircle2,
    Clock,
    Loader,
    Building2,
    Calendar as CalendarIcon,
    FileSpreadsheet,
    FileText,
} from 'lucide-react';
import PayrollTable from '../../../components/payroll/payroll-table';
import ExportPdfDialog from '../../../components/payroll/export-pdf-dialog';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

const MONTHS = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function PayrollPage() {
    // State
    const [selectedMonth, setSelectedMonth] = useState(
        new Date().getMonth() + 1,
    );
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [branchId, setBranchId] = useState<string>('all');
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [showPdfDialog, setShowPdfDialog] = useState(false);

    // Derived Date for API
    const formattedMonth = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`;

    // Queries
    const { data: branchesData } = useGetAllBranchesQuery({});
    const branches = branchesData?.branches || [];

    const { data, isLoading, isFetching } = useGetPayrollPreviewQuery({
        month: formattedMonth,
        branchId,
    });

    const payrollData = data?.data || [];

    // Stats Calculation
    const totalSalary = payrollData.reduce(
        (acc: number, curr: any) => acc + (curr.payableSalary || 0),
        0,
    );
    const totalStaff = payrollData.length;

    // Placeholder logic for Paid/Pending - strictly based on availability
    // If 'status' is not fully implemented in backend preview, this might need adjustment later
    const paidAmount = payrollData
        .filter((i: any) => i.status === 'paid')
        .reduce((acc: number, curr: any) => acc + (curr.payableSalary || 0), 0);

    const pendingAmount = totalSalary - paidAmount;
    // Count of paid/pending staff
    const paidCount = payrollData.filter(
        (i: any) => i.status === 'paid',
    ).length;
    const pendingCount = payrollData.length - paidCount;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('bn-BD', {
            style: 'currency',
            currency: 'BDT',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    // --- Export Handlers ---

    const handleExportExcel = () => {
        if (!payrollData.length) return;

        // Filter only staff with bank accounts
        const staffWithBankAccount = payrollData.filter(
            (row: any) => row.bankAccountNo && row.bankAccountNo.trim() !== '',
        );

        if (staffWithBankAccount.length === 0) {
            toast.error('No staff members with bank accounts found');
            return;
        }

        const [year, monthNum] = formattedMonth.split('-');
        const monthName = format(
            new Date(parseInt(year), parseInt(monthNum) - 1, 1),
            'MMMM',
        );

        const dataToExport = staffWithBankAccount.map(
            (row: any, index: number) => ({
                'Sl No': index + 1,
                Name: row.name || '',
                Designation: row.designation || '',
                'Account NO': row.bankAccountNo || '',
                Amount: row.payableSalary || 0,
            }),
        );

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Salary');

        // Auto-width for columns
        worksheet['!cols'] = [
            { wch: 8 }, // Sl No
            { wch: 25 }, // Name
            { wch: 20 }, // Designation
            { wch: 25 }, // Account NO
            { wch: 15 }, // Amount
        ];

        XLSX.writeFile(workbook, `${monthName} ${year.slice(-2)} Salary.xlsx`);
    };

    const handleExportPDF = () => {
        if (!payrollData.length) return;
        setShowPdfDialog(true);
    };

    return (
        <div className="space-y-8 p-1">
            {/* Header & Stats Overview */}
            <div className="flex flex-col gap-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
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
                            </div>
                            {isLoading ? (
                                <Skeleton className="h-8 w-28" />
                            ) : (
                                <h3 className="text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
                                    {formatCurrency(totalSalary)}
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
                                        {formatCurrency(paidAmount)}
                                    </h3>
                                    <p className="text-xs font-medium text-green-600/80 dark:text-green-400/80 mt-0.5">
                                        {paidCount} Staff Paid
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
                                        {formatCurrency(pendingAmount)}
                                    </h3>
                                    <p className="text-xs font-medium text-orange-600/80 dark:text-orange-400/80 mt-0.5">
                                        {pendingCount} Staff Pending
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
                                    {totalStaff}
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
                            Salary Sheet
                        </CardTitle>

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
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>
                                    Choose Format
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={handleExportExcel}
                                    className="cursor-pointer"
                                >
                                    <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
                                    <span>Export to Excel</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={handleExportPDF}
                                    className="cursor-pointer"
                                >
                                    <FileText className="mr-2 h-4 w-4 text-red-600" />
                                    <span>Export to PDF</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Filters Toolbar */}
                    <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
                        <div className="flex items-center gap-2">
                            <div className="bg-primary/10 p-2 rounded-full">
                                <Filter className="h-4 w-4 text-primary" />
                            </div>
                            <span className="text-sm font-medium">
                                Filters:
                            </span>
                        </div>

                        {/* Month Select */}
                        <div className="flex gap-2">
                            <Select
                                value={selectedMonth.toString()}
                                onValueChange={(v) =>
                                    setSelectedMonth(parseInt(v))
                                }
                            >
                                <SelectTrigger className="w-[130px] h-9 bg-background/60">
                                    <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-70" />
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
                                    setSelectedYear(parseInt(v))
                                }
                            >
                                <SelectTrigger className="w-[100px] h-9 bg-background/60">
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

                        <div className="w-[1px] h-6 bg-border mx-1" />

                        {/* Branch Filter */}
                        <Select value={branchId} onValueChange={setBranchId}>
                            <SelectTrigger className="w-[180px] h-9 bg-background/60">
                                <Building2 className="mr-2 h-3.5 w-3.5 opacity-70" />
                                <SelectValue placeholder="All Branches" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    All Branches
                                </SelectItem>
                                {branches.map((branch: any) => (
                                    <SelectItem
                                        key={branch._id}
                                        value={branch._id}
                                    >
                                        {branch.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="flex-1" />

                        <Button
                            variant={isSelectMode ? 'secondary' : 'outline'}
                            size="sm"
                            onClick={() => setIsSelectMode(!isSelectMode)}
                            className="gap-2"
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            {isSelectMode ? 'Cancel Selection' : 'Select Staff'}
                        </Button>
                    </div>

                    {/* Table */}
                    <div className="rounded-md border border-border/60 overflow-hidden">
                        {isLoading || isFetching ? (
                            <div className="flex flex-col justify-center items-center h-64 gap-3">
                                <Loader className="h-8 w-8 animate-spin text-primary" />
                                <p className="text-muted-foreground text-sm">
                                    Loading payroll data...
                                </p>
                            </div>
                        ) : (
                            <PayrollTable
                                data={payrollData}
                                month={formattedMonth}
                                isSelectMode={isSelectMode}
                            />
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* PDF Export Dialog */}
            <ExportPdfDialog
                open={showPdfDialog}
                onOpenChange={setShowPdfDialog}
                payrollData={payrollData}
                month={formattedMonth}
            />
        </div>
    );
}
