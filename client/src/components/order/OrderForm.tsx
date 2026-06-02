'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { createOrderSchema } from '@/validators/order.validator';
import {
    useGetServicesQuery,
    useCreateServiceMutation,
} from '@/redux/features/service/serviceApi';
import {
    useGetReturnFileFormatsQuery,
    useCreateReturnFileFormatMutation,
} from '@/redux/features/returnFileFormat/returnFileFormatApi';
import {
    useGetAllClientsQuery,
    useGetAssignedServicesQuery,
} from '@/redux/features/client/clientApi';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Loader2,
    Plus,
    X,
    Check,
    ChevronsUpDown,
    Filter,
    Package,
    Users,
    CalendarDays,
    ImageIcon,
    DollarSign,
    Layers,
    FileType,
    Flag,
    FileText,
    StickyNote,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { DatePicker } from '@/components/shared/DatePicker';
import { DateTimePicker } from '@/components/shared/DateTimePicker';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { OrderPriority } from '@/types/order.type';

export interface OrderFormData {
    orderName: string;
    clientId: string;
    orderDate: string;
    deadline: string;
    imageQuantity: number;
    perImagePrice: number;
    totalPrice: number;
    services: string[];
    returnFileFormat: string;
    instruction?: string;
    priority: OrderPriority;
    contactPersonId?: string;
    notes?: string;
}

interface OrderFormProps {
    defaultValues?: OrderFormData;
    onSubmit: (data: OrderFormData) => Promise<void>;
    isSubmitting: boolean;
    submitLabel: string;
    onCancel: () => void;
    serverErrors?: Record<string, string[]>;
}

