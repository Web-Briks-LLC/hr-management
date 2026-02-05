// Imports updated for new components
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
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { IOvertime } from '@/types/overtime.type';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/shared/DatePicker';
import { TimePicker } from '@/components/shared/TimePicker';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import IStaff from '@/types/staff.type';
import { IBranch } from '@/types/branch.type';
import { useSession } from '@/lib/auth-client';

const overtimeSchema = z.object({
    staffId: z.string().min(1, 'Staff ID is required'),
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
    data?: IOvertime | null; // If valid, we are editing
}

export function OvertimeDialog({
    open,
    onOpenChange,
    data,
}: OvertimeDialogProps) {
    const [createOvertime, { isLoading: isCreating }] =
        useCreateOvertimeMutation();
    const [updateOvertime, { isLoading: isUpdating }] =
        useUpdateOvertimeMutation();

    // Get Current User info
    const { data: session } = useSession();
    const { data: meData } = useGetMeQuery({});
    const currentUser = meData?.staff;

    // Use role from session (auth) or fallback to staff user role
    const userRole = session?.user?.role || currentUser?.user?.role;

    const isBranchAdmin =
        userRole === 'branch_admin' ||
        userRole === 'admin' ||
        userRole === 'super_admin';

    // State for Branch Selection (only for admins)
    const [selectedBranchId, setSelectedBranchId] = useState<string>('');

    // Update selectedBranchId when currentUser loads
    useEffect(() => {
        if (currentUser?.branchId && !selectedBranchId) {
            setSelectedBranchId(currentUser.branchId);
        }
    }, [currentUser, selectedBranchId]);

    // Fetch Branches (only if admin)
    const { data: branchesData } = useGetAllBranchesQuery(undefined, {
        skip: !isBranchAdmin,
    });

    // Fetch staffs for selection
    // Explicitly ask for 0 limit (all) and filter by branch and exclude admins
    const { data: staffsData, isLoading: isStaffsLoading } = useGetStaffsQuery(
        {
            limit: 0,
            status: 'active',
            branchId: selectedBranchId,
            excludeAdmins: true,
        },
        {
            skip: !selectedBranchId, // Don't fetch until we know the branch (or if global admin user decides to select "all"?? For now let's enforce branch selection if logic demands it, but standard flow is: admin has a branch, they see that branch's staff)
        },
    );

    // State for staff selection dropdown
    const [staffSelectOpen, setStaffSelectOpen] = useState(false);

    const {
        register,
        handleSubmit,
        control,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<OvertimeFormValues>({
        resolver: zodResolver(overtimeSchema),
        defaultValues: {
            staffId: '',
            date: new Date(),
            type: 'post_shift',
            startTime: '',
            durationMinutes: 60,
            reason: '',
        },
    });

    useEffect(() => {
        if (data) {
            reset({
                staffId: data.staffId._id,
                date: new Date(data.date),
                type: data.type,
                startTime: new Date(data.startTime).toTimeString().slice(0, 5), // HH:mm
                durationMinutes: data.durationMinutes,
                reason: data.reason || '',
            });
        } else {
            reset({
                staffId: '',
                date: new Date(),
                type: 'post_shift',
                startTime: '',
                durationMinutes: 60,
                reason: '',
            });
        }
    }, [data, reset, open]);

    const onSubmit = async (values: OvertimeFormValues) => {
        try {
            // Construct ISO date string for startTime
            const dateStr = values.date.toISOString().split('T')[0];
            const startDateTime = new Date(`${dateStr}T${values.startTime}`);

            const payload = {
                ...values,
                date: dateStr, // API expects string YYYY-MM-DD
                startTime: startDateTime.toISOString(),
            };

            if (data) {
                await updateOvertime({ id: data._id, ...payload }).unwrap();
                toast.success('Overtime updated successfully');
            } else {
                await createOvertime(payload).unwrap();
                toast.success('Overtime created successfully');
            }
            onOpenChange(false);
            reset();
        } catch (error: any) {
            toast.error(error?.data?.message || 'Something went wrong');
        }
    };

    const isLoading = isCreating || isUpdating;

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    // Filter branches if needed or just show all
    const branches = branchesData?.branches || [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {data ? 'Edit Overtime' : 'Add Overtime'}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <DialogDescription className="hidden">
                        Overtime details form
                    </DialogDescription>
                    {/* Branch Selection for Admins */}
                    {isBranchAdmin && (
                        <div className="grid gap-2">
                            <Label htmlFor="branch">Branch</Label>
                            <Select
                                value={selectedBranchId}
                                onValueChange={setSelectedBranchId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Branch" />
                                </SelectTrigger>
                                <SelectContent>
                                    {branches.map((branch: IBranch) => (
                                        <SelectItem
                                            key={branch._id}
                                            value={branch._id}
                                        >
                                            {branch.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Staff Selection */}
                    <div className="grid gap-2">
                        <Label htmlFor="staffId">Staff Member</Label>
                        <Controller
                            name="staffId"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    open={staffSelectOpen}
                                    onOpenChange={setStaffSelectOpen}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select staff member" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <ScrollArea className="h-[200px]">
                                            {isStaffsLoading ? (
                                                <div className="p-2 text-center text-sm text-muted-foreground">
                                                    Loading staffs...
                                                </div>
                                            ) : (
                                                staffsData?.staffs?.map(
                                                    (staff: IStaff) => (
                                                        <SelectItem
                                                            key={staff._id}
                                                            value={staff._id}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <Avatar className="h-6 w-6">
                                                                    <AvatarImage
                                                                        src={
                                                                            staff
                                                                                .user
                                                                                ?.image as string
                                                                        }
                                                                    />
                                                                    <AvatarFallback>
                                                                        {getInitials(
                                                                            staff
                                                                                .user
                                                                                ?.name ||
                                                                                'U',
                                                                        )}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <span>
                                                                    {staff.user
                                                                        ?.name ||
                                                                        'Unknown'}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    (
                                                                    {
                                                                        staff.designation
                                                                    }
                                                                    )
                                                                </span>
                                                            </div>
                                                        </SelectItem>
                                                    ),
                                                )
                                            )}
                                        </ScrollArea>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.staffId && (
                            <p className="text-sm text-red-500">
                                {errors.staffId.message}
                            </p>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <DatePicker
                            label="Date"
                            value={watch('date')}
                            onChange={(date) => setValue('date', date as Date)}
                        />
                        {errors.date && (
                            <p className="text-sm text-red-500">
                                {errors.date.message}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="type">Type</Label>
                            <Controller
                                name="type"
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        value={field.value}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pre_shift">
                                                Pre Shift
                                            </SelectItem>
                                            <SelectItem value="post_shift">
                                                Post Shift
                                            </SelectItem>
                                            <SelectItem value="weekend">
                                                Weekend
                                            </SelectItem>
                                            <SelectItem value="holiday">
                                                Holiday
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {errors.type && (
                                <p className="text-sm text-red-500">
                                    {errors.type.message}
                                </p>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="durationMinutes">
                                Duration (mins)
                            </Label>
                            <Input
                                id="durationMinutes"
                                type="number"
                                {...register('durationMinutes', {
                                    valueAsNumber: true,
                                })}
                            />
                            {errors.durationMinutes && (
                                <p className="text-sm text-red-500">
                                    {errors.durationMinutes.message}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="startTime">Start Time</Label>
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
                            <p className="text-sm text-red-500">
                                {errors.startTime.message}
                            </p>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="reason">Reason</Label>
                        <Textarea
                            id="reason"
                            placeholder="Optional reason..."
                            {...register('reason')}
                        />
                        {errors.reason && (
                            <p className="text-sm text-red-500">
                                {errors.reason.message}
                            </p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
