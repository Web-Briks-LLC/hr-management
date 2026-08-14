'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
    useCreateProductionLogMutation,
    useUpdateProductionLogMutation,
    useGetActiveOrdersProgressQuery,
} from '@/redux/features/production/productionApi';
import { useGetAllShiftsQuery } from '@/redux/features/shift/shiftApi';
import { useGetStaffsQuery } from '@/redux/features/staff/staffApi';
import {
    ProductionStage,
    ProductionStatus,
    STAGE_LABELS,
    STATUS_LABELS,
    IShiftProduction,
} from '@/types/production.type';
import { cn } from '@/lib/utils';
import {
    Loader,
    Plus,
    Trash2,
    Layers,
    Clock,
    User,
    Check,
    ChevronRight,
    ChevronLeft,
    AlertCircle,
    CheckCircle2,
    FileText,
    Sparkles,
} from 'lucide-react';

interface LogProductionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialOrderId?: string;
    editLog?: IShiftProduction | null;
}

type FormTab = 'order_shift' | 'quantities' | 'editors' | 'handover';

interface StepConfig {
    id: FormTab;
    label: string;
    stepNumber: number;
}

const FORM_STEPS: StepConfig[] = [
    { id: 'order_shift', label: 'Order & Shift', stepNumber: 1 },
    { id: 'quantities', label: 'Quantities & Status', stepNumber: 2 },
    { id: 'editors', label: 'Editor Output', stepNumber: 3 },
    { id: 'handover', label: 'Handover & Issues', stepNumber: 4 },
];

