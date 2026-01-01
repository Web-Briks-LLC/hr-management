'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createOrderSchema } from '@/validators/order.validator';
import {
    useGetServicesQuery,
    useCreateServiceMutation,
} from '@/redux/features/service/serviceApi';
import {
    useGetReturnFileFormatsQuery,
    useCreateReturnFileFormatMutation,
} from '@/redux/features/returnFileFormat/returnFileFormatApi';
import { useGetClientsQuery } from '@/redux/features/client/clientApi';
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { DatePicker } from '@/components/shared/DatePicker';
import { DateTimePicker } from '@/components/shared/DateTimePicker';
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
    priority?: OrderPriority;
    assignedTo?: string;
    notes?: string;
}

interface OrderFormProps {
    defaultValues?: OrderFormData;
    onSubmit: (data: OrderFormData) => Promise<void>;
    isSubmitting: boolean;
    submitLabel: string;
    onCancel: () => void;
    serverErrors?: Record<string, string[]>;
    isEditMode?: boolean;
}

export function OrderForm({
    defaultValues,
    onSubmit,
    isSubmitting,
    submitLabel,
    onCancel,
    serverErrors,
    isEditMode = false,
}: OrderFormProps) {
    const [selectedServices, setSelectedServices] = useState<string[]>(
        defaultValues?.services || []
    );
    const [orderDate, setOrderDate] = useState<Date | undefined>(
        defaultValues?.orderDate ? new Date(defaultValues.orderDate) : new Date()
    );
    const [deadline, setDeadline] = useState<Date | undefined>(
        defaultValues?.deadline ? new Date(defaultValues.deadline) : undefined
    );
    const [isNewServiceDialogOpen, setIsNewServiceDialogOpen] = useState(false);
    const [isNewFormatDialogOpen, setIsNewFormatDialogOpen] = useState(false);
    const [newServiceName, setNewServiceName] = useState('');
    const [newServiceDescription, setNewServiceDescription] = useState('');
    const [newFormatName, setNewFormatName] = useState('');
    const [newFormatExtension, setNewFormatExtension] = useState('');

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        watch,
        setError,
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
            assignedTo: '',
            notes: '',
        },
    });

    const { data: servicesData, isLoading: isLoadingServices } =
        useGetServicesQuery({ isActive: true });
    const { data: formatsData, isLoading: isLoadingFormats } =
        useGetReturnFileFormatsQuery({ isActive: true });
    const { data: clientsData, isLoading: isLoadingClients } =
        useGetClientsQuery({ limit: 100 });

    const [createService, { isLoading: isCreatingService }] =
        useCreateServiceMutation();
    const [createFormat, { isLoading: isCreatingFormat }] =
        useCreateReturnFileFormatMutation();

    const services = servicesData?.data || [];
    const formats = formatsData?.data || [];
    const clients = clientsData?.clients || [];

    const imageQuantity = watch('imageQuantity');
    const perImagePrice = watch('perImagePrice');
    const totalPrice = watch('totalPrice');

    // Track which field the user is editing - 'perImage' or 'total'
    const [priceMode, setPriceMode] = useState<'perImage' | 'total'>('perImage');

    // Auto-calculate based on which field was last edited
    useEffect(() => {
        const qty = Number(imageQuantity) || 0;

        if (priceMode === 'perImage') {
            // User entered per image price, calculate total
            const price = Number(perImagePrice) || 0;
            const calculatedTotal = Number((qty * price).toFixed(2));
            setValue('totalPrice', calculatedTotal);
        } else {
            // User entered total price, calculate per image
            const total = Number(totalPrice) || 0;
            if (qty > 0) {
                const calculatedPerImage = Number((total / qty).toFixed(2));
                setValue('perImagePrice', calculatedPerImage);
            }
        }
    }, [imageQuantity, perImagePrice, totalPrice, priceMode, setValue]);


    // Set server errors
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

    // Update services in form
    useEffect(() => {
        setValue('services', selectedServices);
    }, [selectedServices, setValue]);

    // Update dates in form
    useEffect(() => {
        if (orderDate) {
            setValue('orderDate', orderDate.toISOString().split('T')[0]);
        }
    }, [orderDate, setValue]);

    useEffect(() => {
        if (deadline) {
            // Store full ISO string with time for deadline
            setValue('deadline', deadline.toISOString());
        }
    }, [deadline, setValue]);

    const handleServiceToggle = (serviceId: string) => {
        setSelectedServices((prev) =>
            prev.includes(serviceId)
                ? prev.filter((id) => id !== serviceId)
                : [...prev, serviceId]
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
            setIsNewServiceDialogOpen(false);
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
            setIsNewFormatDialogOpen(false);
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
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
            {/* Order Name */}
            <div className="space-y-2">
                <Label htmlFor="orderName">Order Name *</Label>
                <Input
                    id="orderName"
                    {...register('orderName')}
                    placeholder="Product Photo Editing Batch 1"
                />
                {errors.orderName && (
                    <p className="text-sm text-destructive">
                        {errors.orderName.message}
                    </p>
                )}
            </div>

            {/* Client */}
            <div className="space-y-2">
                <Label htmlFor="clientId">Client *</Label>
                <Select
                    value={watch('clientId')}
                    onValueChange={(value) => setValue('clientId', value)}
                    disabled={isLoadingClients}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                        {clients.map((client) => (
                            <SelectItem key={client._id} value={client._id}>
                                {client.name} ({client.clientId})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.clientId && (
                    <p className="text-sm text-destructive">
                        {errors.clientId.message}
                    </p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Order Date */}
                <div className="space-y-2">
                    <DatePicker
                        label="Order Date *"
                        value={orderDate}
                        onChange={setOrderDate}
                        placeholder="Select order date"
                    />
                    {errors.orderDate && (
                        <p className="text-sm text-destructive">
                            {errors.orderDate.message}
                        </p>
                    )}
                </div>

                {/* Deadline */}
                <div className="space-y-2">
                    <DateTimePicker
                        label="Deadline *"
                        value={deadline}
                        onChange={setDeadline}
                        placeholder="Select deadline with time"
                        minDate={orderDate}
                    />
                    {errors.deadline && (
                        <p className="text-sm text-destructive">
                            {errors.deadline.message}
                        </p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                {/* Image Quantity */}
                <div className="space-y-2">
                    <Label htmlFor="imageQuantity">Image Quantity *</Label>
                    <Input
                        id="imageQuantity"
                        type="number"
                        min="1"
                        {...register('imageQuantity', { valueAsNumber: true })}
                    />
                    {errors.imageQuantity && (
                        <p className="text-sm text-destructive">
                            {errors.imageQuantity.message}
                        </p>
                    )}
                </div>

                {/* Per Image Price */}
                <div className="space-y-2">
                    <Label htmlFor="perImagePrice">Per Image Price ($) *</Label>
                    <Input
                        id="perImagePrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={perImagePrice || ''}
                        onChange={(e) => {
                            setPriceMode('perImage');
                            setValue('perImagePrice', Number(e.target.value) || 0);
                        }}
                    />
                    {errors.perImagePrice && (
                        <p className="text-sm text-destructive">
                            {errors.perImagePrice.message}
                        </p>
                    )}
                </div>

                {/* Total Price */}
                <div className="space-y-2">
                    <Label htmlFor="totalPrice">Total Price ($)</Label>
                    <Input
                        id="totalPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={totalPrice || ''}
                        onChange={(e) => {
                            setPriceMode('total');
                            setValue('totalPrice', Number(e.target.value) || 0);
                        }}
                    />
                </div>

            </div>



            {/* Services */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label>Services *</Label>
                    <Dialog
                        open={isNewServiceDialogOpen}
                        onOpenChange={setIsNewServiceDialogOpen}
                    >
                        <DialogTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                New Service
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Service</DialogTitle>
                                <DialogDescription>
                                    Add a new service type
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Service Name *</Label>
                                    <Input
                                        value={newServiceName}
                                        onChange={(e) =>
                                            setNewServiceName(e.target.value)
                                        }
                                        placeholder="e.g., Clipping Path"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Textarea
                                        value={newServiceDescription}
                                        onChange={(e) =>
                                            setNewServiceDescription(
                                                e.target.value
                                            )
                                        }
                                        placeholder="Optional description"
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            setIsNewServiceDialogOpen(false)
                                        }
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={handleCreateService}
                                        disabled={isCreatingService}
                                    >
                                        {isCreatingService && (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        )}
                                        Create
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
                {isLoadingServices ? (
                    <p className="text-sm text-muted-foreground">
                        Loading services...
                    </p>
                ) : (
                    <div className="grid grid-cols-2 gap-2 p-3 border rounded-md max-h-40 overflow-y-auto">
                        {services.map((service) => (
                            <div
                                key={service._id}
                                className="flex items-center space-x-2"
                            >
                                <Checkbox
                                    id={`service-${service._id}`}
                                    checked={selectedServices.includes(
                                        service._id
                                    )}
                                    onCheckedChange={() =>
                                        handleServiceToggle(service._id)
                                    }
                                />
                                <Label
                                    htmlFor={`service-${service._id}`}
                                    className="text-sm cursor-pointer"
                                >
                                    {service.name}
                                </Label>
                            </div>
                        ))}
                    </div>
                )}
                {errors.services && (
                    <p className="text-sm text-destructive">
                        {errors.services.message}
                    </p>
                )}
            </div>

            {/* Return File Format */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label>Return File Format *</Label>
                    <Dialog
                        open={isNewFormatDialogOpen}
                        onOpenChange={setIsNewFormatDialogOpen}
                    >
                        <DialogTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                New Format
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>
                                    Create New File Format
                                </DialogTitle>
                                <DialogDescription>
                                    Add a new output file format
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Format Name *</Label>
                                    <Input
                                        value={newFormatName}
                                        onChange={(e) =>
                                            setNewFormatName(e.target.value)
                                        }
                                        placeholder="e.g., JPEG"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Extension *</Label>
                                    <Input
                                        value={newFormatExtension}
                                        onChange={(e) =>
                                            setNewFormatExtension(
                                                e.target.value
                                            )
                                        }
                                        placeholder="e.g., jpg"
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            setIsNewFormatDialogOpen(false)
                                        }
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={handleCreateFormat}
                                        disabled={isCreatingFormat}
                                    >
                                        {isCreatingFormat && (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        )}
                                        Create
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
                <Select
                    value={watch('returnFileFormat')}
                    onValueChange={(value) =>
                        setValue('returnFileFormat', value)
                    }
                    disabled={isLoadingFormats}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select file format" />
                    </SelectTrigger>
                    <SelectContent>
                        {formats.map((format) => (
                            <SelectItem key={format._id} value={format._id}>
                                {format.name} (.{format.extension})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.returnFileFormat && (
                    <p className="text-sm text-destructive">
                        {errors.returnFileFormat.message}
                    </p>
                )}
            </div>

            {/* Priority */}
            <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                    value={watch('priority')}
                    onValueChange={(value) =>
                        setValue('priority', value as OrderPriority)
                    }
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Instructions */}
            <div className="space-y-2">
                <Label htmlFor="instruction">Instructions</Label>
                <Textarea
                    id="instruction"
                    {...register('instruction')}
                    placeholder="Special instructions for this order..."
                    rows={3}
                />
                {errors.instruction && (
                    <p className="text-sm text-destructive">
                        {errors.instruction.message}
                    </p>
                )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
                <Label htmlFor="notes">Internal Notes</Label>
                <Textarea
                    id="notes"
                    {...register('notes')}
                    placeholder="Internal notes (not visible to client)..."
                    rows={2}
                />
                {errors.notes && (
                    <p className="text-sm text-destructive">
                        {errors.notes.message}
                    </p>
                )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {submitLabel}
                </Button>
            </div>
        </form>
    );
}
