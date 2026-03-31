import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader, Download } from 'lucide-react';
import {
    useLazyGetExpensesQuery,
    type ExpenseQueryParams,
    type Expense,
} from '@/redux/features/expense/expenseApi';
import { pdf } from '@react-pdf/renderer';
import { ExpenseReportPDF } from './ExpenseReportPDF';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { IconFileExcel } from '@tabler/icons-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface Branch {
    _id: string;
    name: string;
}

interface ExportExpenseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    availableYears?: number[];
    branches?: Branch[];
}

export function ExportExpenseDialog({
    open,
    onOpenChange,
    availableYears = [],
    branches = [],
}: ExportExpenseDialogProps) {
    const [exportType, setExportType] = useState<string>('month');
    const [selectedMonth, setSelectedMonth] = useState<string>(
        (new Date().getMonth() + 1).toString(),
    );
    const [selectedYear, setSelectedYear] = useState<string>(
        new Date().getFullYear().toString(),
    );
    const [selectedBranch, setSelectedBranch] = useState<string>('all');
    const [isGenerating, setIsGenerating] = useState(false);

    const [trigger] = useLazyGetExpensesQuery();

    const handleExport = async (type: 'pdf' | 'excel') => {
        setIsGenerating(true);
        try {
            // Prepare query filters
            const params: ExpenseQueryParams = {
                limit: 2000, // Large limit for export
                page: 1,
            };

            if (exportType === 'month') {
                params.month = parseInt(selectedMonth);
                params.year = parseInt(selectedYear);
                params.filterType = 'month';
            } else if (exportType === 'year') {
                params.year = parseInt(selectedYear);
                params.filterType = 'year';
            }

            if (selectedBranch !== 'all') {
                params.branchId = selectedBranch;
            }

            // Fetch data using Redux Lazy Query
            const result = await trigger(params).unwrap();
            const expenses = result?.expenses || [];

            if (expenses.length === 0) {
                toast.error('No expenses found for the selected filters');
                setIsGenerating(false);
                return;
            }

            const totalAmount = expenses.reduce(
                (sum: number, exp: Expense) => sum + exp.amount,
                0,
            );

            const filename = `Expense_Report_${selectedBranch !== 'all' ? branches.find(b => b._id === selectedBranch)?.name + '_' : ''}${exportType}_${selectedYear}${
                exportType === 'month' ? '_' + selectedMonth : ''
            }`;

            if (type === 'pdf') {
                // Generate PDF
                const blob = await pdf(
                    <ExpenseReportPDF
                        expenses={expenses}
                        filters={params}
                        totalAmount={totalAmount}
                    />,
                ).toBlob();

                saveAs(blob, `${filename}.pdf`);
            } else {
                // Generate Excel
                const excelData = expenses.map((exp: Expense, index: number) => ({
                    'Sl No': index + 1,
                    'Date': format(new Date(exp.date), 'dd MMM yyyy'),
                    'Title': exp.title,
                    'Category': exp.category?.name || 'N/A',
                    'Branch': exp.branch?.name || 'N/A',
                    'Amount': exp.amount,
                    'Status': exp.status.toUpperCase(),
                    'Note': exp.note || ''
                }));

                const worksheet = XLSX.utils.json_to_sheet(excelData);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');

                // Auto-width columns
                const max_title_width = excelData.reduce((w, r) => Math.max(w, (r.Title as string).length), 10);
                worksheet['!cols'] = [
                    { wch: 8 },
                    { wch: 15 },
                    { wch: Math.max(max_title_width, 20) },
                    { wch: 15 },
                    { wch: 15 },
                    { wch: 12 },
                    { wch: 12 },
                    { wch: 30 }
                ];

                XLSX.writeFile(workbook, `${filename}.xlsx`);
            }

            toast.success('Report generated successfully');
            onOpenChange(false);
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to generate report');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md w-full!">
                <DialogHeader>
                    <DialogTitle>Export Expenses</DialogTitle>
                    <DialogDescription>
                        Generate a report of your expenses.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right font-bold">
                            Export Type
                        </Label>
                        <Select
                            value={exportType}
                            onValueChange={setExportType}
                        >
                            <SelectTrigger className="col-span-3 w-full font-bold shadow-xs">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="month" className="font-bold">Monthly Report</SelectItem>
                                <SelectItem value="year" className="font-bold">Yearly Summary</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="branch" className="text-right font-bold transition-colors">
                            Branch
                        </Label>
                        <Select
                            value={selectedBranch}
                            onValueChange={setSelectedBranch}
                        >
                            <SelectTrigger className="col-span-3 w-full font-bold shadow-xs">
                                <SelectValue placeholder="Select branch" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="font-bold">Global (All Branches)</SelectItem>
                                {branches.map((branch) => (
                                    <SelectItem
                                        key={branch._id}
                                        value={branch._id}
                                        className="font-bold"
                                    >
                                        {branch.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="year" className="text-right font-bold transition-colors">
                            Target Year
                        </Label>
                        <Select
                            value={selectedYear}
                            onValueChange={setSelectedYear}
                        >
                            <SelectTrigger className="col-span-3 w-full font-bold shadow-xs">
                                <SelectValue placeholder="Select year" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableYears.length > 0 ? (
                                    availableYears.map((year) => (
                                        <SelectItem
                                            key={year}
                                            value={year.toString()}
                                            className="font-bold"
                                        >
                                            {year}
                                        </SelectItem>
                                    ))
                                ) : (
                                    <SelectItem
                                        value={new Date()
                                            .getFullYear()
                                            .toString()}
                                        className="font-bold"
                                    >
                                        {new Date().getFullYear()}
                                    </SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {exportType === 'month' && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="month" className="text-right font-bold transition-colors">
                                Target Month
                            </Label>
                            <Select
                                value={selectedMonth}
                                onValueChange={setSelectedMonth}
                            >
                                <SelectTrigger className="col-span-3 w-full font-bold shadow-xs">
                                    <SelectValue placeholder="Select month" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from(
                                        { length: 12 },
                                        (_, i) => i + 1,
                                    ).map((m) => (
                                        <SelectItem
                                            key={m}
                                            value={m.toString()}
                                            className="font-bold"
                                        >
                                            {new Date(0, m - 1).toLocaleString(
                                                'default',
                                                { month: 'long' },
                                            )}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
                <DialogFooter className="w-full flex-col sm:flex-row items-center justify-between gap-3 mt-4 font-bold">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={isGenerating}
                        className="w-full sm:w-auto font-bold"
                    >
                        Cancel
                    </Button>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto font-bold">
                        <Button
                            variant="outline"
                            onClick={() => handleExport('excel')}
                            disabled={isGenerating}
                            className="w-full sm:w-auto font-bold shadow-xs"
                        >
                            {isGenerating ? <Loader className="animate-spin h-4 w-4" /> : <IconFileExcel className="h-4 w-4" />}
                            Excel
                        </Button>
                        <Button
                            onClick={() => handleExport('pdf')}
                            disabled={isGenerating}
                            className="w-full sm:w-auto font-bold shadow-md shadow-primary/10"
                        >
                            {isGenerating ? (
                                <Loader className="animate-spin h-4 w-4" />
                            ) : (
                                <Download className="h-4 w-4" />
                            )}
                            PDF
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
