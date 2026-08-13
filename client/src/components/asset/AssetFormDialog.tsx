'use client';

import { useState, useEffect, useMemo } from 'react';
import { z } from 'zod';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parse, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import {
    Loader,
    Plus,
    Trash2,
    Sparkles,
    Laptop,
    Armchair,
    Coffee,
    Tv,
    FileText,
    Key,
    Car,
    Box,
    Layers,
    DollarSign,
    MapPin,
    Calendar as CalendarIcon,
    Shield,
    Check,
    ChevronRight,
    ChevronLeft,
    X,
    AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    useCreateAssetMutation,
    useUpdateAssetMutation,
    useLazyGetNextAssetTagQuery,
} from '@/redux/features/asset/assetApi';
import { useGetAllBranchesQuery } from '@/redux/features/branch/branchApi';
import { useGetStaffsQuery } from '@/redux/features/staff/staffApi';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import type {
    IAsset,
    AssetCategory,
    AssetStatus,
    AssetCondition,
} from '@/types/asset.type';
import {
    ASSET_CATEGORIES,
    ASSET_STATUS_CONFIG,
    ASSET_CONDITION_CONFIG,
} from '@/types/asset.type';

// Safe Local Date Helpers (Timezone-agnostic, prevents 1-day offset)
const parseLocalDate = (dateStr?: string | null): Date | undefined => {
    if (!dateStr) return undefined;
    const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parsed = parse(clean, 'yyyy-MM-dd', new Date());
    return isValid(parsed) ? parsed : undefined;
};

const formatLocalDateStr = (date?: Date | null): string => {
    if (!date || !isValid(date)) return '';
    return format(date, 'yyyy-MM-dd');
};

const formatDisplayDate = (dateStr?: string | null): string => {
    const d = parseLocalDate(dateStr);
    return d ? format(d, 'PPP') : '';
};

// Client-Side Zod Validation Schema
export const assetFormClientSchema = z.object({
    name: z.string().trim().min(1, 'Asset name is required').max(200, 'Asset name must be less than 200 characters'),
    category: z.enum([
        'electronics_it',
        'furniture_fixture',
        'office_supplies_pantry',
        'appliances_facilities',
        'documents_legal',
        'software_licenses',
        'vehicles_machinery',
        'other',
    ], { message: 'Valid category is required' }),
    quantity: z.number({ message: 'Quantity must be a number' }).min(1, 'Quantity must be at least 1'),
    unit: z.string().trim().min(1, 'Unit of measure is required'),
    purchasePrice: z.number().min(0, 'Purchase price cannot be negative'),
    currency: z.string().trim().min(1, 'Currency is required'),
    status: z.enum([
        'in_use',
        'in_stock',
        'maintenance',
        'damaged',
        'disposed',
        'lost',
        'expired',
    ], { message: 'Status is required' }),
    condition: z.enum(['new', 'good', 'fair', 'poor', 'damaged'], { message: 'Condition is required' }),
    assetTag: z.string().optional(),
    subCategory: z.string().optional(),
    currentValue: z.number().optional(),
    purchaseDate: z.string().optional(),
    location: z.string().optional(),
    branchId: z.string().optional(),
    assignedTo: z.string().optional(),
    assignedDepartment: z.string().optional(),
    assignedDate: z.string().optional(),
    vendor: z.string().optional(),
    invoiceNumber: z.string().optional(),
    serialNumber: z.string().optional(),
    modelNumber: z.string().optional(),
    warrantyExpiry: z.string().optional(),
    expiryDate: z.string().optional(),
    notes: z.string().optional(),
});

interface AssetFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    assetToEdit?: IAsset | null;
    onSuccess?: () => void;
}

const CATEGORY_ICONS: Record<AssetCategory, any> = {
    electronics_it: Laptop,
    furniture_fixture: Armchair,
    office_supplies_pantry: Coffee,
    appliances_facilities: Tv,
    documents_legal: FileText,
    software_licenses: Key,
    vehicles_machinery: Car,
    other: Box,
};

const SUGGESTED_SPECS: Record<AssetCategory, { key: string; label: string; placeholder: string }[]> = {
    electronics_it: [
        { key: 'processor', label: 'Processor / CPU', placeholder: 'e.g. Apple M3 Max, Intel i7-13700' },
        { key: 'ram', label: 'RAM / Memory', placeholder: 'e.g. 16GB, 32GB DDR5' },
        { key: 'storage', label: 'Storage', placeholder: 'e.g. 512GB NVMe SSD, 1TB HDD' },
        { key: 'os', label: 'Operating System', placeholder: 'e.g. macOS Sonoma, Windows 11 Pro' },
        { key: 'display', label: 'Display Size / Spec', placeholder: 'e.g. 16-inch Liquid Retina XDR' },
    ],
    furniture_fixture: [
        { key: 'material', label: 'Material', placeholder: 'e.g. Ergonomic Mesh, Solid Teak Wood' },
        { key: 'color', label: 'Color / Finish', placeholder: 'e.g. Matte Black, Walnut Wood' },
        { key: 'dimensions', label: 'Dimensions', placeholder: 'e.g. 120cm x 60cm x 75cm' },
    ],
    office_supplies_pantry: [
        { key: 'material', label: 'Material / Type', placeholder: 'e.g. Ceramic, Rubber, Plastic' },
        { key: 'size', label: 'Size / Capacity', placeholder: 'e.g. 350ml, Size 42 (Sandals), 20 Liters' },
        { key: 'color', label: 'Color', placeholder: 'e.g. White, Navy Blue' },
    ],
    appliances_facilities: [
        { key: 'power_capacity', label: 'Power / Capacity', placeholder: 'e.g. 2 Ton, 800W, 250 Liters' },
        { key: 'energy_rating', label: 'Energy Rating', placeholder: 'e.g. 5 Star Inverter' },
        { key: 'voltage', label: 'Voltage / Input', placeholder: 'e.g. 220V - 240V' },
    ],
    documents_legal: [
        { key: 'doc_number', label: 'Registration / Document No.', placeholder: 'e.g. TRAD/DSCC/012932' },
        { key: 'issuing_authority', label: 'Issuing Authority', placeholder: 'e.g. City Corporation, RJSC, NBR' },
        { key: 'renewal_frequency', label: 'Renewal Cycle', placeholder: 'e.g. Annual, Every 3 Years' },
    ],
    software_licenses: [
        { key: 'plan_tier', label: 'Plan / Tier', placeholder: 'e.g. Enterprise, Pro, Business Plus' },
        { key: 'seats_count', label: 'Allocated Seats', placeholder: 'e.g. 25 Seats, Unlimited' },
        { key: 'billing_cycle', label: 'Billing Cycle', placeholder: 'e.g. Monthly, Annually' },
    ],
    vehicles_machinery: [
        { key: 'license_plate', label: 'Registration / Plate No.', placeholder: 'e.g. DHAKA METRO-HA-11-2233' },
        { key: 'fuel_type', label: 'Fuel / Engine Type', placeholder: 'e.g. Octane, Diesel, Electric' },
    ],
    other: [
        { key: 'attribute_1', label: 'Custom Spec', placeholder: 'Value' },
    ],
};

