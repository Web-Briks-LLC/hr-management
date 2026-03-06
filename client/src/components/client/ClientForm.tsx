'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import {
    Loader,
    Plus,
    Trash2
} from 'lucide-react';
import { useLazyCheckClientIdQuery } from '@/redux/features/client/clientApi';
import { cn } from '@/lib/utils';

// Zod schema for client form validation
export const clientFormSchema = z.object({
    clientId: z
        .string()
        .min(1, 'Client ID is required')
        .min(2, 'Client ID must be at least 2 characters')
        .max(50, 'Client ID must be at most 50 characters')
        .regex(
            /^[A-Za-z0-9_-]+$/,
            'Client ID can only contain letters, numbers, hyphens, and underscores',
        ),
    name: z
        .string()
        .min(1, 'Name is required')
        .min(2, 'Name must be at least 2 characters'),
    emails: z
        .array(z.string().email('Invalid email address'))
        .min(1, 'At least one email is required'),
    phone: z.string().optional(),
    address: z.string().optional(),
    officeAddress: z.string().optional(),
    description: z.string().optional(),
    currency: z.string().optional(),
    status: z.enum(['active', 'inactive']),
});

export type ClientFormData = z.infer<typeof clientFormSchema>;

interface ClientFormProps {
    defaultValues?: Partial<ClientFormData>;
    onSubmit: (data: ClientFormData) => Promise<void>;
    isSubmitting: boolean;
    submitLabel: string;
    onCancel: () => void;
    serverErrors?: Record<string, string[]>;
    isEditMode?: boolean;
}

const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
];

const currencyOptions = [
    { value: 'USD', label: 'US Dollar ($)' },
    { value: 'EUR', label: 'Euro (€)' },
    { value: 'GBP', label: 'British Pound (£)' },
    { value: 'AUD', label: 'Australian Dollar (A$)' },
    { value: 'CAD', label: 'Canadian Dollar (C$)' },
];

export function ClientForm({
    defaultValues,
    onSubmit,
    isSubmitting,
    submitLabel,
    onCancel,
    serverErrors,
    isEditMode = false,
}: ClientFormProps) {
    const [checkClientId, { isFetching: isCheckingId }] =
        useLazyCheckClientIdQuery();
    const [clientIdError, setClientIdError] = useState<string | null>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    const form = useForm<ClientFormData>({
        resolver: zodResolver(clientFormSchema),
        defaultValues: {
            clientId: defaultValues?.clientId || '',
            name: defaultValues?.name || '',
            emails: defaultValues?.emails || [''],
            phone: defaultValues?.phone || '',
            address: defaultValues?.address || '',
            officeAddress: defaultValues?.officeAddress || '',
            description: defaultValues?.description || '',
            currency: defaultValues?.currency || '',
            status: defaultValues?.status || 'active',
        },
    });

    const {
        control,
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = form;

    const { fields, append, remove } = useFieldArray({
        control,
        name: "emails" as never,
    });

    const clientIdValue = watch('clientId');

    // Debounced client ID check
    useEffect(() => {
        if (isEditMode || !clientIdValue || clientIdValue.length < 2) {
            setClientIdError(null);
            return;
        }

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(async () => {
            try {
                const result = await checkClientId(clientIdValue).unwrap();
                if (!result.available) {
                    const suggestions = result.suggestions?.join(', ') || '';
                    setClientIdError(
                        `Client ID "${clientIdValue}" already exists.${suggestions ? ` Try: ${suggestions}` : ''}`,
                    );
                } else {
                    setClientIdError(null);
                }
            } catch {
                setClientIdError(null);
            }
        }, 500);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [clientIdValue, isEditMode, checkClientId]);

    const handleFormSubmit = async (data: ClientFormData) => {
        if (clientIdError && !isEditMode) {
            return;
        }
        await onSubmit(data);
    };

    const getFieldError = (fieldName: string) => {
        if (fieldName === 'clientId' && clientIdError) return clientIdError;

        if (fieldName.startsWith('emails')) {
            const parts = fieldName.split('.');
            const index = parseInt(parts[1]);
            const emailErrors = errors.emails as any;
            if (emailErrors && emailErrors[index]?.message) {
                return emailErrors[index].message;
            }
        }

        const error = (errors as any)[fieldName];
        if (error?.message) return error.message;

        if (serverErrors?.[fieldName]?.[0]) {
            return serverErrors[fieldName][0];
        }
        return null;
    };

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Client ID */}
                <div className="space-y-2">
                    <Label htmlFor="clientId">Client ID *</Label>
                    <div className="relative">
                        <Input
                            id="clientId"
                            placeholder="e.g., CLT-001"
                            {...register('clientId')}
                            disabled={isEditMode}
                            className={cn(getFieldError('clientId') && 'border-destructive')}
                        />
                        {isCheckingId && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Loader className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        )}
                    </div>
                    {getFieldError('clientId') && (
                        <p className="text-xs text-destructive">{getFieldError('clientId')}</p>
                    )}
                </div>

                {/* Client Name */}
                <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                        id="name"
                        placeholder="Client name"
                        {...register('name')}
                        className={cn(getFieldError('name') && 'border-destructive')}
                    />
                    {getFieldError('name') && (
                        <p className="text-xs text-destructive">{getFieldError('name')}</p>
                    )}
                </div>
            </div>

            {/* Emails */}
            <div className="space-y-2">
                <Label>Email Addresses *</Label>
                <div className="space-y-2">
                    {fields.map((field, index) => (
                        <div key={field.id} className="space-y-1">
                            <div className="flex gap-2">
                                <Input
                                    {...register(`emails.${index}` as const)}
                                    type="email"
                                    placeholder="email@example.com"
                                    className={cn(getFieldError(`emails.${index}`) && 'border-destructive')}
                                />
                                {fields.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => remove(index)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                            {getFieldError(`emails.${index}`) && (
                                <p className="text-xs text-destructive">{getFieldError(`emails.${index}`)}</p>
                            )}
                        </div>
                    ))}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append('' as any)}
                        className="w-full sm:w-auto"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Email
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Phone */}
                <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                        id="phone"
                        placeholder="Phone number"
                        {...register('phone')}
                    />
                </div>

                {/* Status */}
                <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                        value={watch('status')}
                        onValueChange={(value: 'active' | 'inactive') => setValue('status', value)}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select status" />
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Billing Address */}
                <div className="space-y-2">
                    <Label htmlFor="address">Billing Address</Label>
                    <Input
                        id="address"
                        placeholder="Billing address"
                        {...register('address')}
                    />
                </div>

                {/* Office Address */}
                <div className="space-y-2">
                    <Label htmlFor="officeAddress">Office Address</Label>
                    <Input
                        id="officeAddress"
                        placeholder="Office address"
                        {...register('officeAddress')}
                    />
                </div>
            </div>

            {/* Currency */}
            <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                    value={watch('currency') || ''}
                    onValueChange={(value) => setValue('currency', value === 'none' ? '' : value)}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Not specified</SelectItem>
                        {currencyOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
                <Label htmlFor="description">Notes</Label>
                <Textarea
                    id="description"
                    placeholder="Additional notes..."
                    {...register('description')}
                    className="min-h-[100px]"
                />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={isSubmitting || (!!clientIdError && !isEditMode)}
                >
                    {isSubmitting ? <Loader className="h-4 w-4 animate-spin mr-2" /> : null}
                    {submitLabel}
                </Button>
            </div>
        </form>
    );
}
