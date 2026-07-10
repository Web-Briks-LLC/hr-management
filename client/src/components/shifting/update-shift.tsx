'use client';

import { useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import { useUpdateShiftMutation } from '@/redux/features/shift/shiftApi';
import { useGetAllBranchesQuery } from '@/redux/features/branch/branchApi';
import { Spinner } from '../ui/spinner';

import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const WEEK_DAYS = [
    { label: 'Sun', value: 0 },
    { label: 'Mon', value: 1 },
    { label: 'Tue', value: 2 },
    { label: 'Wed', value: 3 },
    { label: 'Thu', value: 4 },
    { label: 'Fri', value: 5 },
    { label: 'Sat', value: 6 },
];

const MINUTE_OPTIONS = [5, 10, 15, 20, 30, 45, 60];

const updateShiftSchema = z.object({
    name: z.string().min(1, 'Shift name is required'),
    code: z.string().min(1, 'Code is required'),
    branchId: z.string().min(1, 'Branch is required'),

    startTime: z.string().min(1, 'Start time required'),
    endTime: z.string().min(1, 'End time required'),

    otEnabled: z.boolean(),

    workDays: z.array(z.number()).min(1, 'Select at least one day'),
    gracePeriodMinutes: z.number(),
    lateAfterMinutes: z.number(),
    halfDayAfterMinutes: z.number(),
});

type UpdateShiftFormData = z.infer<typeof updateShiftSchema>;

interface UpdateShiftProps {
    open: boolean;
    setOpen: (v: boolean) => void;
    shift: any;
}

export default function UpdateShift({
    open,
    setOpen,
    shift,
}: UpdateShiftProps) {
    const { data: branchData } = useGetAllBranchesQuery(undefined);
    const [updateShift, { isLoading }] = useUpdateShiftMutation();

    const form = useForm<UpdateShiftFormData>({
        resolver: zodResolver(updateShiftSchema),
        defaultValues: {
            name: '',
            code: '',
            branchId: '',

            startTime: '',
            endTime: '',

            otEnabled: false,

            workDays: [],
            gracePeriodMinutes: 10,
            lateAfterMinutes: 10,
            halfDayAfterMinutes: 240,
        },
    });

    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors },
    } = form;

    useEffect(() => {
        if (shift) {
            reset({
                name: shift.name,
                code: shift.code,
                branchId: shift.branchId._id,

                startTime: shift.startTime,
                endTime: shift.endTime,

                otEnabled: shift.otEnabled,

                workDays: shift.workDays,
                gracePeriodMinutes: shift.gracePeriodMinutes,
                lateAfterMinutes: shift.lateAfterMinutes,
                halfDayAfterMinutes: shift.halfDayAfterMinutes,
            });
        }
    }, [shift, reset]);

    const onSubmit = async (data: UpdateShiftFormData) => {
        try {
            if (data.startTime >= data.endTime) {
                toast.error('End time must be after start time');
                return;
            }

            await updateShift({
                id: shift._id,
                data: {
                    ...data,
                    code: data.code.toUpperCase(),
                },
            }).unwrap();

            toast.success('Shift updated successfully');
            setOpen(false);
        } catch (err) {
            toast.error((err as Error).message || 'Update failed');
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Shift</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid gap-2">
                        <Label>Shift Name *</Label>
                        <Input {...register('name')} />
                        {errors.name && (
                            <p className="text-sm text-red-500">
                                {errors.name.message}
                            </p>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label>Code *</Label>
                        <Input
                            {...register('code')}
                            onChange={(e) =>
                                form.setValue(
                                    'code',
                                    e.target.value.toUpperCase()
                                )
                            }
                        />
                        {errors.code && (
                            <p className="text-sm text-red-500">
                                {errors.code.message}
                            </p>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label>Branch *</Label>
                        <Controller
                            name="branchId"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select branch" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {branchData?.branches?.map((b: any) => (
                                            <SelectItem
                                                key={b._id}
                                                value={b._id}
                                            >
                                                {b.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.branchId && (
                            <p className="text-sm text-red-500">
                                {errors.branchId.message}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Start Time *</Label>
                            <Input
                                type="time"
                                {...register('startTime')}
                                className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>End Time *</Label>
                            <Input
                                type="time"
                                {...register('endTime')}
                                className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>Work Days *</Label>
                        <Controller
                            name="workDays"
                            control={control}
                            render={({ field }) => (
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    {WEEK_DAYS.map((day) => (
                                        <Button
                                            key={day.value}
                                            type="button"
                                            size="sm"
                                            variant={
                                                field.value.includes(day.value)
                                                    ? 'default'
                                                    : 'outline'
                                            }
                                            onClick={() => {
                                                const updated =
                                                    field.value.includes(
                                                        day.value
                                                    )
                                                        ? field.value.filter(
                                                              (d) =>
                                                                  d !==
                                                                  day.value
                                                          )
                                                        : [
                                                              ...field.value,
                                                              day.value,
                                                          ];

                                                field.onChange(updated);
                                            }}
                                        >
                                            {day.label}
                                        </Button>
                                    ))}
                                </div>
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="grid gap-2">
                            <Label>Grace (min)</Label>
                            <Controller
                                name="gracePeriodMinutes"
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        value={String(field.value)}
                                        onValueChange={(v) =>
                                            field.onChange(Number(v))
                                        }
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {MINUTE_OPTIONS.map((m) => (
                                                <SelectItem
                                                    key={m}
                                                    value={String(m)}
                                                >
                                                    {m} min
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>Late After (min)</Label>
                            <Controller
                                name="lateAfterMinutes"
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        value={String(field.value)}
                                        onValueChange={(v) =>
                                            field.onChange(Number(v))
                                        }
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {MINUTE_OPTIONS.map((m) => (
                                                <SelectItem
                                                    key={m}
                                                    value={String(m)}
                                                >
                                                    {m} min
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>Half Day After</Label>
                            <Controller
                                name="halfDayAfterMinutes"
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        value={String(field.value)}
                                        onValueChange={(v) =>
                                            field.onChange(Number(v))
                                        }
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[120, 180, 240, 300].map((m) => (
                                                <SelectItem
                                                    key={m}
                                                    value={String(m)}
                                                >
                                                    {m / 60} Hr
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <Label>OT Enabled</Label>
                        <Controller
                            name="otEnabled"
                            control={control}
                            render={({ field }) => (
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            )}
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full"
                    >
                        {isLoading ? <Spinner /> : 'Update Shift'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