type StepId = 'basic' | 'financial' | 'assignment' | 'specs';

const FORM_STEPS: { id: StepId; label: string; icon: any; stepNumber: number }[] = [
    { id: 'basic', label: 'Basic Info', icon: Box, stepNumber: 1 },
    { id: 'financial', label: 'Financial & Vendor', icon: DollarSign, stepNumber: 2 },
    { id: 'assignment', label: 'Location & Assignment', icon: MapPin, stepNumber: 3 },
    { id: 'specs', label: 'Specifications', icon: Sparkles, stepNumber: 4 },
];

export function AssetFormDialog({
    open,
    onOpenChange,
    assetToEdit,
    onSuccess,
}: AssetFormDialogProps) {
    const isEdit = !!assetToEdit;

    // Form State
    const [activeTab, setActiveTab] = useState<StepId>('basic');
    const [name, setName] = useState('');
    const [assetTag, setAssetTag] = useState('');
    const [category, setCategory] = useState<AssetCategory>('electronics_it');
    const [subCategory, setSubCategory] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [unit, setUnit] = useState('pcs');
    const [purchasePrice, setPurchasePrice] = useState<number>(0);
    const [currency, setCurrency] = useState('BDT');
    const [currentValue, setCurrentValue] = useState<string>('');
    const [purchaseDate, setPurchaseDate] = useState<string>('');
    const [status, setStatus] = useState<AssetStatus>('in_use');
    const [condition, setCondition] = useState<AssetCondition>('new');
    const [location, setLocation] = useState('');
    const [branchId, setBranchId] = useState<string>('');
    const [assignedTo, setAssignedTo] = useState<string>('');
    const [assignedDepartment, setAssignedDepartment] = useState('');
    const [assignedDate, setAssignedDate] = useState('');
    const [vendor, setVendor] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [serialNumber, setSerialNumber] = useState('');
    const [modelNumber, setModelNumber] = useState('');
    const [warrantyExpiry, setWarrantyExpiry] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [notes, setNotes] = useState('');

    // Interaction & touch tracking (prevents error display before user interaction/submission)
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [isSubmitted, setIsSubmitted] = useState(false);

    // Dynamic specs state: key-value array
    const [specList, setSpecList] = useState<{ key: string; value: string }[]>([]);

    // API hooks
    const [createAsset, { isLoading: isCreating }] = useCreateAssetMutation();
    const [updateAsset, { isLoading: isUpdating }] = useUpdateAssetMutation();
    const [getNextTag, { isFetching: isFetchingTag }] = useLazyGetNextAssetTagQuery();
    const { data: branchesData } = useGetAllBranchesQuery({});
    const { data: staffsData, isLoading: isLoadingStaffs } = useGetStaffsQuery({ limit: 500 });

    const branches = useMemo(() => {
        return (branchesData?.branches || branchesData?.data || []) as any[];
    }, [branchesData]);

    const staffOptions: ComboboxOption[] = useMemo(() => {
        const list = (staffsData?.staffs || staffsData?.data?.staffs || staffsData?.data || []) as any[];
        return list.map((st) => {
            const name = st.user?.name || st.name;
            const label = name ? name : (st.staffId ? `${st.staffId} (${st.designation || 'Staff'})` : (st.designation || 'Staff Member'));
            return {
                value: st._id,
                label,
                description: name && st.designation ? `${st.designation} (${st.staffId || ''})` : undefined,
            };
        });
    }, [staffsData]);

    // Auto-calculate Total Cost
    const computedTotalCost = useMemo(() => {
        return (Number(quantity) || 0) * (Number(purchasePrice) || 0);
    }, [quantity, purchasePrice]);

    // Zod Real-Time Validation
    const validationResult = useMemo(() => {
        return assetFormClientSchema.safeParse({
            name: name.trim(),
            category,
            quantity: Number(quantity),
            unit: unit.trim(),
            purchasePrice: Number(purchasePrice) || 0,
            currency: currency.trim(),
            status,
            condition,
            assetTag: assetTag.trim() || undefined,
            subCategory: subCategory.trim() || undefined,
            currentValue: currentValue !== '' ? Number(currentValue) : undefined,
            purchaseDate: purchaseDate || undefined,
            location: location.trim() || undefined,
            branchId: branchId && branchId !== 'none' ? branchId : undefined,
            assignedTo: assignedTo && assignedTo !== 'none' ? assignedTo : undefined,
            assignedDepartment: assignedDepartment.trim() || undefined,
            assignedDate: assignedDate || undefined,
            vendor: vendor.trim() || undefined,
            invoiceNumber: invoiceNumber.trim() || undefined,
            serialNumber: serialNumber.trim() || undefined,
            modelNumber: modelNumber.trim() || undefined,
            warrantyExpiry: warrantyExpiry || undefined,
            expiryDate: expiryDate || undefined,
            notes: notes.trim() || undefined,
        });
    }, [
        name,
        category,
        quantity,
        unit,
        purchasePrice,
        currency,
        status,
        condition,
        assetTag,
        subCategory,
        currentValue,
        purchaseDate,
        location,
        branchId,
        assignedTo,
        assignedDepartment,
        assignedDate,
        vendor,
        invoiceNumber,
        serialNumber,
        modelNumber,
        warrantyExpiry,
        expiryDate,
        notes,
    ]);

    const isFormValid = validationResult.success;

    // Field-level error messages
    const fieldErrors = useMemo(() => {
        if (validationResult.success) return {};
        const errors: Record<string, string> = {};
        validationResult.error.issues.forEach((issue) => {
            const field = issue.path[0];
            if (field && !errors[String(field)]) {
                errors[String(field)] = issue.message;
            }
        });
        return errors;
    }, [validationResult]);

    // Helper: only show error if field has been interacted with or submission was attempted
    const shouldShowError = (field: string) => {
        return (isSubmitted || touched[field]) && !!fieldErrors[field];
    };

    const handleBlur = (field: string) => {
        setTouched((prev) => ({ ...prev, [field]: true }));
    };

    // Current Progress percentage
    const progressValue = useMemo(() => {
        switch (activeTab) {
            case 'basic': return 25;
            case 'financial': return 50;
            case 'assignment': return 75;
            case 'specs': return 100;
            default: return 25;
        }
    }, [activeTab]);

    const activeStepIndex = FORM_STEPS.findIndex((s) => s.id === activeTab);

    // Populate or reset form
    useEffect(() => {
        if (assetToEdit && open) {
            setName(assetToEdit.name || '');
            setAssetTag(assetToEdit.assetTag || '');
            setCategory(assetToEdit.category || 'electronics_it');
            setSubCategory(assetToEdit.subCategory || '');
            setQuantity(assetToEdit.quantity || 1);
            setUnit(assetToEdit.unit || 'pcs');
            setPurchasePrice(assetToEdit.purchasePrice || 0);
            setCurrency(assetToEdit.currency || 'BDT');
            setCurrentValue(assetToEdit.currentValue !== undefined ? String(assetToEdit.currentValue) : '');
            setPurchaseDate(assetToEdit.purchaseDate ? formatLocalDateStr(parseLocalDate(assetToEdit.purchaseDate)) : '');
            setStatus(assetToEdit.status || 'in_use');
            setCondition(assetToEdit.condition || 'new');
            setLocation(assetToEdit.location || '');
            setBranchId(assetToEdit.branchId?._id || (typeof assetToEdit.branchId === 'string' ? assetToEdit.branchId : ''));
            setAssignedTo(assetToEdit.assignedTo?._id || (typeof assetToEdit.assignedTo === 'string' ? assetToEdit.assignedTo : ''));
            setAssignedDepartment(assetToEdit.assignedDepartment || '');
            setAssignedDate(assetToEdit.assignedDate ? formatLocalDateStr(parseLocalDate(assetToEdit.assignedDate)) : '');
            setVendor(assetToEdit.vendor || '');
            setInvoiceNumber(assetToEdit.invoiceNumber || '');
            setSerialNumber(assetToEdit.serialNumber || '');
            setModelNumber(assetToEdit.modelNumber || '');
            setWarrantyExpiry(assetToEdit.warrantyExpiry ? formatLocalDateStr(parseLocalDate(assetToEdit.warrantyExpiry)) : '');
            setExpiryDate(assetToEdit.expiryDate ? formatLocalDateStr(parseLocalDate(assetToEdit.expiryDate)) : '');
            setNotes(assetToEdit.notes || '');

            // Specs
            const rawSpecs = assetToEdit.specifications || {};
            const specsArray = Object.entries(rawSpecs).map(([key, value]) => ({ key, value: String(value) }));
            setSpecList(specsArray);
            setTouched({});
            setIsSubmitted(false);
            setActiveTab('basic');
        } else if (open) {
            // Reset to defaults
            setName('');
            setAssetTag('');
            setCategory('electronics_it');
            setSubCategory('');
            setQuantity(1);
            setUnit('pcs');
            setPurchasePrice(0);
            setCurrency('BDT');
            setCurrentValue('');
            setPurchaseDate(formatLocalDateStr(new Date()));
            setStatus('in_use');
            setCondition('new');
            setLocation('');
            setBranchId('');
            setAssignedTo('');
            setAssignedDepartment('');
            setAssignedDate('');
            setVendor('');
            setInvoiceNumber('');
            setSerialNumber('');
            setModelNumber('');
            setWarrantyExpiry('');
            setExpiryDate('');
            setNotes('');
            setSpecList([]);
            setTouched({});
            setIsSubmitted(false);
            setActiveTab('basic');

            // Generate initial asset tag
            getNextTag('electronics_it').unwrap().then((res) => {
                if (res?.data?.assetTag) {
                    setAssetTag(res.data.assetTag);
                }
            }).catch(() => {});
        }
    }, [assetToEdit, open, getNextTag]);

    // Update tag when category changes on create mode
    const handleCategoryChange = (newCat: AssetCategory) => {
        setCategory(newCat);
        if (!isEdit) {
            getNextTag(newCat).unwrap().then((res) => {
                if (res?.data?.assetTag) {
                    setAssetTag(res.data.assetTag);
                }
            }).catch(() => {});
        }
    };

    // Add suggested spec
    const handleAddSuggestedSpec = (key: string) => {
        if (!specList.some((s) => s.key.toLowerCase() === key.toLowerCase())) {
            setSpecList([...specList, { key, value: '' }]);
        }
    };

    // Add custom spec row
    const handleAddCustomSpec = () => {
        setSpecList([...specList, { key: '', value: '' }]);
    };

    const handleRemoveSpec = (index: number) => {
        setSpecList(specList.filter((_, i) => i !== index));
    };

    const handleSpecChange = (index: number, field: 'key' | 'value', val: string) => {
        const updated = [...specList];
        updated[index][field] = val;
        setSpecList(updated);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitted(true);

        if (!isFormValid) {
            const firstError = Object.values(fieldErrors)[0] || 'Please complete all required fields correctly';
            toast.error(firstError);
            if (fieldErrors.name || fieldErrors.category || fieldErrors.quantity || fieldErrors.unit) {
                setActiveTab('basic');
            } else if (fieldErrors.currency || fieldErrors.purchasePrice) {
                setActiveTab('financial');
            } else if (fieldErrors.status || fieldErrors.condition) {
                setActiveTab('assignment');
            }
            return;
        }

        // Build specifications object
        const specifications: Record<string, string> = {};
        specList.forEach((s) => {
            if (s.key.trim() && s.value.trim()) {
                specifications[s.key.trim()] = s.value.trim();
            }
        });

        // Store dates as clean YYYY-MM-DD or midday ISO timestamp to ensure zero timezone drift
        const toServerDate = (dateStr?: string) => {
            if (!dateStr) return undefined;
            const parsed = parseLocalDate(dateStr);
            return parsed ? parsed.toISOString() : undefined;
        };

        const payload: any = {
            name: name.trim(),
            assetTag: assetTag.trim() || undefined,
            category,
            subCategory: subCategory.trim() || undefined,
            quantity: Number(quantity) || 1,
            unit: unit.trim() || 'pcs',
            purchasePrice: Number(purchasePrice) || 0,
            totalCost: computedTotalCost,
            currency: currency.toUpperCase(),
            currentValue: currentValue !== '' ? Number(currentValue) : undefined,
            purchaseDate: toServerDate(purchaseDate),
            status,
            condition,
            location: location.trim() || undefined,
            branchId: branchId && branchId !== 'none' ? branchId : null,
            assignedTo: assignedTo && assignedTo !== 'none' ? assignedTo : null,
            assignedDepartment: assignedDepartment.trim() || undefined,
            assignedDate: toServerDate(assignedDate),
            vendor: vendor.trim() || undefined,
            invoiceNumber: invoiceNumber.trim() || undefined,
            serialNumber: serialNumber.trim() || undefined,
            modelNumber: modelNumber.trim() || undefined,
            warrantyExpiry: toServerDate(warrantyExpiry),
            expiryDate: toServerDate(expiryDate),
            notes: notes.trim() || undefined,
            specifications: Object.keys(specifications).length > 0 ? specifications : undefined,
        };

        try {
            if (isEdit && assetToEdit) {
                await updateAsset({ id: assetToEdit._id, data: payload }).unwrap();
                toast.success('Asset updated successfully');
            } else {
                await createAsset(payload).unwrap();
                toast.success('Asset added successfully');
            }
            onOpenChange(false);
            onSuccess?.();
        } catch (err: any) {
            toast.error(err?.data?.message || err?.message || 'Failed to save asset');
        }
    };

    const isSubmitting = isCreating || isUpdating;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl max-w-4xl max-h-[80vh] h-[80vh] p-0 overflow-hidden flex flex-col gap-0 border-border/60 shadow-2xl">
                {/* Dialog Header */}
                <DialogHeader className="p-5 md:px-7 border-b bg-muted/20 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                {isEdit ? <Layers className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold">
                                    {isEdit ? 'Edit Asset' : 'Add New Asset'}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                    {isEdit
                                        ? `Update details and specifications for ${assetToEdit?.assetTag}`
                                        : 'Catalog any company asset from office essentials to high-spec IT gear'}
                                </DialogDescription>
                            </div>
                        </div>

                        <div className="hidden sm:flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-medium">
                                Step {activeStepIndex + 1} of {FORM_STEPS.length}
                            </span>
                            <span className="text-xs font-bold text-primary">
                                ({progressValue}%)
                            </span>
                        </div>
                    </div>
                </DialogHeader>

                {/* Top Progress Bar */}
                <Progress value={progressValue} className="h-1 bg-muted/50 rounded-none shrink-0" />

                {/* Multi-Step Wizard Navigation */}
                <div className="px-5 md:px-7 py-2.5 bg-muted/15 border-b shrink-0">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {FORM_STEPS.map((step, idx) => {
                            const isActive = activeTab === step.id;
                            const isCompleted = activeStepIndex > idx;

                            return (
                                <button
                                    key={step.id}
                                    type="button"
                                    onClick={() => setActiveTab(step.id)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left border ${
                                        isActive
                                            ? 'bg-background border-primary/40 text-primary shadow-xs font-semibold'
                                            : isCompleted
                                            ? 'bg-primary/5 border-primary/20 text-foreground hover:bg-primary/10'
                                            : 'bg-transparent border-transparent text-muted-foreground hover:bg-muted/40'
                                    }`}
                                >
                                    <div
                                        className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold ${
                                            isActive
                                                ? 'bg-primary text-primary-foreground'
                                                : isCompleted
                                                ? 'bg-primary/20 text-primary'
                                                : 'bg-muted text-muted-foreground'
                                        }`}
                                    >
                                        {isCompleted ? <Check className="h-3 w-3" /> : step.stepNumber}
                                    </div>
                                    <span className="truncate">{step.label}</span>
                                    {step.id === 'specs' && specList.length > 0 && (
                                        <span className="ml-auto text-[10px] bg-primary/10 text-primary px-1.5 py-0.2 rounded-full font-bold">
                                            {specList.length}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Form Body ScrollArea with Framer Motion */}
                <ScrollArea className="flex-1 min-h-0">
                    <div className="p-6 md:p-8">
                        <form id="asset-form" onSubmit={handleSubmit}>
                            <AnimatePresence mode="wait">
                                {activeTab === 'basic' && (
                                    <motion.div
                                        key="basic"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2, ease: 'easeOut' }}
                                        className="space-y-6"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            {/* Asset Name - REQUIRED */}
                                            <div className="md:col-span-2 space-y-1.5">
                                                <Label htmlFor="asset-name" className="text-xs font-semibold flex items-center">
                                                    Asset Name
                                                    <span className="text-destructive font-bold ml-1">*</span>
                                                </Label>
                                                <Input
                                                    id="asset-name"
                                                    placeholder="e.g. MacBook Pro M3, Ergonomic Chair, Coffee Mug Set, Trade License"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    onBlur={() => handleBlur('name')}
                                                    required
                                                    className={cn("h-10 text-sm", shouldShowError('name') && "border-destructive focus-visible:ring-destructive")}
                                                />
                                                {shouldShowError('name') && (
                                                    <p className="text-[11px] text-destructive flex items-center gap-1 font-medium">
                                                        <AlertCircle className="h-3 w-3" /> {fieldErrors.name}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Category - REQUIRED */}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="asset-category" className="text-xs font-semibold flex items-center">
                                                    Category
                                                    <span className="text-destructive font-bold ml-1">*</span>
                                                </Label>
                                                <Select
                                                    value={category}
                                                    onValueChange={(val) => {
                                                        handleCategoryChange(val as AssetCategory);
                                                        handleBlur('category');
                                                    }}
                                                >
                                                    <SelectTrigger id="asset-category" className={cn("h-10 text-sm w-full", shouldShowError('category') && "border-destructive")}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {ASSET_CATEGORIES.map((cat) => {
                                                            const CatIcon = CATEGORY_ICONS[cat.id];
                                                            return (
                                                                <SelectItem key={cat.id} value={cat.id}>
                                                                    <div className="flex items-center gap-2">
                                                                        <CatIcon className="h-4 w-4 text-primary" />
                                                                        <span>{cat.label}</span>
                                                                    </div>
                                                                </SelectItem>
                                                            );
                                                        })}
                                                    </SelectContent>
                                                </Select>
                                                {shouldShowError('category') && (
                                                    <p className="text-[11px] text-destructive flex items-center gap-1 font-medium">
                                                        <AlertCircle className="h-3 w-3" /> {fieldErrors.category}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Asset Tag / Auto-generated Code */}
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <Label htmlFor="asset-tag" className="text-xs font-semibold">
                                                        Asset Tag / Code
                                                    </Label>
                                                    {isFetchingTag && (
                                                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                                            <Loader className="h-3 w-3 animate-spin" /> Generating...
                                                        </span>
                                                    )}
                                                </div>
                                                <Input
                                                    id="asset-tag"
                                                    placeholder="e.g. AST-IT-2026-0001"
                                                    value={assetTag}
                                                    onChange={(e) => setAssetTag(e.target.value)}
                                                    className="h-10 text-sm font-mono"
                                                />
                                            </div>

                                            {/* Sub-Category */}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="sub-category" className="text-xs font-semibold">
                                                    Sub-Category / Item Type
                                                </Label>
                                                <Input
                                                    id="sub-category"
                                                    placeholder="e.g. Laptop, Slipper, Mug, AC, Agreement"
                                                    value={subCategory}
                                                    onChange={(e) => setSubCategory(e.target.value)}
                                                    className="h-10 text-sm"
                                                />
                                            </div>

                                            {/* Model / Version */}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="model-no" className="text-xs font-semibold">
                                                    Model / Version
                                                </Label>
                                                <Input
                                                    id="model-no"
                                                    placeholder="e.g. A2991, Pro-2026, Series 5"
                                                    value={modelNumber}
                                                    onChange={(e) => setModelNumber(e.target.value)}
                                                    className="h-10 text-sm"
                                                />
                                            </div>

                                            {/* Quantity - REQUIRED */}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="quantity" className="text-xs font-semibold flex items-center">
                                                    Quantity
                                                    <span className="text-destructive font-bold ml-1">*</span>
                                                </Label>
                                                <Input
                                                    id="quantity"
                                                    type="number"
                                                    min={1}
                                                    value={quantity}
                                                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                                    onBlur={() => handleBlur('quantity')}
                                                    className={cn("h-10 text-sm", shouldShowError('quantity') && "border-destructive")}
                                                />
                                                {shouldShowError('quantity') && (
                                                    <p className="text-[11px] text-destructive flex items-center gap-1 font-medium">
                                                        <AlertCircle className="h-3 w-3" /> {fieldErrors.quantity}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Unit - REQUIRED */}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="unit" className="text-xs font-semibold flex items-center">
                                                    Unit of Measure
                                                    <span className="text-destructive font-bold ml-1">*</span>
                                                </Label>
                                                <Select
                                                    value={unit}
                                                    onValueChange={(val) => {
                                                        setUnit(val);
                                                        handleBlur('unit');
                                                    }}
                                                >
                                                    <SelectTrigger id="unit" className={cn("h-10 text-sm w-full", shouldShowError('unit') && "border-destructive")}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                                                        <SelectItem value="sets">Sets</SelectItem>
                                                        <SelectItem value="units">Units</SelectItem>
                                                        <SelectItem value="pairs">Pairs</SelectItem>
                                                        <SelectItem value="licenses">Licenses</SelectItem>
                                                        <SelectItem value="copies">Copies / Docs</SelectItem>
                                                        <SelectItem value="boxes">Boxes</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {shouldShowError('unit') && (
                                                    <p className="text-[11px] text-destructive flex items-center gap-1 font-medium">
                                                        <AlertCircle className="h-3 w-3" /> {fieldErrors.unit}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === 'financial' && (
                                    <motion.div
                                        key="financial"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2, ease: 'easeOut' }}
                                        className="space-y-6"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            {/* Purchase Price (Per Unit) */}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="purchase-price" className="text-xs font-semibold">
                                                    Unit Purchase Price
                                                </Label>
                                                <Input
                                                    id="purchase-price"
                                                    type="number"
                                                    min={0}
                                                    step="any"
                                                    placeholder="0.00"
                                                    value={purchasePrice || ''}
                                                    onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                                                    onBlur={() => handleBlur('purchasePrice')}
                                                    className={cn("h-10 text-sm", shouldShowError('purchasePrice') && "border-destructive")}
                                                />
                                                {shouldShowError('purchasePrice') && (
                                                    <p className="text-[11px] text-destructive flex items-center gap-1 font-medium">
                                                        <AlertCircle className="h-3 w-3" /> {fieldErrors.purchasePrice}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Currency - REQUIRED */}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="currency" className="text-xs font-semibold flex items-center">
                                                    Currency
                                                    <span className="text-destructive font-bold ml-1">*</span>
                                                </Label>
                                                <Select
                                                    value={currency}
                                                    onValueChange={(val) => {
                                                        setCurrency(val);
                                                        handleBlur('currency');
                                                    }}
                                                >
                                                    <SelectTrigger id="currency" className={cn("h-10 text-sm w-full", shouldShowError('currency') && "border-destructive")}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="BDT">BDT (৳ - Bangladeshi Taka)</SelectItem>
                                                        <SelectItem value="USD">USD ($ - US Dollar)</SelectItem>
                                                        <SelectItem value="EUR">EUR (€ - Euro)</SelectItem>
                                                        <SelectItem value="GBP">GBP (£ - British Pound)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {shouldShowError('currency') && (
                                                    <p className="text-[11px] text-destructive flex items-center gap-1 font-medium">
                                                        <AlertCircle className="h-3 w-3" /> {fieldErrors.currency}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Computed Total Cost Card */}
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold text-muted-foreground">
                                                    Total Cost (Calculated)
                                                </Label>
                                                <div className="h-10 px-3 flex items-center bg-muted/40 rounded-md border text-sm font-bold text-primary">
                                                    {currency === 'BDT' ? '৳' : currency === 'USD' ? '$' : currency} {computedTotalCost.toLocaleString()}
                                                </div>
                                            </div>

                                            {/* Current Estimated Value */}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="current-value" className="text-xs font-semibold">
                                                    Current Depreciated Value (Optional)
                                                </Label>
                                                <Input
                                                    id="current-value"
                                                    type="number"
                                                    min={0}
                                                    step="any"
                                                    placeholder="Current market or book value"
                                                    value={currentValue}
                                                    onChange={(e) => setCurrentValue(e.target.value)}
                                                    className="h-10 text-sm"
                                                />
                                            </div>

                                            {/* Purchase Date - Timezone Safe Local DatePicker */}
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold">
                                                    Purchase / Acquisition Date
                                                </Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            className={cn(
                                                                'w-full h-10 px-3 text-left font-normal text-sm justify-between bg-background border-input',
                                                                !purchaseDate && 'text-muted-foreground'
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-2 truncate">
                                                                <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                                                                <span>{purchaseDate ? formatDisplayDate(purchaseDate) : 'Pick a purchase date'}</span>
                                                            </div>
                                                            {purchaseDate && (
                                                                <span
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setPurchaseDate('');
                                                                    }}
                                                                    className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                                                                    title="Clear Date"
                                                                >
                                                                    <X className="h-3.5 w-3.5" />
                                                                </span>
                                                            )}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <Calendar
                                                            mode="single"
                                                            selected={parseLocalDate(purchaseDate)}
                                                            onSelect={(date) => setPurchaseDate(formatLocalDateStr(date))}
                                                            captionLayout="dropdown"
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>

                                            {/* Vendor / Supplier */}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="vendor" className="text-xs font-semibold">
                                                    Vendor / Supplier / Issuer
                                                </Label>
                                                <Input
                                                    id="vendor"
                                                    placeholder="e.g. Star Tech, Daraz, IKEA, City Corporation"
                                                    value={vendor}
                                                    onChange={(e) => setVendor(e.target.value)}
                                                    className="h-10 text-sm"
                                                />
                                            </div>

                                            {/* Invoice Number */}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="invoice-no" className="text-xs font-semibold">
                                                    Invoice / Receipt Number
                                                </Label>
                                                <Input
                                                    id="invoice-no"
                                                    placeholder="e.g. INV-2026-9812"
                                                    value={invoiceNumber}
                                                    onChange={(e) => setInvoiceNumber(e.target.value)}
                                                    className="h-10 text-sm"
                                                />
                                            </div>

                                            {/* Serial Number */}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="serial-no" className="text-xs font-semibold">
                                                    Serial Number / S/N
                                                </Label>
                                                <Input
                                                    id="serial-no"
                                                    placeholder="e.g. C02G90XYZ123, DL-992384"
                                                    value={serialNumber}
                                                    onChange={(e) => setSerialNumber(e.target.value)}
                                                    className="h-10 text-sm font-mono"
                                                />
                                            </div>

                                            {/* Warranty Expiry - Timezone Safe Local DatePicker */}
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold">
                                                    Warranty Expiry Date
                                                </Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            className={cn(
                                                                'w-full h-10 px-3 text-left font-normal text-sm justify-between bg-background border-input',
                                                                !warrantyExpiry && 'text-muted-foreground'
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-2 truncate">
                                                                <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                                                                <span>{warrantyExpiry ? formatDisplayDate(warrantyExpiry) : 'Pick warranty expiry date'}</span>
                                                            </div>
                                                            {warrantyExpiry && (
                                                                <span
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setWarrantyExpiry('');
                                                                    }}
                                                                    className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                                                                    title="Clear Date"
                                                                >
                                                                    <X className="h-3.5 w-3.5" />
                                                                </span>
                                                            )}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <Calendar
                                                            mode="single"
                                                            selected={parseLocalDate(warrantyExpiry)}
                                                            onSelect={(date) => setWarrantyExpiry(formatLocalDateStr(date))}
                                                            captionLayout="dropdown"
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>

                                            {/* Expiry Date (Licenses/Docs) - Timezone Safe Local DatePicker */}
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold">
                                                    Renewal / Document Expiry Date
                                                </Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            className={cn(
                                                                'w-full h-10 px-3 text-left font-normal text-sm justify-between bg-background border-input',
                                                                !expiryDate && 'text-muted-foreground'
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-2 truncate">
                                                                <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                                                                <span>{expiryDate ? formatDisplayDate(expiryDate) : 'Pick document expiry date'}</span>
                                                            </div>
                                                            {expiryDate && (
                                                                <span
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setExpiryDate('');
                                                                    }}
                                                                    className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                                                                    title="Clear Date"
                                                                >
                                                                    <X className="h-3.5 w-3.5" />
                                                                </span>
                                                            )}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <Calendar
                                                            mode="single"
                                                            selected={parseLocalDate(expiryDate)}
                                                            onSelect={(date) => setExpiryDate(formatLocalDateStr(date))}
                                                            captionLayout="dropdown"
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === 'assignment' && (
                                    <motion.div
                                        key="assignment"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2, ease: 'easeOut' }}
                                        className="space-y-6"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            {/* Status - REQUIRED */}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="status" className="text-xs font-semibold flex items-center">
                                                    Asset Status
                                                    <span className="text-destructive font-bold ml-1">*</span>
                                                </Label>
                                                <Select
                                                    value={status}
                                                    onValueChange={(val) => {
                                                        setStatus(val as AssetStatus);
                                                        handleBlur('status');
                                                    }}
                                                >
                                                    <SelectTrigger id="status" className={cn("h-10 text-sm w-full", shouldShowError('status') && "border-destructive")}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Object.entries(ASSET_STATUS_CONFIG).map(([k, v]) => (
                                                            <SelectItem key={k} value={k}>
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`h-2 w-2 rounded-full ${v.bg}`} />
                                                                    <span>{v.label}</span>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {shouldShowError('status') && (
                                                    <p className="text-[11px] text-destructive flex items-center gap-1 font-medium">
                                                        <AlertCircle className="h-3 w-3" /> {fieldErrors.status}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Condition - REQUIRED */}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="condition" className="text-xs font-semibold flex items-center">
                                                    Physical Condition
                                                    <span className="text-destructive font-bold ml-1">*</span>
                                                </Label>
                                                <Select
                                                    value={condition}
                                                    onValueChange={(val) => {
                                                        setCondition(val as AssetCondition);
                                                        handleBlur('condition');
                                                    }}
                                                >
                                                    <SelectTrigger id="condition" className={cn("h-10 text-sm w-full", shouldShowError('condition') && "border-destructive")}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Object.entries(ASSET_CONDITION_CONFIG).map(([k, v]) => (
                                                            <SelectItem key={k} value={k}>
                                                                {v.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {shouldShowError('condition') && (
                                                    <p className="text-[11px] text-destructive flex items-center gap-1 font-medium">
                                                        <AlertCircle className="h-3 w-3" /> {fieldErrors.condition}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Branch Location */}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="branch" className="text-xs font-semibold">
                                                    Branch Location
                                                </Label>
                                                <Select value={branchId || 'none'} onValueChange={(val) => setBranchId(val === 'none' ? '' : val)}>
                                                    <SelectTrigger id="branch" className="h-10 text-sm w-full">
                                                        <SelectValue placeholder="Select Branch (Optional)" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">Headquarters / Unassigned</SelectItem>
                                                        {branches.map((b: any) => (
                                                            <SelectItem key={b._id} value={b._id}>
                                                                {b.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Room / Desk / Specific Location */}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="location" className="text-xs font-semibold">
                                                    Room / Desk / Specific Location
                                                </Label>
                                                <Input
                                                    id="location"
                                                    placeholder="e.g. 4th Floor - Room 402, Server Room, Pantry Shelf B"
                                                    value={location}
                                                    onChange={(e) => setLocation(e.target.value)}
                                                    className="h-10 text-sm"
                                                />
                                            </div>

                                            {/* Assigned To (Staff Member - Searchable Combobox) */}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="assigned-to" className="text-xs font-semibold">
                                                    Assigned To (Staff Member)
                                                </Label>
                                                <Combobox
                                                    options={staffOptions}
                                                    value={assignedTo}
                                                    onChange={(val) => setAssignedTo(val)}
                                                    placeholder="Select Staff Member (Optional)"
                                                    searchPlaceholder="Search staff by name..."
                                                    emptyText="No staff member found."
                                                    isLoading={isLoadingStaffs}
                                                    className="h-10 text-sm w-full"
                                                />
                                            </div>

                                            {/* Department */}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="department" className="text-xs font-semibold">
                                                    Assigned Department
                                                </Label>
                                                <Input
                                                    id="department"
                                                    placeholder="e.g. Engineering, Sales, HR, Executive"
                                                    value={assignedDepartment}
                                                    onChange={(e) => setAssignedDepartment(e.target.value)}
                                                    className="h-10 text-sm"
                                                />
                                            </div>

                                            {/* Assigned Date - Timezone Safe Local DatePicker */}
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold">
                                                    Handover / Assigned Date
                                                </Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            className={cn(
                                                                'w-full h-10 px-3 text-left font-normal text-sm justify-between bg-background border-input',
                                                                !assignedDate && 'text-muted-foreground'
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-2 truncate">
                                                                <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                                                                <span>{assignedDate ? formatDisplayDate(assignedDate) : 'Pick handover date'}</span>
                                                            </div>
                                                            {assignedDate && (
                                                                <span
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setAssignedDate('');
                                                                    }}
                                                                    className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                                                                    title="Clear Date"
                                                                >
                                                                    <X className="h-3.5 w-3.5" />
                                                                </span>
                                                            )}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <Calendar
                                                            mode="single"
                                                            selected={parseLocalDate(assignedDate)}
                                                            onSelect={(date) => setAssignedDate(formatLocalDateStr(date))}
                                                            captionLayout="dropdown"
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>

                                            {/* Notes / Remarks */}
                                            <div className="md:col-span-2 space-y-1.5">
                                                <Label htmlFor="notes" className="text-xs font-semibold">
                                                    Notes / Remarks / Custody History
                                                </Label>
                                                <Textarea
                                                    id="notes"
                                                    placeholder="Any additional information, accessories included, condition remarks, etc."
                                                    rows={3}
                                                    value={notes}
                                                    onChange={(e) => setNotes(e.target.value)}
                                                    className="text-sm resize-none"
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === 'specs' && (
                                    <motion.div
                                        key="specs"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2, ease: 'easeOut' }}
                                        className="space-y-6"
                                    >
                                        {/* Suggested Attributes for Category */}
                                        {SUGGESTED_SPECS[category] && (
                                            <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <Sparkles className="h-4 w-4 text-primary" />
                                                    <span className="text-xs font-bold text-foreground">
                                                        Recommended Specs for {ASSET_CATEGORIES.find((c) => c.id === category)?.label}:
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {SUGGESTED_SPECS[category].map((s) => (
                                                        <Button
                                                            key={s.key}
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleAddSuggestedSpec(s.label)}
                                                            className="text-xs h-7 px-2.5 bg-background shadow-2xs hover:border-primary/50"
                                                        >
                                                            <Plus className="h-3 w-3 mr-1 text-primary" />
                                                            {s.label}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Dynamic Specification Rows */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs font-semibold">
                                                    Custom Specifications & Attributes ({specList.length})
                                                </Label>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleAddCustomSpec}
                                                    className="h-8 text-xs font-medium gap-1"
                                                >
                                                    <Plus className="h-3.5 w-3.5" /> Add Attribute
                                                </Button>
                                            </div>

                                            {specList.length === 0 ? (
                                                <div className="p-8 border border-dashed rounded-xl text-center space-y-2">
                                                    <Sparkles className="h-7 w-7 mx-auto text-muted-foreground/50" />
                                                    <p className="text-xs font-medium text-foreground">
                                                        No custom specifications added yet
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                                                        Click on the suggested buttons above or use &quot;Add Attribute&quot; to define RAM, processor, dimensions, license count, or materials.
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2.5">
                                                    {specList.map((spec, index) => (
                                                        <div
                                                            key={index}
                                                            className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/20 border border-border/50"
                                                        >
                                                            <Input
                                                                placeholder="Specification Name (e.g. RAM, Material)"
                                                                value={spec.key}
                                                                onChange={(e) => handleSpecChange(index, 'key', e.target.value)}
                                                                className="h-9 text-xs flex-1 bg-background"
                                                            />
                                                            <Input
                                                                placeholder="Value (e.g. 32GB DDR5, Solid Wood)"
                                                                value={spec.value}
                                                                onChange={(e) => handleSpecChange(index, 'value', e.target.value)}
                                                                className="h-9 text-xs flex-1 bg-background"
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleRemoveSpec(index)}
                                                                className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </form>
                    </div>
                </ScrollArea>

                {/* Dialog Footer with Standardized Buttons and Disabled State */}
                <DialogFooter className="p-4 px-5 md:px-7 border-t bg-muted/20 flex flex-row items-center justify-between sm:justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                        {activeTab !== 'basic' && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    if (activeTab === 'specs') setActiveTab('assignment');
                                    else if (activeTab === 'assignment') setActiveTab('financial');
                                    else if (activeTab === 'financial') setActiveTab('basic');
                                }}
                                className="h-9 px-3.5 text-xs font-medium gap-1"
                            >
                                <ChevronLeft className="h-3.5 w-3.5" />
                                Back
                            </Button>
                        )}
                        {activeTab !== 'specs' && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    if (activeTab === 'basic') setActiveTab('financial');
                                    else if (activeTab === 'financial') setActiveTab('assignment');
                                    else if (activeTab === 'assignment') setActiveTab('specs');
                                }}
                                className="h-9 px-4 text-xs font-medium gap-1"
                            >
                                Next Section
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-2.5">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                            className="h-9 px-4 text-xs font-medium"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            form="asset-form"
                            disabled={!isFormValid || isSubmitting}
                            className={cn(
                                'h-9 px-5 text-xs font-semibold gap-1.5 shadow-sm transition-all',
                                isFormValid
                                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer'
                                    : 'opacity-50 cursor-not-allowed bg-muted text-muted-foreground hover:bg-muted'
                            )}
                        >
                            {isSubmitting && <Loader className="h-3.5 w-3.5 animate-spin" />}
                            {isEdit ? 'Save Changes' : 'Create Asset'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
