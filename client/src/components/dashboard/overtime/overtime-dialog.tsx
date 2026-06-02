'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    useCreateOvertimeMutation,
    useUpdateOvertimeMutation,
} from '@/redux/features/overtime/overtimeApi';
import {
    useGetStaffsQuery,
    useGetMeQuery,
} from '@/redux/features/staff/staffApi';
import { useGetAllBranchesQuery } from '@/redux/features/branch/branchApi';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { IOvertime } from '@/types/overtime.type';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/shared/DatePicker';
import { TimePicker } from '@/components/shared/TimePicker';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import IStaff from '@/types/staff.type';
import { IBranch } from '@/types/branch.type';
import { useSession } from '@/lib/auth-client';
import { Badge } from '@/components/ui/badge';
import {
    Check,
    ChevronsUpDown,
    Loader2,
    Search,
    Clock,
    X,
    CalendarDays,
    Timer,
    FileText,
    Building2,
    Users,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const overtimeSchema = z.object({
    staffIds: z
        .array(z.string())
        .min(1, 'At least one staff member is required'),
    date: z.date({ error: 'Date is required' }),
    type: z.enum(['pre_shift', 'post_shift', 'weekend', 'holiday']),
    startTime: z.string().min(1, 'Start time is required'),
    durationMinutes: z.number().min(1, 'Duration must be at least 1 minute'),
    reason: z.string().optional(),
});

type OvertimeFormValues = z.infer<typeof overtimeSchema>;

interface OvertimeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    data?: IOvertime | null;
}

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

const TYPE_OPTIONS = [
    {
        value: 'pre_shift',
        label: 'Pre Shift',
        description: 'Before regular hours',
    },
    {
        value: 'post_shift',
        label: 'Post Shift',
        description: 'After regular hours',
    },
    { value: 'weekend', label: 'Weekend', description: 'Saturday or Sunday' },
    { value: 'holiday', label: 'Holiday', description: 'Public holiday' },
];

const DURATION_PRESETS = [30, 60, 90, 120, 180];