export function OrderForm({
    defaultValues,
    onSubmit,
    isSubmitting,
    submitLabel,
    onCancel,
    serverErrors,
}: OrderFormProps) {
    const [selectedServices, setSelectedServices] = useState<string[]>(
        defaultValues?.services || [],
    );
    const [orderDate, setOrderDate] = useState<Date | undefined>(
        defaultValues?.orderDate
            ? new Date(defaultValues.orderDate)
            : new Date(),
    );
    const [deadline, setDeadline] = useState<Date | undefined>(
        defaultValues?.deadline ? new Date(defaultValues.deadline) : undefined,
    );
    const [isNewServiceMode, setIsNewServiceMode] = useState(false);
    const [isNewFormatMode, setIsNewFormatMode] = useState(false);
    const [newServiceName, setNewServiceName] = useState('');
    const [newServiceDescription, setNewServiceDescription] = useState('');
    const [newFormatName, setNewFormatName] = useState('');
    const [newFormatExtension, setNewFormatExtension] = useState('');
    const [showAllServices, setShowAllServices] = useState(false);
    const [serviceSearchInput, setServiceSearchInput] = useState('');
    const [debouncedServiceSearch, setDebouncedServiceSearch] = useState('');
    const [openClient, setOpenClient] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        setError,
        control,
    } = useForm<OrderFormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(createOrderSchema) as any,
        defaultValues: defaultValues || {
            orderName: '',
            clientId: '',
            orderDate: new Date().toISOString().split('T')[0],
            deadline: '',
            imageQuantity: 1,
            perImagePrice: 0,
            totalPrice: 0,
            services: [],
            returnFileFormat: '',
            instruction: '',
            priority: 'normal',
            contactPersonId: '',
            notes: '',
        },
    });

    const clientId = useWatch({ control, name: 'clientId' });
    const contactPersonId = useWatch({ control, name: 'contactPersonId' });
    const priority = useWatch({ control, name: 'priority' });
    const returnFileFormat = useWatch({ control, name: 'returnFileFormat' });

    const { data: servicesData, isLoading: isLoadingServices } =
        useGetServicesQuery({ isActive: true, limit: 1000 });
    const { data: assignedServices, isLoading: isLoadingAssigned } =
        useGetAssignedServicesQuery(clientId, { skip: !clientId });
    const { data: formatsData, isLoading: isLoadingFormats } =
        useGetReturnFileFormatsQuery({ isActive: true });
    const { data: clientsData, isLoading: isLoadingClients } =
        useGetAllClientsQuery({ status: 'active' });

    const [createService, { isLoading: isCreatingService }] =
        useCreateServiceMutation();
    const [createFormat, { isLoading: isCreatingFormat }] =
        useCreateReturnFileFormatMutation();

    const allServices = useMemo(() => servicesData?.data || [], [servicesData]);
    const formats = useMemo(() => formatsData?.data || [], [formatsData]);
    const clients = useMemo(() => clientsData || [], [clientsData]);

    const services = useMemo(() => {
        if (!clientId || showAllServices) return allServices;
        if (assignedServices && assignedServices.length > 0) {
            return assignedServices;
        }
        return allServices;
    }, [clientId, showAllServices, assignedServices, allServices]);

    const selectedClient = useMemo(() => {
        return clients.find((c) => c._id === clientId);
    }, [clientId, clients]);

    const teamMembers = selectedClient?.teamMembers || [];
    const hasAssignedServices = assignedServices && assignedServices.length > 0;

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedServiceSearch(serviceSearchInput);
        }, 300);
        return () => clearTimeout(timer);
    }, [serviceSearchInput]);

    const filteredServices = useMemo(() => {
        if (!debouncedServiceSearch.trim()) return services;
        const searchLower = debouncedServiceSearch.toLowerCase();
        return services.filter((service: { name: string }) =>
            service.name.toLowerCase().includes(searchLower),
        );
    }, [services, debouncedServiceSearch]);

    const imageQuantity = useWatch({ control, name: 'imageQuantity' });
    const perImagePrice = useWatch({ control, name: 'perImagePrice' });
    const totalPrice = useWatch({ control, name: 'totalPrice' });

    const [priceMode, setPriceMode] = useState<'perImage' | 'total'>(
        'perImage',
    );

    useEffect(() => {
        const qty = Number(imageQuantity) || 0;
        if (priceMode === 'perImage') {
            const price = Number(perImagePrice) || 0;
            const calculatedTotal = Number((qty * price).toFixed(2));
            setValue('totalPrice', calculatedTotal);
        } else {
            const total = Number(totalPrice) || 0;
            if (qty > 0) {
                const calculatedPerImage = Number((total / qty).toFixed(2));
                setValue('perImagePrice', calculatedPerImage);
            }
        }
    }, [imageQuantity, perImagePrice, totalPrice, priceMode, setValue]);

    useEffect(() => {
        if (serverErrors) {
            Object.entries(serverErrors).forEach(([key, messages]) => {
                setError(key as keyof OrderFormData, {
                    type: 'server',
                    message: messages[0],
                });
            });
        }
    }, [serverErrors, setError]);

    useEffect(() => {
        setValue('services', selectedServices);
    }, [selectedServices, setValue]);

    useEffect(() => {
        if (orderDate) {
            setValue('orderDate', format(orderDate, 'yyyy-MM-dd'));
        }
    }, [orderDate, setValue]);

    useEffect(() => {
        if (deadline) {
            setValue('deadline', deadline.toISOString());
        }
    }, [deadline, setValue]);

    const handleServiceToggle = (serviceId: string) => {
        setSelectedServices((prev) =>
            prev.includes(serviceId)
                ? prev.filter((id) => id !== serviceId)
                : [...prev, serviceId],
        );
    };

    const handleCreateService = async () => {
        if (!newServiceName.trim()) {
            toast.error('Service name is required');
            return;
        }
        try {
            const result = await createService({
                name: newServiceName,
                description: newServiceDescription,
            }).unwrap();
            toast.success('Service created successfully');
            setSelectedServices((prev) => [...prev, result.data._id]);
            setNewServiceName('');
            setNewServiceDescription('');
            setIsNewServiceMode(false);
        } catch (error: unknown) {
            const err = error as { data?: { message?: string } };
            toast.error(err?.data?.message || 'Failed to create service');
        }
    };

    const handleCreateFormat = async () => {
        if (!newFormatName.trim() || !newFormatExtension.trim()) {
            toast.error('Format name and extension are required');
            return;
        }
        try {
            const result = await createFormat({
                name: newFormatName,
                extension: newFormatExtension,
            }).unwrap();
            toast.success('File format created successfully');
            setValue('returnFileFormat', result.data._id);
            setNewFormatName('');
            setNewFormatExtension('');
            setIsNewFormatMode(false);
        } catch (error: unknown) {
            const err = error as { data?: { message?: string } };
            toast.error(err?.data?.message || 'Failed to create file format');
        }
    };

    const onFormSubmit = (data: OrderFormData) => {
        onSubmit({
            ...data,
            services: selectedServices,
        });
    };

    return (
        <form
            onSubmit={handleSubmit(onFormSubmit)}
            className="flex flex-col overflow-hidden h-full"
        >
            <div className="flex-1 min-h-0 overflow-y-auto px-6">
                <div className="space-y-5 py-5">
                    {/* Order Name */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                            <Package className="h-3.5 w-3.5 text-muted-foreground" />
                            Order Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            {...register('orderName')}
                            placeholder="e.g. Product Photo Editing Batch 1"
                            className="h-10"
                        />
                        {errors.orderName && (
                            <p className="text-xs text-destructive">
                                {errors.orderName.message}
                            </p>
                        )}
                    </div>

                    {/* Client Select */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            Client <span className="text-destructive">*</span>
                        </Label>
                        <Popover open={openClient} onOpenChange={setOpenClient}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openClient}
                                    className="w-full justify-between h-10 font-normal"
                                    disabled={isLoadingClients}
                                >
                                    <span
                                        className={cn(
                                            'truncate',
                                            !clientId && 'text-muted-foreground',
                                        )}
                                    >
                                        {clientId
                                            ? clients.find(
                                                  (c: { _id: string }) =>
                                                      c._id === clientId,
                                              )?.name
                                            : 'Select client...'}
                                    </span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="p-0"
                                style={{
                                    width: 'var(--radix-popover-trigger-width)',
                                }}
                            >
                                <Command>
                                    <CommandInput placeholder="Search client..." />
                                    <CommandList>
                                        <CommandEmpty>
                                            No client found.
                                        </CommandEmpty>
                                        <CommandGroup>
                                            {clients.map((client) => (
                                                <CommandItem
                                                    key={client._id}
                                                    value={client.name}
                                                    keywords={[
                                                        client.name,
                                                        client.clientId,
                                                    ]}
                                                    onSelect={() => {
                                                        setValue(
                                                            'clientId',
                                                            client._id,
                                                        );
                                                        setValue(
                                                            'contactPersonId',
                                                            '',
                                                        );
                                                        setOpenClient(false);
                                                        setShowAllServices(
                                                            false,
                                                        );
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            'mr-2 h-4 w-4',
                                                            clientId ===
                                                                client._id
                                                                ? 'opacity-100'
                                                                : 'opacity-0',
                                                        )}
                                                    />
                                                    {client.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        {errors.clientId && (
                            <p className="text-xs text-destructive">
                                {errors.clientId.message}
                            </p>
                        )}
                    </div>

                    {/* Contact Person */}
                    {clientId && teamMembers.length > 0 && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                            <Label className="text-sm font-medium">
                                Team Member
                            </Label>
                            <Select
                                value={contactPersonId || '_none'}
                                onValueChange={(value) =>
                                    setValue(
                                        'contactPersonId',
                                        value === '_none' ? '' : value,
                                    )
                                }
                            >
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Select team member" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_none">None</SelectItem>
                                    {teamMembers.map((member) => (
                                        <SelectItem
                                            key={member._id}
                                            value={member._id!}
                                        >
                                            {member.name}{' '}
                                            {member.designation
                                                ? `(${member.designation})`
                                                : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <Separator />

                    {/* Date & Deadline Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium flex items-center gap-2">
                                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                                Order Date{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <DatePicker
                                value={orderDate}
                                onChange={setOrderDate}
                                placeholder="Select order date"
                            />
                            {errors.orderDate && (
                                <p className="text-xs text-destructive">
                                    {errors.orderDate.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium flex items-center gap-2">
                                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                                Deadline{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <DateTimePicker
                                value={deadline}
                                onChange={setDeadline}
                                placeholder="Select deadline"
                                minDate={orderDate}
                            />
                            {errors.deadline && (
                                <p className="text-xs text-destructive">
                                    {errors.deadline.message}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Quantity & Pricing Row */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium flex items-center gap-2">
                                <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                Quantity{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                type="number"
                                min="1"
                                className="h-10"
                                {...register('imageQuantity', {
                                    valueAsNumber: true,
                                })}
                            />
                            {errors.imageQuantity && (
                                <p className="text-xs text-destructive">
                                    {errors.imageQuantity.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium flex items-center gap-2">
                                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                                Per Image ($)
                            </Label>
                            <Input
                                type="number"
                                step="any"
                                min="0"
                                className="h-10"
                                value={perImagePrice || ''}
                                onChange={(e) => {
                                    setPriceMode('perImage');
                                    setValue(
                                        'perImagePrice',
                                        Number(e.target.value) || 0,
                                    );
                                }}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium flex items-center gap-2">
                                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                                Total ($)
                            </Label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                className="h-10"
                                value={totalPrice || ''}
                                onChange={(e) => {
                                    setPriceMode('total');
                                    setValue(
                                        'totalPrice',
                                        Number(e.target.value) || 0,
                                    );
                                }}
                            />
                        </div>
                    </div>

                    <Separator />

                    {/* Services */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium flex items-center gap-2">
                                <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                                Services{' '}
                                <span className="text-destructive">*</span>
                                {clientId && hasAssignedServices && (
                                    <Badge
                                        variant={
                                            showAllServices
                                                ? 'outline'
                                                : 'secondary'
                                        }
                                        className="text-[10px] cursor-pointer ml-1"
                                        onClick={() =>
                                            setShowAllServices(!showAllServices)
                                        }
                                    >
                                        <Filter className="h-3 w-3 mr-1" />
                                        {showAllServices
                                            ? 'Showing All'
                                            : 'Assigned'}
                                    </Badge>
                                )}
                            </Label>
                            <Button
                                type="button"
                                variant={
                                    isNewServiceMode ? 'secondary' : 'outline'
                                }
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() =>
                                    setIsNewServiceMode(!isNewServiceMode)
                                }
                            >
                                {isNewServiceMode ? (
                                    <>
                                        <X className="h-3 w-3" /> Cancel
                                    </>
                                ) : (
                                    <>
                                        <Plus className="h-3 w-3" /> New
                                    </>
                                )}
                            </Button>
                        </div>

                        {isNewServiceMode && (
                            <div className="p-3 border rounded-lg bg-muted/30 space-y-3 animate-in fade-in slide-in-from-top-2">
                                <Input
                                    value={newServiceName}
                                    onChange={(e) =>
                                        setNewServiceName(e.target.value)
                                    }
                                    placeholder="Service name"
                                    className="h-9"
                                />
                                <Textarea
                                    value={newServiceDescription}
                                    onChange={(e) =>
                                        setNewServiceDescription(e.target.value)
                                    }
                                    placeholder="Description (optional)"
                                    rows={2}
                                    className="resize-none"
                                />
                                <div className="flex justify-end">
                                    <Button
                                        type="button"
                                        onClick={handleCreateService}
                                        disabled={isCreatingService}
                                        size="sm"
                                        className="h-8"
                                    >
                                        {isCreatingService && (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        )}
                                        Create
                                    </Button>
                                </div>
                            </div>
                        )}

                        <Input
                            placeholder="Search services..."
                            value={serviceSearchInput}
                            onChange={(e) =>
                                setServiceSearchInput(e.target.value)
                            }
                            className="h-9"
                        />

                        {isLoadingServices ||
                        (clientId && isLoadingAssigned) ? (
                            <div className="flex items-center justify-center p-6 border rounded-md">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-1.5 p-3 border rounded-md max-h-36 overflow-y-auto">
                                {filteredServices.length === 0 ? (
                                    <p className="text-sm text-muted-foreground col-span-2 text-center py-4">
                                        No services found
                                    </p>
                                ) : (
                                    filteredServices.map((service) => (
                                        <div
                                            key={service._id}
                                            className={cn(
                                                'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
                                                selectedServices.includes(
                                                    service._id,
                                                )
                                                    ? 'bg-primary/5'
                                                    : 'hover:bg-accent',
                                            )}
                                            onClick={() =>
                                                handleServiceToggle(service._id)
                                            }
                                        >
                                            <Checkbox
                                                checked={selectedServices.includes(
                                                    service._id,
                                                )}
                                                className="pointer-events-none"
                                            />
                                            <span className="text-sm truncate">
                                                {service.name}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                        {errors.services && (
                            <p className="text-xs text-destructive">
                                {errors.services.message}
                            </p>
                        )}
                    </div>

                    {/* Return File Format & Priority Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium flex items-center gap-2">
                                    <FileType className="h-3.5 w-3.5 text-muted-foreground" />
                                    File Format{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Button
                                    type="button"
                                    variant={
                                        isNewFormatMode ? 'secondary' : 'outline'
                                    }
                                    size="sm"
                                    className="h-6 text-[10px] px-2"
                                    onClick={() =>
                                        setIsNewFormatMode(!isNewFormatMode)
                                    }
                                >
                                    {isNewFormatMode ? (
                                        <X className="h-3 w-3" />
                                    ) : (
                                        <Plus className="h-3 w-3" />
                                    )}
                                </Button>
                            </div>

                            {isNewFormatMode && (
                                <div className="p-3 border rounded-lg bg-muted/30 space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <Input
                                        value={newFormatName}
                                        onChange={(e) =>
                                            setNewFormatName(e.target.value)
                                        }
                                        placeholder="Format name"
                                        className="h-8 text-sm"
                                    />
                                    <Input
                                        value={newFormatExtension}
                                        onChange={(e) =>
                                            setNewFormatExtension(e.target.value)
                                        }
                                        placeholder="Extension (e.g. jpg)"
                                        className="h-8 text-sm"
                                    />
                                    <Button
                                        type="button"
                                        onClick={handleCreateFormat}
                                        disabled={isCreatingFormat}
                                        size="sm"
                                        className="h-7 text-xs w-full"
                                    >
                                        {isCreatingFormat && (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        )}
                                        Create
                                    </Button>
                                </div>
                            )}

                            <Select
                                value={returnFileFormat}
                                onValueChange={(value) =>
                                    setValue('returnFileFormat', value)
                                }
                                disabled={isLoadingFormats}
                            >
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Select format" />
                                </SelectTrigger>
                                <SelectContent>
                                    {formats.map((fmt) => (
                                        <SelectItem
                                            key={fmt._id}
                                            value={fmt._id}
                                        >
                                            {fmt.name} (.{fmt.extension})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.returnFileFormat && (
                                <p className="text-xs text-destructive">
                                    {errors.returnFileFormat.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium flex items-center gap-2">
                                <Flag className="h-3.5 w-3.5 text-muted-foreground" />
                                Priority
                            </Label>
                            <Select
                                value={priority}
                                onValueChange={(value) =>
                                    setValue(
                                        'priority',
                                        value as OrderPriority,
                                    )
                                }
                            >
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="normal">
                                        Normal
                                    </SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="urgent">
                                        Urgent
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Separator />

                    {/* Instructions */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                            Instructions
                            <span className="text-muted-foreground font-normal text-xs">
                                (optional)
                            </span>
                        </Label>
                        <Textarea
                            {...register('instruction')}
                            placeholder="Special instructions for this order..."
                            rows={3}
                            className="resize-none"
                        />
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                            <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
                            Internal Notes
                            <span className="text-muted-foreground font-normal text-xs">
                                (optional)
                            </span>
                        </Label>
                        <Textarea
                            {...register('notes')}
                            placeholder="Internal notes (not visible to client)..."
                            rows={2}
                            className="resize-none"
                        />
                    </div>
                </div>
            </div>

            <Separator className="shrink-0" />

            {/* Footer */}
            <div className="px-6 py-4 shrink-0 flex justify-end gap-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isSubmitting}
                >
                    Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    {submitLabel}
                </Button>
            </div>
        </form>
    );
}