export function LogProductionDialog({
    open,
    onOpenChange,
    initialOrderId,
    editLog,
}: LogProductionDialogProps) {
    const [activeTab, setActiveTab] = useState<FormTab>('order_shift');

    // Form fields
    const [orderId, setOrderId] = useState<string>('');
    const [shiftId, setShiftId] = useState<string>('');
    const [stage, setStage] = useState<ProductionStage>('clipping_path');
    const [customStageName, setCustomStageName] = useState<string>('');
    const [targetQuantity, setTargetQuantity] = useState<number>(0);
    const [completedQuantity, setCompletedQuantity] = useState<number>(0);
    const [status, setStatus] = useState<ProductionStatus>('in_progress');
    const [handoverNotes, setHandoverNotes] = useState<string>('');
    const [bottlenecks, setBottlenecks] = useState<string>('');
    const [assignedStaffs, setAssignedStaffs] = useState<
        { staffId: string; imageCount: number; notes: string }[]
    >([]);

    // Queries
    const { data: shiftsData, isLoading: isShiftsLoading } = useGetAllShiftsQuery({});
    const { data: ordersData, isLoading: isOrdersLoading } = useGetActiveOrdersProgressQuery({});
    const { data: staffsData, isLoading: isStaffsLoading } = useGetStaffsQuery({ limit: 100 });

    const [createLog, { isLoading: isCreating }] = useCreateProductionLogMutation();
    const [updateLog, { isLoading: isUpdating }] = useUpdateProductionLogMutation();

    const shifts = Array.isArray(shiftsData?.data)
        ? shiftsData.data
        : Array.isArray(shiftsData)
        ? shiftsData
        : [];
    const activeOrders = ordersData?.data || [];
    const staffs = staffsData?.data || [];

    useEffect(() => {
        if (open) {
            if (editLog) {
                setOrderId((editLog.orderId as any)?._id || '');
                setShiftId((editLog.shiftId as any)?._id || '');
                setStage(editLog.stage || 'clipping_path');
                setCustomStageName(editLog.customStageName || '');
                setTargetQuantity(editLog.targetQuantity || 0);
                setCompletedQuantity(editLog.completedQuantity || 0);
                setStatus(editLog.status || 'in_progress');
                setHandoverNotes(editLog.handoverNotes || '');
                setBottlenecks(editLog.bottlenecks || '');
                setAssignedStaffs(
                    (editLog.assignedStaffs || []).map((s) => ({
                        staffId: (s.staffId as any)?._id || (s.staffId as any) || '',
                        imageCount: s.imageCount || 0,
                        notes: s.notes || '',
                    }))
                );
            } else {
                if (initialOrderId) {
                    setOrderId(initialOrderId);
                } else if (!orderId && activeOrders.length > 0) {
                    setOrderId(activeOrders[0]._id);
                }
                if (shifts.length > 0 && !shiftId) {
                    setShiftId(shifts[0]._id);
                }
            }
        }
    }, [editLog, initialOrderId, shifts, activeOrders, open]);

    const selectedOrder = useMemo(
        () => activeOrders.find((o) => o._id === orderId),
        [activeOrders, orderId]
    );

    const activeStepIndex = useMemo(
        () => FORM_STEPS.findIndex((s) => s.id === activeTab),
        [activeTab]
    );

    const progressValue = useMemo(
        () => Math.round(((activeStepIndex + 1) / FORM_STEPS.length) * 100),
        [activeStepIndex]
    );

    const handleNext = () => {
        if (activeStepIndex === 0 && !orderId) {
            toast.error('Please select an order');
            return;
        }
        if (activeStepIndex === 0 && !shiftId) {
            toast.error('Please select a shift');
            return;
        }
        if (activeStepIndex < FORM_STEPS.length - 1) {
            setActiveTab(FORM_STEPS[activeStepIndex + 1].id);
        }
    };

    const handlePrev = () => {
        if (activeStepIndex > 0) {
            setActiveTab(FORM_STEPS[activeStepIndex - 1].id);
        }
    };

    const handleAddStaffRow = () => {
        setAssignedStaffs((prev) => [...prev, { staffId: '', imageCount: 0, notes: '' }]);
    };

    const handleRemoveStaffRow = (index: number) => {
        setAssignedStaffs((prev) => prev.filter((_, idx) => idx !== index));
    };

    const handleStaffChange = (index: number, field: string, value: any) => {
        setAssignedStaffs((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!orderId) {
            toast.error('Please select an order');
            setActiveTab('order_shift');
            return;
        }

        if (!shiftId) {
            toast.error('Please select a shift');
            setActiveTab('order_shift');
            return;
        }

        if (completedQuantity < 0) {
            toast.error('Completed quantity cannot be negative');
            setActiveTab('quantities');
            return;
        }

        try {
            const payload: any = {
                orderId,
                shiftId,
                stage,
                customStageName: stage === 'other' ? customStageName : undefined,
                targetQuantity: Number(targetQuantity) || 0,
                completedQuantity: Number(completedQuantity) || 0,
                status,
                handoverNotes,
                bottlenecks,
                assignedStaffs: assignedStaffs.filter((s) => s.staffId),
            };

            if (editLog) {
                await updateLog({ id: editLog._id, data: payload }).unwrap();
                toast.success('Production log updated successfully!');
            } else {
                await createLog(payload).unwrap();
                toast.success('Shift production logged successfully!');
            }

            onOpenChange(false);
        } catch (error: any) {
            console.error('Submit production error:', error);
            toast.error(error?.data?.message || 'Failed to save production log');
        }
    };

    const isSubmitting = isCreating || isUpdating;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl sm:max-w-4xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                {/* Dialog Header */}
                <DialogHeader className="px-6 md:px-8 py-5 border-b shrink-0 bg-card">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                                <Layers className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold tracking-tight">
                                    {editLog ? 'Update Shift Production Log' : 'Add Shift Production Output'}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                    Record stage progression, editor output, and shift handover briefings.
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

                {/* Progress Bar */}
                <Progress value={progressValue} className="h-1 bg-muted/50 rounded-none shrink-0" />

                {/* Multi-Step Wizard Navigation */}
                <div className="px-6 md:px-8 py-2.5 bg-muted/15 border-b shrink-0">
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
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Form Body ScrollArea */}
                <ScrollArea className="flex-1 min-h-0">
                    <div className="p-6 md:p-8">
                        <form id="shift-production-form" onSubmit={handleSubmit}>
                            <AnimatePresence mode="wait">
                                {/* STEP 1: Order & Shift */}
                                {activeTab === 'order_shift' && (
                                    <motion.div
                                        key="order_shift"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2, ease: 'easeOut' }}
                                        className="space-y-6"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            {/* Order Select - REQUIRED */}
                                            <div className="md:col-span-2 space-y-1.5">
                                                <Label htmlFor="orderSelect" className="text-xs font-semibold flex items-center">
                                                    Target Order
                                                    <span className="text-destructive font-bold ml-1">*</span>
                                                </Label>
                                                <Select
                                                    value={orderId}
                                                    onValueChange={setOrderId}
                                                    disabled={!!editLog || isOrdersLoading}
                                                >
                                                    <SelectTrigger id="orderSelect" className="h-10 text-sm w-full">
                                                        <SelectValue placeholder="Select active order..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="max-h-64">
                                                        {activeOrders.map((ord) => (
                                                            <SelectItem key={ord._id} value={ord._id}>
                                                                <div className="flex items-center justify-between gap-4 w-full">
                                                                    <span className="font-semibold text-foreground">{ord.orderName}</span>
                                                                    <span className="text-xs text-muted-foreground">
                                                                        ({ord.imageQuantity} imgs • {ord.clientId?.name || 'Client'})
                                                                    </span>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Order Snapshot info card */}
                                            {selectedOrder && (
                                                <div className="md:col-span-2 p-4 rounded-xl bg-muted/40 border border-border/60 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                    <div>
                                                        <span className="text-muted-foreground block">Client</span>
                                                        <span className="font-bold text-foreground">{selectedOrder.clientId?.name || 'N/A'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground block">Total Images</span>
                                                        <span className="font-extrabold text-foreground text-sm">{selectedOrder.imageQuantity}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground block">Overall Progress</span>
                                                        <span className="font-bold text-primary text-sm">
                                                            {selectedOrder.productionProgress.overallPercentage}%
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground block">Remaining</span>
                                                        <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                                                            {selectedOrder.productionProgress.remainingImages} imgs
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Shift Select - REQUIRED */}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="shiftSelect" className="text-xs font-semibold flex items-center">
                                                    Working Shift
                                                    <span className="text-destructive font-bold ml-1">*</span>
                                                </Label>
                                                <Select
                                                    value={shiftId}
                                                    onValueChange={setShiftId}
                                                    disabled={isShiftsLoading}
                                                >
                                                    <SelectTrigger id="shiftSelect" className="h-10 text-sm w-full">
                                                        <SelectValue placeholder="Select shift..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {shifts.map((s: any) => (
                                                            <SelectItem key={s._id} value={s._id}>
                                                                {s.name} ({s.startTime || '00:00'} - {s.endTime || '00:00'})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Stage / Service Select - REQUIRED */}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="stageSelect" className="text-xs font-semibold flex items-center">
                                                    Editing Stage / Service
                                                    <span className="text-destructive font-bold ml-1">*</span>
                                                </Label>
                                                <Select
                                                    value={stage}
                                                    onValueChange={(val) => setStage(val as ProductionStage)}
                                                >
                                                    <SelectTrigger id="stageSelect" className="h-10 text-sm w-full">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Object.entries(STAGE_LABELS).map(([key, label]) => (
                                                            <SelectItem key={key} value={key}>
                                                                {label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {stage === 'other' && (
                                                <div className="md:col-span-2 space-y-1.5">
                                                    <Label htmlFor="customStage" className="text-xs font-semibold">
                                                        Custom Stage Name
                                                    </Label>
                                                    <Input
                                                        id="customStage"
                                                        placeholder="e.g. Special Background Manipulation"
                                                        value={customStageName}
                                                        onChange={(e) => setCustomStageName(e.target.value)}
                                                        className="h-10 text-sm"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}

                                {/* STEP 2: Quantities & Status */}
                                {activeTab === 'quantities' && (
                                    <motion.div
                                        key="quantities"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2, ease: 'easeOut' }}
                                        className="space-y-6"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            {/* Completed Quantity - REQUIRED */}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="completedQty" className="text-xs font-semibold flex items-center">
                                                    Completed Images in this Shift
                                                    <span className="text-destructive font-bold ml-1">*</span>
                                                </Label>
                                                <Input
                                                    id="completedQty"
                                                    type="number"
                                                    min={0}
                                                    value={completedQuantity || ''}
                                                    onChange={(e) => setCompletedQuantity(Number(e.target.value))}
                                                    className="h-10 text-sm font-bold"
                                                    placeholder="0"
                                                    required
                                                />
                                                <p className="text-[11px] text-muted-foreground">
                                                    Total finished images during your shift for this stage.
                                                </p>
                                            </div>

                                            {/* Shift Target */}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="targetQty" className="text-xs font-semibold">
                                                    Shift Target (Optional)
                                                </Label>
                                                <Input
                                                    id="targetQty"
                                                    type="number"
                                                    min={0}
                                                    value={targetQuantity || ''}
                                                    onChange={(e) => setTargetQuantity(Number(e.target.value))}
                                                    className="h-10 text-sm"
                                                    placeholder="e.g. 500"
                                                />
                                                <p className="text-[11px] text-muted-foreground">
                                                    Benchmark goal assigned for this shift.
                                                </p>
                                            </div>

                                            {/* Shift Status */}
                                            <div className="md:col-span-2 space-y-1.5">
                                                <Label htmlFor="statusSelect" className="text-xs font-semibold flex items-center">
                                                    Work Status
                                                    <span className="text-destructive font-bold ml-1">*</span>
                                                </Label>
                                                <Select
                                                    value={status}
                                                    onValueChange={(val) => setStatus(val as ProductionStatus)}
                                                >
                                                    <SelectTrigger id="statusSelect" className="h-10 text-sm w-full">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Object.entries(STATUS_LABELS).map(([key, val]) => (
                                                            <SelectItem key={key} value={key}>
                                                                <span className={val.color}>{val.label}</span>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* STEP 3: Editor Output */}
                                {activeTab === 'editors' && (
                                    <motion.div
                                        key="editors"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2, ease: 'easeOut' }}
                                        className="space-y-5"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Label className="text-sm font-bold text-foreground">
                                                    Photo Editors Output Breakdown
                                                </Label>
                                                <p className="text-xs text-muted-foreground">
                                                    Assign processed image counts to individual floor editors for accountability.
                                                </p>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handleAddStaffRow}
                                                className="h-8 text-xs gap-1.5"
                                            >
                                                <Plus className="h-3.5 w-3.5" /> Add Editor
                                            </Button>
                                        </div>

                                        {assignedStaffs.length === 0 ? (
                                            <div className="text-center py-10 border border-dashed rounded-xl bg-muted/15">
                                                <User className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                                                <p className="text-xs font-semibold text-foreground">No individual editors added</p>
                                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                                    Click &quot;Add Editor&quot; to log productivity per team member.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                                                {assignedStaffs.map((row, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-muted/25 p-3 rounded-xl border border-border/50 items-center"
                                                    >
                                                        <div className="sm:col-span-5">
                                                            <Select
                                                                value={row.staffId}
                                                                onValueChange={(val) => handleStaffChange(idx, 'staffId', val)}
                                                                disabled={isStaffsLoading}
                                                            >
                                                                <SelectTrigger className="h-9 text-xs w-full bg-background">
                                                                    <SelectValue placeholder="Select photo editor..." />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {staffs.map((st: any) => (
                                                                        <SelectItem key={st._id} value={st._id}>
                                                                            {st.userId?.name || st.staffId} ({st.designation || 'Editor'})
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        <div className="sm:col-span-3">
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                placeholder="Count"
                                                                value={row.imageCount || ''}
                                                                onChange={(e) =>
                                                                    handleStaffChange(idx, 'imageCount', Number(e.target.value))
                                                                }
                                                                className="h-9 text-xs bg-background"
                                                            />
                                                        </div>

                                                        <div className="sm:col-span-3">
                                                            <Input
                                                                placeholder="Notes (optional)"
                                                                value={row.notes}
                                                                onChange={(e) => handleStaffChange(idx, 'notes', e.target.value)}
                                                                className="h-9 text-xs bg-background"
                                                            />
                                                        </div>

                                                        <div className="sm:col-span-1 flex justify-end">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleRemoveStaffRow(idx)}
                                                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {/* STEP 4: Handover & Issues */}
                                {activeTab === 'handover' && (
                                    <motion.div
                                        key="handover"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2, ease: 'easeOut' }}
                                        className="space-y-5"
                                    >
                                        <div className="space-y-1.5">
                                            <Label htmlFor="handoverNotes" className="text-xs font-semibold flex items-center gap-1.5">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Handover Instructions for Next Shift
                                            </Label>
                                            <Textarea
                                                id="handoverNotes"
                                                placeholder="e.g. 500 clipping paths done. Next shift please start masking on images 1 to 500."
                                                value={handoverNotes}
                                                onChange={(e) => setHandoverNotes(e.target.value)}
                                                className="min-h-[100px] text-sm resize-none"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="bottlenecks" className="text-xs font-semibold flex items-center gap-1.5">
                                                <AlertCircle className="h-3.5 w-3.5 text-amber-500" /> Bottlenecks, Defect Alerts & Delays
                                            </Label>
                                            <Textarea
                                                id="bottlenecks"
                                                placeholder="e.g. Missing RAW assets for items 40-50, or heavy hair masking complexity."
                                                value={bottlenecks}
                                                onChange={(e) => setBottlenecks(e.target.value)}
                                                className="min-h-[100px] text-sm resize-none"
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </form>
                    </div>
                </ScrollArea>

                {/* Dialog Footer */}
                <DialogFooter className="px-6 md:px-8 py-4 border-t bg-muted/20 shrink-0 flex items-center justify-between gap-3">
                    <div>
                        {activeStepIndex > 0 && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handlePrev}
                                disabled={isSubmitting}
                                className="h-9 text-xs gap-1.5"
                            >
                                <ChevronLeft className="h-3.5 w-3.5" /> Previous
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                            className="h-9 text-xs"
                        >
                            Cancel
                        </Button>

                        {activeStepIndex < FORM_STEPS.length - 1 ? (
                            <Button
                                type="button"
                                onClick={handleNext}
                                className="h-9 text-xs gap-1.5 font-bold"
                            >
                                Next Step <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                        ) : (
                            <Button
                                type="submit"
                                form="shift-production-form"
                                disabled={isSubmitting}
                                className="h-9 text-xs gap-1.5 font-bold min-w-[130px]"
                            >
                                {isSubmitting ? (
                                    <Loader className="h-3.5 w-3.5 animate-spin mr-1" />
                                ) : editLog ? (
                                    'Update Log'
                                ) : (
                                    'Save Output'
                                )}
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