export function OvertimeDialog({
    open,
    onOpenChange,
    data,
}: OvertimeDialogProps) {
    const [createOvertime, { isLoading: isCreating }] =
        useCreateOvertimeMutation();
    const [updateOvertime, { isLoading: isUpdating }] =
        useUpdateOvertimeMutation();

    const { data: session } = useSession();
    const { data: meData } = useGetMeQuery({});
    const currentUser = meData?.staff;

    const userRole = session?.user?.role || currentUser?.user?.role;
    const canChangeBranch = userRole === 'admin' || userRole === 'super_admin';
    const isBranchManagementRole =
        canChangeBranch ||
        userRole === 'branch_admin' ||
        userRole === 'hr_manager' ||
        userRole === 'team_leader';

    const [selectedBranchId, setSelectedBranchId] = useState<string>('');

    const hasInitializedRef = useRef(false);
    useEffect(() => {
        if (!hasInitializedRef.current && currentUser?.branchId) {
            requestAnimationFrame(() => {
                if (currentUser?.branchId) {
                    setSelectedBranchId(currentUser.branchId);
                    hasInitializedRef.current = true;
                }
            });
        }
    }, [currentUser?.branchId]);

    const { data: branchesData } = useGetAllBranchesQuery(undefined, {
        skip: !canChangeBranch,
    });

    const { data: staffsData, isLoading: isStaffsLoading } = useGetStaffsQuery(
        {
            limit: 1000,
            status: 'active',
            branchId: selectedBranchId,
            excludeAdmins: true,
        },
        {
            skip: !selectedBranchId || !isBranchManagementRole,
        },
    );

    const [staffSearchTerm, setStaffSearchTerm] = useState('');
    const debouncedSearch = useDebounce(staffSearchTerm, 300);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const filteredStaffs = useMemo(() => {
        const allStaffs: IStaff[] = staffsData?.staffs || [];
        if (!debouncedSearch.trim()) return allStaffs;

        const query = debouncedSearch.toLowerCase();
        return allStaffs.filter((staff) => {
            const name = staff.user?.name?.toLowerCase() || '';
            const sid = staff.staffId?.toLowerCase() || '';
            const designation = staff.designation?.toLowerCase() || '';
            return (
                name.includes(query) ||
                sid.includes(query) ||
                designation.includes(query)
            );
        });
    }, [staffsData?.staffs, debouncedSearch]);

    const [staffSelectOpen, setStaffSelectOpen] = useState(false);

    const {
        register,
        handleSubmit,
        control,
        reset,
        setValue,
        formState: { errors },
    } = useForm<OvertimeFormValues>({
        resolver: zodResolver(overtimeSchema),
        defaultValues: {
            staffIds: [],
            date: new Date(),
            type: 'post_shift',
            startTime: '',
            durationMinutes: 60,
            reason: '',
        },
    });

    const watchStaffIds = useWatch({ control, name: 'staffIds' }) || [];
    const watchDuration = useWatch({ control, name: 'durationMinutes' });

    const prevOpenRef = useRef(false);
    useEffect(() => {
        const justOpened = open && !prevOpenRef.current;
        prevOpenRef.current = open;
        if (!justOpened) return;

        if (data) {
            reset({
                staffIds: [data.staffId._id],
                date: new Date(data.date),
                type: data.type,
                startTime: new Date(data.startTime).toTimeString().slice(0, 5),
                durationMinutes: data.durationMinutes,
                reason: data.reason || '',
            });
        } else {
            reset({
                staffIds: [],
                date: new Date(),
                type: 'post_shift',
                startTime: '',
                durationMinutes: 60,
                reason: '',
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, data]);

    const onSubmit = async (values: OvertimeFormValues) => {
        try {
            const dateStr = values.date.toISOString().split('T')[0];
            const startDateTime = new Date(`${dateStr}T${values.startTime}`);

            const commonPayload = {
                date: dateStr,
                type: values.type,
                startTime: startDateTime.toISOString(),
                durationMinutes: values.durationMinutes,
                reason: values.reason,
            };

            if (data) {
                await updateOvertime({
                    id: data._id,
                    staffId: values.staffIds[0],
                    ...commonPayload,
                }).unwrap();
                toast.success('Overtime updated successfully');
            } else {
                const result = await createOvertime({
                    staffIds: values.staffIds,
                    ...commonPayload,
                }).unwrap();

                if (result.errorCount > 0) {
                    toast.warning(
                        `Created ${result.successCount} and skipped ${result.errorCount} duplicates`,
                    );
                } else {
                    toast.success('Overtime assigned successfully');
                }
            }
            onOpenChange(false);
            reset();
        } catch (error) {
            toast.error((error as Error).message || 'Something went wrong');
        }
    };

    const isLoading = isCreating || isUpdating;

    const getInitials = useCallback((name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }, []);

    const getStaffById = useCallback(
        (id: string): IStaff | undefined => {
            return staffsData?.staffs?.find((s: IStaff) => s._id === id);
        },
        [staffsData?.staffs],
    );

    const branches = branchesData?.branches || [];

    const formatDurationLabel = (mins: number) => {
        if (mins < 60) return `${mins}m`;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(isOpen) => {
                if (!isOpen) setStaffSearchTerm('');
                onOpenChange(isOpen);
            }}
        >
            <DialogContent className="sm:max-w-[600px] p-0 gap-0 max-h-[85vh] overflow-hidden flex flex-col">
                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="flex flex-col overflow-hidden h-full"
                >
                    {/* Header */}
                    <div className="px-6 pt-6 pb-4 shrink-0">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-semibold">
                                {data ? 'Edit Overtime' : 'Add Overtime'}
                            </DialogTitle>
                            <DialogDescription>
                                {data
                                    ? 'Update overtime details for this staff member.'
                                    : 'Assign overtime to one or more staff members.'}
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <Separator className="shrink-0" />

                    {/* Form Body */}
                    <div className="flex-1 min-h-0 overflow-y-auto px-6">
                        <div className="space-y-5 py-5">
                            {/* Branch Selection (Admin only) */}
                            {canChangeBranch && !data && (
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium flex items-center gap-2">
                                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                        Branch
                                    </Label>
                                    <Select
                                        onValueChange={(v) =>
                                            setSelectedBranchId(v)
                                        }
                                        defaultValue={
                                            selectedBranchId || 'all'
                                        }
                                    >
                                        <SelectTrigger className="h-10">
                                            <SelectValue placeholder="All Branches" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">
                                                All Branches
                                            </SelectItem>
                                            {branches.map(
                                                (branch: IBranch) => (
                                                    <SelectItem
                                                        key={branch._id}
                                                        value={branch._id}
                                                    >
                                                        {branch.name}
                                                    </SelectItem>
                                                ),
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Staff Selection */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium flex items-center gap-2">
                                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                    Staff Members
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Controller
                                    control={control}
                                    name="staffIds"
                                    render={({ field }) => {
                                        const allStaffIds =
                                            staffsData?.staffs?.map(
                                                (s: IStaff) => s._id,
                                            ) || [];
                                        const isAllSelected =
                                            allStaffIds.length > 0 &&
                                            field.value.length ===
                                                allStaffIds.length;

                                        const toggleStaff = (id: string) => {
                                            const current = [...field.value];
                                            const index = current.indexOf(id);
                                            if (index > -1) {
                                                current.splice(index, 1);
                                            } else {
                                                current.push(id);
                                            }
                                            field.onChange(current);
                                        };

                                        const toggleAll = () => {
                                            field.onChange(
                                                isAllSelected
                                                    ? []
                                                    : allStaffIds,
                                            );
                                        };

                                        const removeStaff = (
                                            e: React.MouseEvent,
                                            id: string,
                                        ) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            field.onChange(
                                                field.value.filter(
                                                    (sid: string) => sid !== id,
                                                ),
                                            );
                                        };

                                        return (
                                            <div className="space-y-2">
                                                <Popover
                                                    open={staffSelectOpen}
                                                    onOpenChange={
                                                        setStaffSelectOpen
                                                    }
                                                >
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            role="combobox"
                                                            className="w-full justify-between h-10 font-normal"
                                                            disabled={false}
                                                        >
                                                            <span className="truncate text-muted-foreground">
                                                                {field.value
                                                                    .length === 0
                                                                    ? 'Select staff members...'
                                                                    : `${field.value.length} staff selected`}
                                                            </span>
                                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>

                                                    <PopoverContent
                                                        className="p-0"
                                                        align="start"
                                                        style={{
                                                            width: 'var(--radix-popover-trigger-width)',
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-2 border-b px-3 py-2.5">
                                                            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                            <input
                                                                ref={
                                                                    searchInputRef
                                                                }
                                                                type="text"
                                                                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                                                                placeholder="Search by name or designation..."
                                                                value={
                                                                    staffSearchTerm
                                                                }
                                                                onChange={(e) =>
                                                                    setStaffSearchTerm(
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                            />
                                                            {staffSearchTerm && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setStaffSearchTerm(
                                                                            '',
                                                                        )
                                                                    }
                                                                    className="text-muted-foreground hover:text-foreground"
                                                                >
                                                                    <X className="h-3.5 w-3.5" />
                                                                </button>
                                                            )}
                                                        </div>

                                                        <ScrollArea className="h-64">
                                                            {isStaffsLoading ? (
                                                                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                    Loading...
                                                                </div>
                                                            ) : filteredStaffs.length ===
                                                              0 ? (
                                                                <div className="py-8 text-center text-sm text-muted-foreground">
                                                                    {debouncedSearch
                                                                        ? `No results for "${debouncedSearch}"`
                                                                        : 'No staff found'}
                                                                </div>
                                                            ) : (
                                                                <div className="p-1">
                                                                    {!debouncedSearch && (
                                                                        <>
                                                                            <div
                                                                                role="button"
                                                                                tabIndex={
                                                                                    0
                                                                                }
                                                                                onClick={
                                                                                    toggleAll
                                                                                }
                                                                                onKeyDown={(
                                                                                    e,
                                                                                ) => {
                                                                                    if (
                                                                                        e.key ===
                                                                                            'Enter' ||
                                                                                        e.key ===
                                                                                            ' '
                                                                                    ) {
                                                                                        e.preventDefault();
                                                                                        toggleAll();
                                                                                    }
                                                                                }}
                                                                                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent cursor-pointer"
                                                                            >
                                                                                <Checkbox
                                                                                    checked={
                                                                                        isAllSelected
                                                                                    }
                                                                                    className="pointer-events-none"
                                                                                />
                                                                                <span className="font-medium">
                                                                                    Select
                                                                                    All
                                                                                </span>
                                                                                <span className="ml-auto text-xs text-muted-foreground">
                                                                                    {
                                                                                        allStaffIds.length
                                                                                    }
                                                                                </span>
                                                                            </div>
                                                                            <Separator className="my-1" />
                                                                        </>
                                                                    )}

                                                                    {filteredStaffs.map(
                                                                        (
                                                                            staff: IStaff,
                                                                        ) => {
                                                                            const isSelected =
                                                                                field.value.includes(
                                                                                    staff._id,
                                                                                );
                                                                            return (
                                                                                <div
                                                                                    key={
                                                                                        staff._id
                                                                                    }
                                                                                    role="button"
                                                                                    tabIndex={
                                                                                        0
                                                                                    }
                                                                                    onClick={() =>
                                                                                        toggleStaff(
                                                                                            staff._id,
                                                                                        )
                                                                                    }
                                                                                    onKeyDown={(
                                                                                        e,
                                                                                    ) => {
                                                                                        if (
                                                                                            e.key ===
                                                                                                'Enter' ||
                                                                                            e.key ===
                                                                                                ' '
                                                                                        ) {
                                                                                            e.preventDefault();
                                                                                            toggleStaff(
                                                                                                staff._id,
                                                                                            );
                                                                                        }
                                                                                    }}
                                                                                    className={cn(
                                                                                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm cursor-pointer transition-colors',
                                                                                        isSelected
                                                                                            ? 'bg-primary/5'
                                                                                            : 'hover:bg-accent',
                                                                                    )}
                                                                                >
                                                                                    <Checkbox
                                                                                        checked={
                                                                                            isSelected
                                                                                        }
                                                                                        className="pointer-events-none"
                                                                                    />
                                                                                    <Avatar className="h-7 w-7">
                                                                                        <AvatarImage
                                                                                            src={
                                                                                                staff
                                                                                                    .user
                                                                                                    ?.image as string
                                                                                            }
                                                                                        />
                                                                                        <AvatarFallback className="text-[10px] bg-muted">
                                                                                            {getInitials(
                                                                                                staff
                                                                                                    .user
                                                                                                    ?.name ||
                                                                                                    'U',
                                                                                            )}
                                                                                        </AvatarFallback>
                                                                                    </Avatar>
                                                                                    <div className="flex flex-col min-w-0">
                                                                                        <span className="truncate text-sm font-medium">
                                                                                            {staff
                                                                                                .user
                                                                                                ?.name ||
                                                                                                'Unknown'}
                                                                                        </span>
                                                                                        <span className="truncate text-xs text-muted-foreground">
                                                                                            {
                                                                                                staff.designation
                                                                                            }
                                                                                        </span>
                                                                                    </div>
                                                                                    {isSelected && (
                                                                                        <Check className="ml-auto h-4 w-4 text-primary shrink-0" />
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        },
                                                                    )}
                                                                </div>
                                                            )}
                                                        </ScrollArea>
                                                    </PopoverContent>
                                                </Popover>

                                                {/* Selected Badges */}
                                                {field.value.length > 0 &&
                                                    !data && (
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            {field.value.map(
                                                                (id) => {
                                                                    const staff =
                                                                        getStaffById(
                                                                            id,
                                                                        );
                                                                    return (
                                                                        <Badge
                                                                            key={
                                                                                id
                                                                            }
                                                                            variant="secondary"
                                                                            className="gap-1 pr-1 font-normal"
                                                                        >
                                                                            <span className="max-w-[100px] truncate text-xs">
                                                                                {staff
                                                                                    ?.user
                                                                                    ?.name ||
                                                                                    'Staff'}
                                                                            </span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={(
                                                                                    e,
                                                                                ) =>
                                                                                    removeStaff(
                                                                                        e,
                                                                                        id,
                                                                                    )
                                                                                }
                                                                                className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive"
                                                                            >
                                                                                <X className="h-3 w-3" />
                                                                            </button>
                                                                        </Badge>
                                                                    );
                                                                },
                                                            )}
                                                            {field.value
                                                                .length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(
                                                                        e,
                                                                    ) => {
                                                                        e.preventDefault();
                                                                        field.onChange(
                                                                            [],
                                                                        );
                                                                    }}
                                                                    className="text-xs text-muted-foreground hover:text-destructive px-1.5 py-0.5 rounded hover:bg-destructive/10 transition-colors"
                                                                >
                                                                    Clear all
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                            </div>
                                        );
                                    }}
                                />
                                {errors.staffIds && (
                                    <p className="text-xs text-destructive">
                                        {errors.staffIds.message}
                                    </p>
                                )}
                            </div>

                            <Separator />

                            {/* Date & Type Row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium flex items-center gap-2">
                                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                                        Date
                                    </Label>
                                    <Controller
                                        control={control}
                                        name="date"
                                        render={({ field }) => (
                                            <DatePicker
                                                value={field.value}
                                                onChange={(date) =>
                                                    field.onChange(
                                                        date as Date,
                                                    )
                                                }
                                            />
                                        )}
                                    />
                                    {errors.date && (
                                        <p className="text-xs text-destructive">
                                            {errors.date.message}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium flex items-center gap-2">
                                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                        Type
                                    </Label>
                                    <Controller
                                        name="type"
                                        control={control}
                                        render={({ field }) => (
                                            <Select
                                                onValueChange={field.onChange}
                                                value={field.value}
                                            >
                                                <SelectTrigger className="h-10">
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {TYPE_OPTIONS.map((opt) => (
                                                        <SelectItem
                                                            key={opt.value}
                                                            value={opt.value}
                                                        >
                                                            {opt.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    {errors.type && (
                                        <p className="text-xs text-destructive">
                                            {errors.type.message}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Start Time & Duration Row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium flex items-center gap-2">
                                        <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                                        Start Time
                                    </Label>
                                    <Controller
                                        control={control}
                                        name="startTime"
                                        render={({ field }) => (
                                            <TimePicker
                                                value={field.value}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    />
                                    {errors.startTime && (
                                        <p className="text-xs text-destructive">
                                            {errors.startTime.message}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">
                                        Duration{' '}
                                        <span className="text-muted-foreground font-normal">
                                            (minutes)
                                        </span>
                                    </Label>
                                    <Input
                                        type="number"
                                        className="h-10"
                                        {...register('durationMinutes', {
                                            valueAsNumber: true,
                                        })}
                                    />
                                    <div className="flex flex-wrap gap-1.5">
                                        {DURATION_PRESETS.map((mins) => (
                                            <button
                                                key={mins}
                                                type="button"
                                                onClick={() =>
                                                    setValue(
                                                        'durationMinutes',
                                                        mins,
                                                    )
                                                }
                                                className={cn(
                                                    'px-2.5 py-1 rounded-md text-xs font-medium border transition-colors',
                                                    watchDuration === mins
                                                        ? 'bg-primary text-primary-foreground border-primary'
                                                        : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground',
                                                )}
                                            >
                                                {formatDurationLabel(mins)}
                                            </button>
                                        ))}
                                    </div>
                                    {errors.durationMinutes && (
                                        <p className="text-xs text-destructive">
                                            {errors.durationMinutes.message}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Reason */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium flex items-center gap-2">
                                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                    Reason
                                    <span className="text-muted-foreground font-normal text-xs">
                                        (optional)
                                    </span>
                                </Label>
                                <Textarea
                                    placeholder="Why is this overtime needed?"
                                    rows={3}
                                    className="resize-none"
                                    {...register('reason')}
                                />
                            </div>
                        </div>
                    </div>

                    <Separator className="shrink-0" />

                    {/* Footer */}
                    <div className="px-6 py-4 shrink-0">
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    isLoading || watchStaffIds.length === 0
                                }
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : data ? (
                                    'Update Overtime'
                                ) : watchStaffIds.length > 0 ? (
                                    `Assign to ${watchStaffIds.length} staff`
                                ) : (
                                    'Assign Overtime'
                                )}
                            </Button>
                        </DialogFooter>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
