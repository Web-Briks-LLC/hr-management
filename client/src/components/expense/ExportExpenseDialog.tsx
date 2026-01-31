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
} from '@/redux/features/expense/expenseApi';
import { pdf } from '@react-pdf/renderer';
import { ExpenseReportPDF } from './ExpenseReportPDF';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { IconFileExcel } from '@tabler/icons-react';

interface ExportExpenseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    availableYears?: number[];
}

export function ExportExpenseDialog({
    open,
    onOpenChange,
    availableYears = [],
}: ExportExpenseDialogProps) {
    const [exportType, setExportType] = useState<string>('month');
    const [selectedMonth, setSelectedMonth] = useState<string>(
        (new Date().getMonth() + 1).toString(),
    );
    const [selectedYear, setSelectedYear] = useState<string>(
        new Date().getFullYear().toString(),
    );
    const [isGenerating, setIsGenerating] = useState(false);

    const [trigger] = useLazyGetExpensesQuery();

    const handleExport = async (type: 'pdf' | 'excel') => {
        if (type === 'excel') {
            toast.info('Excel export feature is coming soon!');
            return;
        }

        setIsGenerating(true);
        try {
            // Prepare query filters
            const params: ExpenseQueryParams = {
                limit: 1000,
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

            // Fetch data using Redux Lazy Query
            const result = await trigger(params).unwrap();
            const expenses = result?.expenses || [];

            if (expenses.length === 0) {
                toast.error('No expenses found for the selected period');
                setIsGenerating(false);
                return;
            }

            const totalAmount = expenses.reduce(
                (sum: number, exp: any) => sum + exp.amount,
                0,
            );

            // Generate PDF
            const blob = await pdf(
                <ExpenseReportPDF
                    expenses={expenses}
                    filters={params}
                    totalAmount={totalAmount}
                />,
            ).toBlob();

            saveAs(
                blob,
                `Expense_Report_${exportType}_${selectedYear}${
                    exportType === 'month' ? '_' + selectedMonth : ''
                }.pdf`,
            );

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
                        <Label htmlFor="type" className="text-right">
                            Type
                        </Label>
                        <Select
                            value={exportType}
                            onValueChange={setExportType}
                        >
                            <SelectTrigger className="col-span-3 w-full">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="month">Monthly</SelectItem>
                                <SelectItem value="year">Yearly</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {exportType === 'month' && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="year" className="text-right">
                                Year
                            </Label>
                            <Select
                                value={selectedYear}
                                onValueChange={setSelectedYear}
                            >
                                <SelectTrigger className="col-span-3 w-full">
                                    <SelectValue placeholder="Select year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableYears.length > 0 ? (
                                        availableYears.map((year) => (
                                            <SelectItem
                                                key={year}
                                                value={year.toString()}
                                            >
                                                {year}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <SelectItem
                                            value={new Date()
                                                .getFullYear()
                                                .toString()}
                                        >
                                            {new Date().getFullYear()}
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {exportType === 'month' && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="month" className="text-right">
                                Month
                            </Label>
                            <Select
                                value={selectedMonth}
                                onValueChange={setSelectedMonth}
                            >
                                <SelectTrigger className="col-span-3 w-full">
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

                    {exportType === 'year' && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="year" className="text-right">
                                Year
                            </Label>
                            <Select
                                value={selectedYear}
                                onValueChange={setSelectedYear}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableYears.length > 0 ? (
                                        availableYears.map((year) => (
                                            <SelectItem
                                                key={year}
                                                value={year.toString()}
                                            >
                                                {year}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <SelectItem
                                            value={new Date()
                                                .getFullYear()
                                                .toString()}
                                        >
                                            {new Date().getFullYear()}
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
                <DialogFooter className="w-full flex items-center justify-between gap-4">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isGenerating}
                        className="w-auto"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => handleExport('excel')}
                        disabled={isGenerating}
                        className="w-auto"
                    >
                        <IconFileExcel />
                        Download Excel
                    </Button>
                    <Button
                        onClick={() => handleExport('pdf')}
                        disabled={isGenerating}
                        className="w-auto"
                    >
                        {isGenerating ? (
                            <Loader className="animate-spin" />
                        ) : (
                            <Download />
                        )}
                        Download PDF
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
