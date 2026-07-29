'use client';

import { useEffect, useRef, useMemo } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
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
    Trash2,
    Users,
    Briefcase
} from 'lucide-react';
import { useLazyCheckClientIdQuery, useGetNextClientIdQuery } from '@/redux/features/client/clientApi';
import { useGetServicesQuery } from '@/redux/features/service/serviceApi';
import { useGetStaffsQuery } from '@/redux/features/staff/staffApi';
import { cn } from '@/lib/utils';
import { MultiSelect } from '@/components/ui/multi-select';
import { Card, CardContent } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { ScrollArea } from '@/components/ui/scroll-area';

// Zod schema for client form validation
// Team member schema needs _id to correctly handle existing records from the API
const teamMemberSchema = z.object({
    _id: z.string().optional(),
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email'),
    phone: z.string().optional(),
    designation: z.string().optional(),
});

// We use { value: string }[] for emails to correctly support React Hook Form's useFieldArray
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
        .array(z.object({ value: z.string().email('Invalid email address') }))
        .min(1, 'At least one email is required'),
    phone: z.string().optional(),
    address: z.string().optional(),
    officeAddress: z.string().optional(),
    description: z.string().optional(),
    currency: z.string().optional(),
    status: z.enum(['active', 'inactive']),
    teamMembers: z.array(teamMemberSchema),
    assignedServices: z.array(z.string()),
    assignedTelemarketer: z.string().optional(),
});

// FormValues is the internal state that React Hook Form manages
export type FormValues = z.infer<typeof clientFormSchema>;

