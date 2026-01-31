'use client';

import { useEffect, useRef, useState } from 'react';
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
import { Loader } from 'lucide-react';
import { useLazyCheckClientIdQuery } from '@/redux/features/client/clientApi';

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
    email: z
        .string()
        .min(1, 'Email is required')
        .email('Invalid email address'),
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
    { value: '', label: 'Not specified' },
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
            email: defaultValues?.email || '',
            phone: defaultValues?.phone || '',
            address: defaultValues?.address || '',
            officeAddress: defaultValues?.officeAddress || '',
            description: defaultValues?.description || '',
            currency: defaultValues?.currency || '',
            status: defaultValues?.status || 'active',
        },
    });

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = form;

    const clientIdValue = watch('clientId');

    // Debounced client ID check
    useEffect(() => {
        // Skip check in edit mode or if value is empty/too short
        if (isEditMode || !clientIdValue || clientIdValue.length < 2) {
            setClientIdError(null);
            return;
        }

        // Clear previous timeout
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        // Set new timeout for 500ms
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
                // Ignore errors during check
                setClientIdError(null);
            }
        }, 500);

        // Cleanup
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [clientIdValue, isEditMode, checkClientId]);

    const handleFormSubmit = async (data: ClientFormData) => {
        // Prevent submit if there's a client ID error
        if (clientIdError && !isEditMode) {
            return;
        }
        await onSubmit(data);
    };

    // Get error for a field - check client-side, debounce check, and server-side errors
    const getFieldError = (fieldName: keyof ClientFormData) => {
        if (fieldName === 'clientId' && clientIdError) {
            return clientIdError;
        }
        if (errors[fieldName]?.message) {
            return errors[fieldName].message;
        }
        if (serverErrors?.[fieldName]?.[0]) {
            return serverErrors[fieldName][0];
        }
        return null;
    };

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="grid gap-4">
            {/* Client ID Field */}
            <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="clientId" className="text-right pt-2">
                    Client ID *
                </Label>
                <div className="col-span-3">
                    <div className="relative">
                        <Input
                            id="clientId"
                            placeholder="e.g., CLT-001, ACME-2024"
                            {...register('clientId')}
                            disabled={isEditMode}
                            className={isEditMode ? 'bg-muted' : ''}
                        />
                        {isCheckingId && !isEditMode && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Loader className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        )}
                    </div>
                    {getFieldError('clientId') && (
                        <p className="text-sm text-destructive mt-1">
                            {getFieldError('clientId')}
                        </p>
                    )}
                    {!isEditMode && !getFieldError('clientId') && (
                        <p className="text-xs text-muted-foreground mt-1">
                            Use letters, numbers, hyphens, or underscores only
                        </p>
                    )}
                </div>
            </div>

            {/* Name Field */}
            <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="name" className="text-right pt-2">
                    Name *
                </Label>
                <div className="col-span-3">
                    <Input
                        id="name"
                        placeholder="Enter client/company name"
                        {...register('name')}
                    />
                    {getFieldError('name') && (
                        <p className="text-sm text-destructive mt-1">
                            {getFieldError('name')}
                        </p>
                    )}
                </div>
            </div>

            {/* Email Field */}
            <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="email" className="text-right pt-2">
                    Email *
                </Label>
                <div className="col-span-3">
                    <Input
                        id="email"
                        type="email"
                        placeholder="client@example.com"
                        {...register('email')}
                    />
                    {getFieldError('email') && (
                        <p className="text-sm text-destructive mt-1">
                            {getFieldError('email')}
                        </p>
                    )}
                </div>
            </div>

            {/* Phone Field */}
            <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="phone" className="text-right pt-2">
                    Office Phone
                </Label>
                <div className="col-span-3">
                    <Input
                        id="phone"
                        placeholder="Enter office phone number"
                        {...register('phone')}
                    />
                </div>
            </div>

            {/* Address Field */}
            <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="address" className="text-right pt-2">
                    Address
                </Label>
                <div className="col-span-3">
                    <Input
                        id="address"
                        placeholder="Enter billing/personal address"
                        {...register('address')}
                    />
                </div>
            </div>

            {/* Office Address Field */}
            <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="officeAddress" className="text-right pt-2">
                    Office Address
                </Label>
                <div className="col-span-3">
                    <Input
                        id="officeAddress"
                        placeholder="Enter office/business address"
                        {...register('officeAddress')}
                    />
                </div>
            </div>

            {/* Status Field */}
            <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Status</Label>
                <div className="col-span-3">
                    <Select
                        value={watch('status')}
                        onValueChange={(value: 'active' | 'inactive') =>
                            setValue('status', value)
                        }
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

            {/* Currency Field */}
            <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Currency</Label>
                <div className="col-span-3">
                    <Select
                        value={watch('currency') || ''}
                        onValueChange={(value) =>
                            setValue('currency', value || undefined)
                        }
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select currency (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                            {currencyOptions.map((opt) => (
                                <SelectItem
                                    key={opt.value || 'none'}
                                    value={opt.value || 'none'}
                                >
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                        Used for earnings calculations
                    </p>
                </div>
            </div>

            {/* Description Field */}
            <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="description" className="text-right pt-2">
                    Description
                </Label>
                <div className="col-span-3">
                    <Textarea
                        id="description"
                        placeholder="Additional notes about the client..."
                        {...register('description')}
                    />
                </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={isSubmitting || (!!clientIdError && !isEditMode)}
                >
                    {isSubmitting && (
                        <Loader className="h-4 w-4  animate-spin" />
                    )}
                    {submitLabel}
                </Button>
            </div>
        </form>
    );
}
