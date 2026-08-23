'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, DollarSign, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import {
    useGetCurrencyRatesQuery,
    useUpdateCurrencyRatesMutation,
} from '@/redux/features/currencyRate/currencyRateApi';
import type { CurrencyRate } from '@/types/currency-rate.type';

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

export default function CurrencyRateTab() {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [rates, setRates] = useState<CurrencyRate[]>([]);
    const [newCurrency, setNewCurrency] = useState('');

    const { data, isLoading, isFetching } = useGetCurrencyRatesQuery({ month, year });
    const [updateRates, { isLoading: isSaving }] = useUpdateCurrencyRatesMutation();

    useEffect(() => {
        setRates(data?.data?.rates || []);
    }, [data]);

    const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 2 + i);

    const handleRateChange = (index: number, value: number) => {
        setRates((prev) => prev.map((r, i) => (i === index ? { ...r, rate: value } : r)));
    };

    const handleRemoveRow = (index: number) => {
        setRates((prev) => prev.filter((_, i) => i !== index));
    };

    const handleAddCurrency = () => {
        const code = newCurrency.trim().toUpperCase();
        if (!code) {
            toast.error('Enter a currency code first');
            return;
        }
        if (rates.some((r) => r.currency === code)) {
            toast.error('This currency is already in the list');
            return;
        }
        setRates((prev) => [...prev, { currency: code, rate: 0 }]);
        setNewCurrency('');
    };

    const handleSave = async () => {
        try {
            await updateRates({ month, year, data: { rates } }).unwrap();
            toast.success('Currency rates updated successfully');
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to update currency rates');
        }
    };

    return (
        <div className="space-y-4">
            {/* Month / Year Selectors */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                        <SelectTrigger className="w-full sm:w-40">
                            <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                            {MONTH_NAMES.map((m, i) => (
                                <SelectItem key={m} value={String(i + 1)}>
                                    {m}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                        <SelectTrigger className="w-full sm:w-28">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map((y) => (
                                <SelectItem key={y} value={String(y)}>
                                    {y}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Button
                    onClick={handleSave}
                    disabled={isSaving || isLoading}
                    className="w-full sm:w-auto"
                >
                    {isSaving ? <Spinner /> : <Save className="h-4 w-4 mr-2" />}
                    Save Changes
                </Button>
            </div>

            {/* Rates List */}
            {isLoading || isFetching ? (
                <div className="flex items-center justify-center min-h-[250px]">
                    <Spinner />
                </div>
            ) : (
                <div className="rounded-xl border bg-card divide-y">
                    {rates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/20">
                            <DollarSign className="h-10 w-10 text-muted-foreground/50 mb-3" />
                            <h3 className="font-semibold text-lg">No currency rates set</h3>
                            <p className="text-sm text-muted-foreground max-w-sm mt-1">
                                Add a currency below to set its rate for {MONTH_NAMES[month - 1]} {year}.
                            </p>
                        </div>
                    ) : (
                        rates.map((r, i) => (
                            <div
                                key={r.currency}
                                className="flex items-center gap-3 p-3 px-4"
                            >
                                <span className="w-16 font-mono font-semibold text-sm">
                                    {r.currency}
                                </span>
                                <Input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={r.rate}
                                    onChange={(e) => handleRateChange(i, Number(e.target.value) || 0)}
                                    className="h-9 max-w-[160px]"
                                />
                                <span className="text-xs text-muted-foreground">BDT per unit</span>
                                <div className="flex-1" />
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => handleRemoveRow(i)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        ))
                    )}

                    {/* Add currency row */}
                    <div className="flex items-center gap-2 p-3 px-4 bg-muted/20">
                        <Label htmlFor="new-currency" className="sr-only">
                            New currency code
                        </Label>
                        <Input
                            id="new-currency"
                            placeholder="e.g. JPY"
                            value={newCurrency}
                            onChange={(e) => setNewCurrency(e.target.value.toUpperCase())}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddCurrency();
                                }
                            }}
                            className="h-9 max-w-[160px]"
                        />
                        <Button size="sm" variant="outline" onClick={handleAddCurrency}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                            Add Currency
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
