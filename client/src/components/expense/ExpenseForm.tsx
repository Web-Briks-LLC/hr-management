'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { DatePicker } from '@/components/shared/DatePicker';
import { Loader, Plus } from 'lucide-react';
import type { ExpenseCategory } from '@/redux/features/expense/expenseApi';

// Zod schema for expense form validation
export const expenseFormSchema = z.object({
    date: z.date({ message: 'Date is required' }),
    title: z
        .string()
        .min(1, 'Title is required')
        .min(3, 'Title must be at least 3 characters'),
    categoryId: z.string().min(1, 'Category is required'),
    branchId: z.string().min(1, 'Branch is required'),
    amount: z
        .string()
        .min(1, 'Amount is required')
        .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
            message: 'Amount must be a positive number',
        }),
    status: z.enum(['pending', 'paid', 'partial_paid']),
    note: z.string().optional(),
});

export type ExpenseFormData = z.infer<typeof expenseFormSchema>;

interface Branch {
    _id: string;
    name: string;
}

interface ExpenseFormProps {
    defaultValues?: Partial<ExpenseFormData>;
    onSubmit: (data: ExpenseFormData) => Promise<void>;
    isSubmitting: boolean;
    categories: ExpenseCategory[] | undefined;
    branches: Branch[];
    onAddCategory: () => void;
    submitLabel: string;
    onCancel: () => void;
}

const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'paid', label: 'Paid' },
    { value: 'partial_paid', label: 'Partial Paid' },
];

export function ExpenseForm({
    defaultValues,
    onSubmit,
    isSubmitting,
    categories,
    branches,
    onAddCategory,
    submitLabel,
    onCancel,
}: ExpenseFormProps) {
    const form = useForm<ExpenseFormData>({
        resolver: zodResolver(expenseFormSchema),
        defaultValues: {
            date: defaultValues?.date || new Date(),
            title: defaultValues?.title || '',
            categoryId: defaultValues?.categoryId || '',
            branchId: defaultValues?.branchId || '',
            amount: defaultValues?.amount || '',
            status: defaultValues?.status || 'pending',
            note: defaultValues?.note || '',
        },
    });

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = form;

    const handleFormSubmit = async (data: ExpenseFormData) => {
        await onSubmit(data);
    };

    return (
        <form
            onSubmit={handleSubmit(handleFormSubmit)}
            className="grid gap-4 py-4"
        >
            {/* Date Field */}
            <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Date *</Label>
                <div className="col-span-3">
                    <DatePicker
                        value={watch('date')}
                        onChange={(date) =>
                            setValue('date', date || new Date())
                        }
                    />
                    {errors.date && (
                        <p className="text-sm text-destructive mt-1">
                            {errors.date.message}
                        </p>
                    )}
                </div>
            </div>

            {/* Title Field */}
            <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="title" className="text-right pt-2">
                    Title *
                </Label>
                <div className="col-span-3">
                    <Input
                        id="title"
                        placeholder="Enter expense title"
                        {...register('title')}
                    />
                    {errors.title && (
                        <p className="text-sm text-destructive mt-1">
                            {errors.title.message}
                        </p>
                    )}
                </div>
            </div>

            {/* Category Field */}
            <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Category *</Label>
                <div className="col-span-3">
                    <div className="flex gap-2">
                        <Select
                            value={watch('categoryId')}
                            onValueChange={(value) =>
                                setValue('categoryId', value)
                            }
                        >
                            <SelectTrigger className="flex-1 w-full">
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories?.map((cat) => (
                                    <SelectItem key={cat._id} value={cat._id}>
                                        {cat.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={onAddCategory}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    {errors.categoryId && (
                        <p className="text-sm text-destructive mt-1">
                            {errors.categoryId.message}
                        </p>
                    )}
                </div>
            </div>

            {/* Branch Field */}
            <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Branch *</Label>
                <div className="col-span-3">
                    <Select
                        value={watch('branchId')}
                        onValueChange={(value) => setValue('branchId', value)}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select branch" />
                        </SelectTrigger>
                        <SelectContent>
                            {branches.map((branch) => (
                                <SelectItem key={branch._id} value={branch._id}>
                                    {branch.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.branchId && (
                        <p className="text-sm text-destructive mt-1">
                            {errors.branchId.message}
                        </p>
                    )}
                </div>
            </div>

            {/* Amount Field */}
            <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="amount" className="text-right pt-2">
                    Amount (BDT) *
                </Label>
                <div className="col-span-3">
                    <Input
                        id="amount"
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        {...register('amount')}
                        onKeyDown={(e) => {
                            // Allow: backspace, delete, tab, escape, enter, arrows
                            if (
                                [
                                    'Backspace',
                                    'Delete',
                                    'Tab',
                                    'Escape',
                                    'Enter',
                                    'ArrowLeft',
                                    'ArrowRight',
                                    'ArrowUp',
                                    'ArrowDown',
                                    'Home',
                                    'End',
                                ].includes(e.key) ||
                                // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                                ((e.ctrlKey || e.metaKey) &&
                                    ['a', 'c', 'v', 'x'].includes(
                                        e.key.toLowerCase(),
                                    ))
                            ) {
                                return;
                            }
                            // Allow: decimal point (only one)
                            if (
                                e.key === '.' &&
                                !e.currentTarget.value.includes('.')
                            ) {
                                return;
                            }
                            // Block if not a number
                            if (!/^\d$/.test(e.key)) {
                                e.preventDefault();
                            }
                        }}
                        onChange={(e) => {
                            const value = e.target.value;
                            // Filter pasted content to only allow valid numeric format
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                setValue('amount', value);
                            }
                        }}
                    />
                    {errors.amount && (
                        <p className="text-sm text-destructive mt-1">
                            {errors.amount.message}
                        </p>
                    )}
                </div>
            </div>

            {/* Status Field */}
            <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Status</Label>
                <div className="col-span-3">
                    <Select
                        value={watch('status')}
                        onValueChange={(
                            value: 'pending' | 'paid' | 'partial_paid',
                        ) => setValue('status', value)}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {statusOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Note Field */}
            <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="note" className="text-right pt-2">
                    Note
                </Label>
                <div className="col-span-3">
                    <Textarea
                        id="note"
                        placeholder="Optional notes..."
                        {...register('note')}
                    />
                </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && (
                        <Loader className="h-4 w-4  animate-spin" />
                    )}
                    {submitLabel}
                </Button>
            </div>
        </form>
    );
}