// ClientFormData is the cleaned up data that the API expects
export interface ClientFormData {
    clientId: string;
    name: string;
    emails: string[];
    phone?: string;
    address?: string;
    officeAddress?: string;
    description?: string;
    currency?: string;
    status: 'active' | 'inactive';
    teamMembers: {
        _id?: string;
        name: string;
        email: string;
        phone?: string;
        designation?: string;
    }[];
    assignedServices: string[];
    assignedTelemarketer?: string;
}

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
    const [checkClientId, { isFetching: isCheckingId, data: checkResult, originalArgs: lastCheckedClientId }] =
        useLazyCheckClientIdQuery();
    const { data: nextIdData } = useGetNextClientIdQuery(undefined, { skip: isEditMode });
    const { data: servicesData } = useGetServicesQuery({ isActive: true });
    const { data: staffsData } = useGetStaffsQuery({ limit: 100 });
    const staffs = staffsData?.staffs || staffsData?.data || [];
    const telemarketers = useMemo(() => {
        const filtered = staffs.filter((s: any) => {
            const des = s.designation || s.user?.designation || s.userId?.designation || '';
            return /telemarketer/i.test(des);
        });
        return filtered.length > 0 ? filtered : staffs;
    }, [staffs]);

    const telemarketerOptions = useMemo(() => {
        const options = telemarketers.map((t: any) => {
            const uId = t.user?._id || (typeof t.userId === 'object' ? t.userId?._id : t.userId) || t._id;
            const name = t.user?.name || t.name || (typeof t.userId === 'object' ? t.userId?.name : '') || 'Unnamed Telemarketer';
            const email = t.user?.email || t.email || (typeof t.userId === 'object' ? t.userId?.email : '') || '';
            const designationStr = t.designation || t.user?.designation || '';
            return {
                value: uId,
                label: name,
                description: `${email ? email : ''}${designationStr ? ` [${designationStr}]` : ''}`.trim(),
            };
        });
        return [{ value: '', label: 'Unassigned / None', description: 'No telemarketer assigned' }, ...options];
    }, [telemarketers]);
    
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(clientFormSchema),
        defaultValues: {
            clientId: defaultValues?.clientId || '',
            name: defaultValues?.name || '',
            emails: defaultValues?.emails?.map(email => ({ value: email })) || [{ value: '' }],
            phone: defaultValues?.phone || '',
            address: defaultValues?.address || '',
            officeAddress: defaultValues?.officeAddress || '',
            description: defaultValues?.description || '',
            currency: defaultValues?.currency || '',
            status: defaultValues?.status || 'active',
            teamMembers: defaultValues?.teamMembers || [],
            assignedServices: defaultValues?.assignedServices || [],
            assignedTelemarketer: defaultValues?.assignedTelemarketer || '',
        },
    });

    const {
        control,
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = form;

    const { fields: emailFields, append: appendEmail, remove: removeEmail } = useFieldArray({
        control,
        name: "emails",
    });

    const { fields: teamFields, append: appendTeam, remove: removeTeam } = useFieldArray({
        control,
        name: "teamMembers",
    });

    const clientIdValue = useWatch({ control, name: 'clientId' });
    const status = useWatch({ control, name: 'status' });
    const assignedServices = useWatch({ control, name: 'assignedServices' });
    const currency = useWatch({ control, name: 'currency' });
    const assignedTelemarketer = useWatch({ control, name: 'assignedTelemarketer' });

    // Derived client ID error from API result
    const clientIdError = useMemo(() => {
        if (isEditMode || !clientIdValue || clientIdValue.length < 2) return null;
        // Only show error if the current value matches what we last checked with the API
        if (lastCheckedClientId === clientIdValue && checkResult && !checkResult.available) {
            const suggestions = checkResult.suggestions?.join(', ') || '';
            return `Client ID "${clientIdValue}" already exists.${suggestions ? ` Try: ${suggestions}` : ''}`;
        }
        return null;
    }, [isEditMode, clientIdValue, lastCheckedClientId, checkResult]);

    // Debounced client ID check
    useEffect(() => {
        if (isEditMode || !clientIdValue || clientIdValue.length < 2) {
            return;
        }

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(async () => {
            try {
                await checkClientId(clientIdValue).unwrap();
            } catch {
                // Error handling is managed by RTK Query's result state
            }
        }, 500);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [clientIdValue, isEditMode, checkClientId]);

    useEffect(() => {
        if (!isEditMode && nextIdData?.nextClientId && !form.getValues('clientId')) {
            form.setValue('clientId', nextIdData.nextClientId);
        }
    }, [isEditMode, nextIdData, form]);

    const handleFormSubmit = async (data: FormValues) => {
        if (clientIdError && !isEditMode) {
            return;
        }
        // Explicitly map internal FormValues to API-ready ClientFormData
        const formattedData: ClientFormData = {
            clientId: data.clientId,
            name: data.name,
            emails: data.emails.map(e => e.value),
            phone: data.phone,
            address: data.address,
            officeAddress: data.officeAddress,
            description: data.description,
            currency: data.currency,
            status: data.status,
            teamMembers: data.teamMembers,
            assignedServices: data.assignedServices,
            assignedTelemarketer: data.assignedTelemarketer,
        };
        await onSubmit(formattedData);
    };

    const getFieldError = (fieldName: string) => {
        if (fieldName === 'clientId' && clientIdError) return clientIdError;

        // Handle nested errors for emails array of objects
        if (fieldName.startsWith('emails')) {
            const parts = fieldName.split('.');
            if (parts.length >= 2) {
                const index = parseInt(parts[1]);
                const emailErrors = errors.emails;
                if (emailErrors && emailErrors[index]?.value?.message) {
                    return emailErrors[index]?.value?.message;
                }
            }
        }

        // Handle nested errors for teamMembers array
        if (fieldName.startsWith('teamMembers')) {
            const parts = fieldName.split('.');
            if (parts.length >= 3) {
                const index = parseInt(parts[1]);
                const subField = parts[2] as keyof FormValues['teamMembers'][0];
                const teamErrors = errors.teamMembers;
                if (teamErrors && teamErrors[index]) {
                    const fieldError = teamErrors[index]?.[subField];
                    if (fieldError && typeof fieldError === 'object' && 'message' in fieldError && typeof fieldError.message === 'string') {
                        return fieldError.message;
                    }
                }
            }
        }

        // Root level fields
        const error = errors[fieldName as keyof typeof errors];
        if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
            return error.message;
        }

        if (serverErrors?.[fieldName]?.[0]) {
            return serverErrors[fieldName][0];
        }
        return null;
    };

    // Prepare options for MultiSelect
    const serviceOptions = servicesData?.data?.map(s => ({
        label: s.name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        value: (s as any)._id
    })) || [];

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col flex-1 h-full min-h-0 overflow-hidden">
            <ScrollArea className="flex-1 min-h-0 p-6">
                <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-muted">
                    <Users className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Basic Information</h3>
                </div>
                
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
                        {emailFields.map((field, index) => (
                            <div key={field.id} className="space-y-1">
                                <div className="flex gap-2">
                                    <Input
                                        {...register(`emails.${index}.value` as const)}
                                        type="email"
                                        placeholder="email@example.com"
                                        className={cn(getFieldError(`emails.${index}`) && 'border-destructive')}
                                    />
                                    {emailFields.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => removeEmail(index)}
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
                            onClick={() => appendEmail({ value: '' })}
                            className="w-full sm:w-auto"
                        >
                            <Plus className="h-4 w-4" />
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
                            value={status}
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

                    {/* Assigned Telemarketer (Handover) */}
                    <div className="space-y-2 col-span-1 md:col-span-2">
                        <Label>Assigned Telemarketer (Handover)</Label>
                        <Combobox
                            options={telemarketerOptions}
                            value={assignedTelemarketer || ''}
                            onChange={(val) => setValue('assignedTelemarketer', val)}
                            placeholder="Select telemarketer to hand over..."
                            searchPlaceholder="Search telemarketer by name or email..."
                            emptyText="No telemarketer found"
                        />
                        <p className="text-xs text-muted-foreground">
                            Hand over client ownership to a telemarketer. The assigned telemarketer will see all orders for this client.
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2 pb-2 border-b border-muted">
                    <Users className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Team Members</h3>
                </div>
                
                <div className="space-y-4">
                    {teamFields.map((field, index) => (
                        <Card key={field.id} className="relative overflow-hidden">
                            <button
                                type="button"
                                className="absolute top-2 right-2 text-muted-foreground hover:text-destructive transition-colors"
                                onClick={() => removeTeam(index)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">Name *</Label>
                                    <Input
                                        size={1}
                                        placeholder="Full Name"
                                        {...register(`teamMembers.${index}.name`)}
                                        className={cn(getFieldError(`teamMembers.${index}.name`) && 'border-destructive')}
                                    />
                                    {getFieldError(`teamMembers.${index}.name`) && (
                                        <p className="text-[10px] text-destructive">{getFieldError(`teamMembers.${index}.name`)}</p>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Email *</Label>
                                    <Input
                                        size={1}
                                        placeholder="email@example.com"
                                        {...register(`teamMembers.${index}.email`)}
                                        className={cn(getFieldError(`teamMembers.${index}.email`) && 'border-destructive')}
                                    />
                                    {getFieldError(`teamMembers.${index}.email`) && (
                                        <p className="text-[10px] text-destructive">{getFieldError(`teamMembers.${index}.email`)}</p>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Designation</Label>
                                    <Input
                                        size={1}
                                        placeholder="Job Title"
                                        {...register(`teamMembers.${index}.designation`)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Phone</Label>
                                    <Input
                                        size={1}
                                        placeholder="Phone"
                                        {...register(`teamMembers.${index}.phone`)}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => appendTeam({ name: '', email: '' })}
                        className="w-full"
                    >
                        <Plus className="h-4 w-4" />
                        Add Team Member
                    </Button>
                </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2 pb-2 border-b border-muted">
                    <Briefcase className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Service Assignment</h3>
                </div>
                
                <div className="space-y-2">
                    <Label>Select Services for this Client</Label>
                    <MultiSelect
                        options={serviceOptions}
                        selected={assignedServices}
                        onChange={(selected) => setValue('assignedServices', selected)}
                        placeholder="Pick services..."
                    />
                    <p className="text-[10px] text-muted-foreground italic">
                        If no services are assigned, all active services will be available during order creation.
                    </p>
                </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2 pb-2 border-b border-muted">
                    <h3 className="font-semibold font-mono text-sm">Additional Details</h3>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Currency */}
                    <div className="space-y-2">
                        <Label>Currency</Label>
                        <Select
                            value={currency || ''}
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
                </div>
            </ScrollArea>

            <div className="p-4 px-6 border-t border-border/60 bg-muted/20 shrink-0 flex items-center justify-end gap-3 font-semibold">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={isSubmitting || (!!clientIdError && !isEditMode)}
                    className="min-w-[120px]"
                >
                    {isSubmitting ? <Loader className="h-4 w-4 animate-spin" /> : null}
                    {submitLabel}
                </Button>
            </div>
        </form>
    );
}
