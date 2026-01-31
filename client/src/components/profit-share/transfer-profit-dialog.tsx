'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { IconArrowRight } from '@tabler/icons-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    useGetBusinessesQuery,
    useTransferProfitMutation,
} from '@/redux/features/externalBusiness/externalBusinessApi';

const months = [
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
const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

export function TransferProfitDialog() {
    const [open, setOpen] = useState(false);
    const { data: businessesData } = useGetBusinessesQuery({ isActive: true });
    const [transferProfit, { isLoading }] = useTransferProfitMutation();

    const [formData, setFormData] = useState({
        businessId: '',
        amount: '',
        periodType: 'month' as 'month' | 'year',
        month: new Date().getMonth() + 1,
        year: currentYear,
        notes: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.businessId) {
            newErrors.businessId = 'Please select a business';
        }
        const amount = parseFloat(formData.amount);
        if (!formData.amount || isNaN(amount) || amount <= 0) {
            newErrors.amount = 'Amount must be positive';
        }
        if (formData.periodType === 'month' && !formData.month) {
            newErrors.month = 'Month is required';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            const response = await transferProfit({
                businessId: formData.businessId,
                amount: parseFloat(formData.amount),
                periodType: formData.periodType,
                month:
                    formData.periodType === 'month'
                        ? formData.month
                        : undefined,
                year: formData.year,
                notes: formData.notes || undefined,
            }).unwrap();
            toast.success(response.message);
            setFormData({
                businessId: '',
                amount: '',
                periodType: 'month',
                month: new Date().getMonth() + 1,
                year: currentYear,
                notes: '',
            });
            setOpen(false);
        } catch (error: unknown) {
            if (error && typeof error === 'object' && 'data' in error) {
                const err = error as { data?: { message?: string } };
                toast.error(err.data?.message || 'Failed to transfer profit');
            } else {
                toast.error('Failed to transfer profit');
            }
        }
    };

    const businesses = businessesData?.data || [];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <IconArrowRight className=" size-4" />
                    Transfer Profit
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Transfer Profit</DialogTitle>
                    <DialogDescription>
                        Transfer profit to an external business.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Select Business *</Label>
                        <Select
                            value={formData.businessId}
                            onValueChange={(v) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    businessId: v,
                                }))
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a business" />
                            </SelectTrigger>
                            <SelectContent>
                                {businesses.map((business) => (
                                    <SelectItem
                                        key={business._id}
                                        value={business._id}
                                    >
                                        {business.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.businessId && (
                            <p className="text-sm text-destructive">
                                {errors.businessId}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount *</Label>
                        <Input
                            id="amount"
                            name="amount"
                            type="number"
                            placeholder="Enter amount"
                            value={formData.amount}
                            onChange={handleChange}
                        />
                        {errors.amount && (
                            <p className="text-sm text-destructive">
                                {errors.amount}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Period Type *</Label>
                        <Select
                            value={formData.periodType}
                            onValueChange={(v: 'month' | 'year') =>
                                setFormData((prev) => ({
                                    ...prev,
                                    periodType: v,
                                }))
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="month">Monthly</SelectItem>
                                <SelectItem value="year">Yearly</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {formData.periodType === 'month' && (
                            <div className="space-y-2">
                                <Label>Month *</Label>
                                <Select
                                    value={formData.month.toString()}
                                    onValueChange={(v) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            month: Number(v),
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {months.map((m) => (
                                            <SelectItem
                                                key={m.value}
                                                value={m.value.toString()}
                                            >
                                                {m.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.month && (
                                    <p className="text-sm text-destructive">
                                        {errors.month}
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Year *</Label>
                            <Select
                                value={formData.year.toString()}
                                onValueChange={(v) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        year: Number(v),
                                    }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map((y) => (
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
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                            id="notes"
                            name="notes"
                            placeholder="Optional notes"
                            value={formData.notes}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Transferring...' : 'Transfer'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
