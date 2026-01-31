'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    useGetShareholdersQuery,
    useDistributeProfitMutation,
} from '@/redux/features/profitShare/profitShareApi';
import { useGetFinanceAnalyticsQuery } from '@/redux/features/analytics/analyticsApi';
import { Loader, Share2, Wallet, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

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

export default function ShareProfitDialog() {
    const [open, setOpen] = useState(false);
    const [selectedPartnerId, setSelectedPartnerId] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(
        String(new Date().getMonth() + 1),
    );
    const [selectedYear, setSelectedYear] = useState(String(currentYear));
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');

    const { data: shareholdersData } = useGetShareholdersQuery();
    const { data: analyticsData } = useGetFinanceAnalyticsQuery({ months: 12 });
    const [distributeProfit, { isLoading }] = useDistributeProfitMutation();

    const shareholders =
        shareholdersData?.data?.filter((s) => s.isActive) || [];
    const analytics = analyticsData?.summary;

    // Calculate available profit (Profit + Debit)
    const availableProfit =
        (analytics?.totalProfit || 0) + (analytics?.totalDebit || 0);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-BD', {
            style: 'currency',
            currency: 'BDT',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const selectedPartner = shareholders.find(
        (s) => s._id === selectedPartnerId,
    );

    const handleSubmit = async () => {
        if (!selectedPartnerId) {
            toast.error('Please select a partner');
            return;
        }

        const shareAmount = parseFloat(amount);
        if (isNaN(shareAmount) || shareAmount <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        if (shareAmount > availableProfit) {
            toast.warning(
                `Amount exceeds available profit of ${formatCurrency(availableProfit)}`,
            );
        }

        try {
            await distributeProfit({
                shareholderIds: [selectedPartnerId],
                periodType: 'month',
                month: parseInt(selectedMonth),
                year: parseInt(selectedYear),
                notes: notes || undefined,
                // We'll need to modify the backend to accept custom amount
                customAmount: shareAmount,
            }).unwrap();

            toast.success(
                `Successfully shared ${formatCurrency(shareAmount)} with ${selectedPartner?.name}`,
            );
            setOpen(false);
            // Reset form
            setSelectedPartnerId('');
            setAmount('');
            setNotes('');
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to share profit');
        }
    };

    const resetForm = () => {
        setSelectedPartnerId('');
        setAmount('');
        setNotes('');
        setSelectedMonth(String(new Date().getMonth() + 1));
        setSelectedYear(String(currentYear));
    };

    useEffect(() => {
        if (!open) {
            resetForm();
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2" variant="default">
                    <Share2 className="h-4 w-4" />
                    Share Profit
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Share2 className="h-5 w-5" />
                        Share Profit
                    </DialogTitle>
                    <DialogDescription>
                        Share a specific amount with a partner
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* Available Profit Display */}
                    <div className="rounded-lg bg-linear-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                    Available Yearly Profit
                                </p>
                                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                                    {formatCurrency(availableProfit)}
                                </p>
                                <p className="text-xs text-emerald-500 dark:text-emerald-400 mt-0.5">
                                    Net Profit + Debit Balance
                                </p>
                            </div>
                            <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/50 p-3">
                                <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                        </div>
                    </div>

                    {/* Partner Selection */}
                    <div className="space-y-2">
                        <Label>Select Partner *</Label>
                        <Select
                            value={selectedPartnerId}
                            onValueChange={setSelectedPartnerId}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a partner" />
                            </SelectTrigger>
                            <SelectContent>
                                {shareholders.map((shareholder) => (
                                    <SelectItem
                                        key={shareholder._id}
                                        value={shareholder._id}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span>{shareholder.name}</span>
                                            <span className="text-muted-foreground text-xs">
                                                ({shareholder.percentage}%)
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {shareholders.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                                No active shareholders found. Add shareholders
                                first.
                            </p>
                        )}
                    </div>

                    {/* Month & Year Selection */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Month</Label>
                            <Select
                                value={selectedMonth}
                                onValueChange={setSelectedMonth}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {months.map((month) => (
                                        <SelectItem
                                            key={month.value}
                                            value={month.value}
                                        >
                                            {month.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Year</Label>
                            <Select
                                value={selectedYear}
                                onValueChange={setSelectedYear}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map((year) => (
                                        <SelectItem
                                            key={year.value}
                                            value={year.value}
                                        >
                                            {year.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Amount Input */}
                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount (BDT) *</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                ৳
                            </span>
                            <Input
                                id="amount"
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="Enter amount to share"
                                className="pl-8"
                                min={0}
                            />
                        </div>
                        {parseFloat(amount) > 0 && selectedPartner && (
                            <p className="text-sm text-muted-foreground">
                                {selectedPartner.name} will receive{' '}
                                <span className="font-semibold text-primary">
                                    {formatCurrency(parseFloat(amount))}
                                </span>
                            </p>
                        )}
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add any notes about this share..."
                            rows={2}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={
                                isLoading || !selectedPartnerId || !amount
                            }
                            className="gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader className="h-4 w-4 animate-spin" />
                                    Sharing...
                                </>
                            ) : (
                                <>
                                    <Wallet className="h-4 w-4" />
                                    Share Profit
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
