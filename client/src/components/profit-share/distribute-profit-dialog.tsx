'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    useDistributeProfitMutation,
    type IShareholder,
} from '@/redux/features/profitShare/profitShareApi';
import { Loader2, DollarSign, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DistributeProfitDialogProps {
    shareholders: IShareholder[];
    netProfit: number;
}

const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => ({
    value: String(currentYear - i),
    label: String(currentYear - i),
}));

export default function DistributeProfitDialog({
    shareholders,
    netProfit,
}: DistributeProfitDialogProps) {
    const [open, setOpen] = useState(false);
    const [distributeProfit, { isLoading }] = useDistributeProfitMutation();

    const [periodType, setPeriodType] = useState<'month' | 'year'>('month');
    const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
    const [selectedYear, setSelectedYear] = useState(String(currentYear));
    const [selectedShareholders, setSelectedShareholders] = useState<string[]>([]);
    const [notes, setNotes] = useState('');

    const isAllSelected = selectedShareholders.length === shareholders.length && shareholders.length > 0;

    const handleSelectAll = () => {
        if (isAllSelected) {
            setSelectedShareholders([]);
        } else {
            setSelectedShareholders(shareholders.map((s) => s._id));
        }
    };

    const handleSelectShareholder = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedShareholders([...selectedShareholders, id]);
        } else {
            setSelectedShareholders(selectedShareholders.filter((sid) => sid !== id));
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-BD', {
            style: 'currency',
            currency: 'BDT',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const getSelectedTotalPercentage = () => {
        return shareholders
            .filter((s) => selectedShareholders.includes(s._id))
            .reduce((sum, s) => sum + s.percentage, 0);
    };

    const handleSubmit = async () => {
        if (selectedShareholders.length === 0) {
            toast.error('Please select at least one shareholder');
            return;
        }

        try {
            await distributeProfit({
                shareholderIds: isAllSelected ? ['all'] : selectedShareholders,
                periodType,
                month: periodType === 'month' ? parseInt(selectedMonth) : undefined,
                year: parseInt(selectedYear),
                notes: notes || undefined,
            }).unwrap();

            toast.success('Profit distributed successfully!');
            setOpen(false);
            // Reset form
            setSelectedShareholders([]);
            setNotes('');
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to distribute profit');
        }
    };

    const canDistribute = netProfit > 0 && shareholders.length > 0;

    const handleDisabledClick = () => {
        if (shareholders.length === 0) {
            toast.warning('No shareholders added. Please add shareholders first.');
        } else if (netProfit <= 0) {
            toast.warning(`Cannot distribute - no profit to share. Current net profit: ${formatCurrency(netProfit)}`);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <div onClick={!canDistribute ? handleDisabledClick : undefined}>
                <DialogTrigger asChild>
                    <Button disabled={!canDistribute} className="gap-2">
                        <DollarSign className="h-4 w-4" />
                        Distribute Profit
                    </Button>
                </DialogTrigger>
            </div>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Distribute Profit</DialogTitle>
                    <DialogDescription>
                        Select shareholders and period to distribute profit
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {netProfit <= 0 && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                There is no profit to distribute. Net profit: {formatCurrency(netProfit)}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Period Selection */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Period Type</Label>
                            <Select
                                value={periodType}
                                onValueChange={(value: 'month' | 'year') => setPeriodType(value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="month">Single Month</SelectItem>
                                    <SelectItem value="year">Full Year</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Year</Label>
                            <Select value={selectedYear} onValueChange={setSelectedYear}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map((year) => (
                                        <SelectItem key={year.value} value={year.value}>
                                            {year.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {periodType === 'month' && (
                        <div className="space-y-2">
                            <Label>Month</Label>
                            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {months.map((month) => (
                                        <SelectItem key={month.value} value={month.value}>
                                            {month.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Shareholder Selection */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Select Shareholders</Label>
                            <Button
                                type="button"
                                variant="link"
                                size="sm"
                                onClick={handleSelectAll}
                                className="h-auto p-0"
                            >
                                {isAllSelected ? 'Deselect All' : 'Select All'}
                            </Button>
                        </div>
                        <div className="rounded-lg border divide-y max-h-48 overflow-y-auto">
                            {shareholders.map((shareholder) => (
                                <div
                                    key={shareholder._id}
                                    className="flex items-center justify-between p-3 hover:bg-muted/50"
                                >
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            id={shareholder._id}
                                            checked={selectedShareholders.includes(shareholder._id)}
                                            onCheckedChange={(checked) =>
                                                handleSelectShareholder(shareholder._id, !!checked)
                                            }
                                        />
                                        <label htmlFor={shareholder._id} className="cursor-pointer">
                                            <div className="font-medium">{shareholder.name}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {shareholder.percentage}% share
                                            </div>
                                        </label>
                                    </div>
                                    <div className="text-sm font-mono text-muted-foreground">
                                        {formatCurrency((netProfit * shareholder.percentage) / 100)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Distribution Preview */}
                    {selectedShareholders.length > 0 && (
                        <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Selected shareholders:</span>
                                <span className="font-medium">{selectedShareholders.length}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Total percentage:</span>
                                <span className="font-medium">{getSelectedTotalPercentage().toFixed(2)}%</span>
                            </div>
                            <div className="flex justify-between font-medium border-t pt-2">
                                <span>Total to distribute:</span>
                                <span className="text-primary">
                                    {formatCurrency((netProfit * getSelectedTotalPercentage()) / 100)}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add any notes about this distribution..."
                            rows={2}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isLoading || selectedShareholders.length === 0}
                            className="gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Distributing...
                                </>
                            ) : (
                                'Distribute'
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
