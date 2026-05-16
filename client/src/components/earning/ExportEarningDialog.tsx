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
import { Loader, Download, Filter } from 'lucide-react';
import {
    useLazyGetEarningsQuery,
} from '@/redux/features/earning/earningApi';
import { pdf } from '@react-pdf/renderer';
import { EarningReportPDF } from './EarningReportPDF';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { IconFileExcel } from '@tabler/icons-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { IEarning, EarningFilters, EarningStatus, MONTHS } from '@/types/earning.type';

interface Client {
    _id: string;
    name: string;
}

interface ExportEarningDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    availableYears?: number[];
    clients?: Client[];
}

export function ExportEarningDialog({
    open,
    onOpenChange,
    availableYears = [],
    clients = [],
}: ExportEarningDialogProps) {
    const [filterType, setFilterType] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('month');
    const [selectedMonth, setSelectedMonth] = useState<string>(
        (new Date().getMonth() + 1).toString(),
    );
    const [selectedYear, setSelectedYear] = useState<string>(
        new Date().getFullYear().toString(),
    );
    const [selectedClient, setSelectedClient] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<EarningStatus | 'all'>('all');
    const [isGenerating, setIsGenerating] = useState(false);

    const [trigger] = useLazyGetEarningsQuery();

    const handleExport = async (type: 'pdf' | 'excel') => {
        setIsGenerating(true);
        try {
            // Prepare query filters
            const params: EarningFilters = {
                limit: 5000, // Large limit for export
                page: 1,
            };

            if (filterType !== 'all') {
                params.filterType = filterType;
                if (filterType === 'month') {
                    params.month = parseInt(selectedMonth);
                    params.year = parseInt(selectedYear);
                } else if (filterType === 'year') {
                    params.year = parseInt(selectedYear);
                }
            }

            if (selectedClient !== 'all') {
                params.clientId = selectedClient;
            }

            if (statusFilter !== 'all') {
                params.status = statusFilter;
            }

            // Fetch data using Redux Lazy Query
            const result = await trigger(params).unwrap();
            const earnings = result?.data || [];

            if (earnings.length === 0) {
                toast.error('No earnings found for the selected filters');
                setIsGenerating(false);
                return;
            }

            const totalPaidBDT = earnings.reduce(
                (sum: number, earn: IEarning) => sum + (earn.paidAmountBDT || 0),
                0,
            );
            
            const totalAmountUSD = earnings.reduce(
                (sum: number, earn: IEarning) => {
                    if (earn.currency === 'USD') return sum + earn.totalAmount;
                    return sum; // For simplicity in summary, though PDF handles multiple currencies in rows
                },
                0,
            );

            const filename = `Earnings_Report_${selectedClient !== 'all' ? clients.find(c => c._id === selectedClient)?.name + '_' : ''}${filterType}_${selectedYear}${
                filterType === 'month' ? '_' + selectedMonth : ''
            }`;

            if (type === 'pdf') {
                // Generate PDF
                const blob = await pdf(
                    <EarningReportPDF
                        earnings={earnings}
                        filters={params}
                        totalPaidBDT={totalPaidBDT}
                        totalAmountUSD={totalAmountUSD}
                    />,
                ).toBlob();

                saveAs(blob, `${filename}.pdf`);
            } else {
                // Generate Excel
                const excelData = earnings.map((earn: IEarning, index: number) => ({
                    'Sl No': index + 1,
                    'Period': `${format(new Date(2000, earn.month - 1, 1), 'MMMM')} ${earn.year}`,
                    'Client': earn.clientId?.name || 'N/A',
                    'Client ID': earn.clientId?.clientId || 'N/A',
                    'Image Qty': earn.imageQty || 0,
                    'Total Amount': earn.totalAmount,
                    'Currency': earn.currency,
                    'Fees': earn.fees || 0,
                    'Tax': earn.tax || 0,
                    'Paid Amount': earn.paidAmount,
                    'Conversion Rate': earn.conversionRate,
                    'Paid BDT': earn.paidAmountBDT,
                    'Status': earn.status.toUpperCase(),
                    'Paid At': earn.paidAt ? format(new Date(earn.paidAt), 'dd MMM yyyy') : 'N/A'
                }));

                const worksheet = XLSX.utils.json_to_sheet(excelData);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, 'Earnings');

                // Auto-width columns
                const max_client_width = excelData.reduce((w, r) => Math.max(w, (r.Client as string).length), 10);
                worksheet['!cols'] = [
                    { wch: 8 }, // Sl No
                    { wch: 15 }, // Period
                    { wch: Math.max(max_client_width, 20) }, // Client
                    { wch: 15 }, // Client ID
                    { wch: 12 }, // Image Qty
                    { wch: 15 }, // Total Amount
                    { wch: 10 }, // Currency
                    { wch: 12 }, // Fees
                    { wch: 12 }, // Tax
                    { wch: 15 }, // Paid Amount
                    { wch: 18 }, // Conversion Rate
                    { wch: 15 }, // Paid BDT
                    { wch: 12 }, // Status
                    { wch: 15 }  // Paid At
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
                    <DialogTitle className="flex items-center gap-2">
                        <Download className="h-5 w-5 text-primary" />
                        Export Earnings
                    </DialogTitle>
                    <DialogDescription>
                        Generate PDF or Excel report with custom filters.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {/* Date Range Filter */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="filterType" className="text-right font-semibold">
                            Range
                        </Label>
                        <Select
                            value={filterType}
                            onValueChange={(v: any) => setFilterType(v)}
                        >
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select range" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Time</SelectItem>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="week">This Week</SelectItem>
                                <SelectItem value="month">Monthly</SelectItem>
                                <SelectItem value="year">Yearly</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Conditional Year/Month Selectors */}
                    {(filterType === 'month' || filterType === 'year') && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="year" className="text-right font-semibold">
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
                                            <SelectItem key={year} value={year.toString()}>
                                                {year}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <SelectItem value={new Date().getFullYear().toString()}>
                                            {new Date().getFullYear()}
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {filterType === 'month' && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="month" className="text-right font-semibold">
                                Month
                            </Label>
                            <Select
                                value={selectedMonth}
                                onValueChange={setSelectedMonth}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select month" />
                                </SelectTrigger>
                                <SelectContent>
                                    {MONTHS.map((m) => (
                                        <SelectItem key={m.value} value={m.value.toString()}>
                                            {m.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Client Filter */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="client" className="text-right font-semibold">
                            Client
                        </Label>
                        <Select
                            value={selectedClient}
                            onValueChange={setSelectedClient}
                        >
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select client" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Clients</SelectItem>
                                {clients.map((client) => (
                                    <SelectItem key={client._id} value={client._id}>
                                        {client.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Status Filter */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="status" className="text-right font-semibold">
                            Status
                        </Label>
                        <Select
                            value={statusFilter}
                            onValueChange={(v: any) => setStatusFilter(v)}
                        >
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="paid">Paid Only</SelectItem>
                                <SelectItem value="unpaid">Unpaid Only</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter className="flex flex-col sm:flex-row gap-2">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={isGenerating}
                        className="w-full sm:w-auto"
                    >
                        Cancel
                    </Button>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                            variant="outline"
                            onClick={() => handleExport('excel')}
                            disabled={isGenerating}
                            className="flex-1 sm:flex-none gap-2"
                        >
                            {isGenerating ? <Loader className="animate-spin h-4 w-4" /> : <IconFileExcel className="h-4 w-4 text-green-600" />}
                            Excel
                        </Button>
                        <Button
                            onClick={() => handleExport('pdf')}
                            disabled={isGenerating}
                            className="flex-1 sm:flex-none gap-2"
                        >
                            {isGenerating ? <Loader className="animate-spin h-4 w-4" /> : <Download className="h-4 w-4" />}
                            PDF
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
