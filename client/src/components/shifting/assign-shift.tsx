'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Role } from '@/constants/role';
import { useSession } from '@/lib/auth-client';
import { useGetAllShiftsQuery } from '@/redux/features/shift/shiftApi';
import { useGetStaffsQuery } from '@/redux/features/staff/staffApi';
import { zodResolver } from '@hookform/resolvers/zod';
import { IconPlus, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import z from 'zod';
import { DatePicker } from '../shared/DatePicker';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import IStaff from '@/types/staff.type';
import { IShift } from '@/types/shift.type';
import { Spinner } from '../ui/spinner';
import { toast } from 'sonner';
import { useAssignShiftMutation } from '@/redux/features/shiftAssignment/shiftAssignmentApi';

const shiftAssignSchema = z.object({
    staffIds: z
        .array(z.string())
        .min(1, 'At least one staff member is required'),

    shiftId: z.string().min(1, 'Shift is required'),

    startDate: z
        .date()
        .refine(
            (date) => date >= new Date(new Date().setHours(0, 0, 0, 0)),
            'Start date must be today or later',
        ),
});

type FormData = z.infer<typeof shiftAssignSchema>;

export default function AssignShift() {
    const { data: session, isPending, isRefetching } = useSession();

    const [open, setOpen] = useState(false);
    const [selectedStaffs, setSelectedStaffs] = useState<IStaff[]>([]);
    const [staffSelectOpen, setStaffSelectOpen] = useState(false);

    const {
        data: staffsData,
        isLoading: isStaffsLoading,
        isFetching: isStaffsFetching,
    } = useGetStaffsQuery(
        {},
        { skip: !session || session.user.role === Role.STAFF },
    );

    const {
        data: shiftsData,
        isLoading: isShiftsLoading,
        isFetching: isShiftsFetching,
    } = useGetAllShiftsQuery(
        {},
        { skip: !session || session.user.role === Role.STAFF },
    );

    const [assignShift, { isLoading: isAssigning }] = useAssignShiftMutation();

    const form = useForm<FormData>({
        resolver: zodResolver(shiftAssignSchema),
        defaultValues: {
            staffIds: [],
            shiftId: '',
            startDate: new Date(),
        },
    });

    const isLoading =
        isPending ||
        isRefetching ||
        isStaffsLoading ||
        isStaffsFetching ||
        isShiftsLoading ||
        isShiftsFetching;

    const canCreate = session && session.user.role !== Role.STAFF;

    const handleAddStaff = (staffId: string) => {
        const staff = staffsData?.staffs?.find(
            (s: IStaff) => s._id === staffId,
        );

        if (staff && !selectedStaffs.find((s) => s._id === staffId)) {
            const newStaffs = [...selectedStaffs, staff];

            setSelectedStaffs(newStaffs);

            form.setValue(
                'staffIds',
                newStaffs.map((s) => s._id),
            );
        }
    };

    const handleRemoveStaff = (staffId: string) => {
        const newStaffs = selectedStaffs.filter((s) => s._id !== staffId);

        setSelectedStaffs(newStaffs);

        form.setValue(
            'staffIds',
            newStaffs.map((s) => s._id),
        );
    };

    const onSubmit = async (data: FormData) => {
        try {
            const result = await assignShift({
                staffIds: data.staffIds,
                shiftId: data.shiftId,
                startDate: data.startDate.toISOString(),
            }).unwrap();

            console.log(result);

            if (result.success) {
                toast.success(result.message);

                form.reset();
                setSelectedStaffs([]);
                setOpen(false);
            }
        } catch (error) {
            toast.error((error as Error).message || 'Failed to assign shift');
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button disabled={isLoading || !canCreate}>
                    <IconPlus />
                    Assign Shift
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-2xl">
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <DialogHeader>
                        <DialogTitle>Assign Shift to Staff</DialogTitle>
                        <DialogDescription>
                            Select one or more staff members
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-3">
                            <Label>Shift *</Label>

                            <Select
                                value={form.watch('shiftId')}
                                onValueChange={(v) =>
                                    form.setValue('shiftId', v)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select shift" />
                                </SelectTrigger>

                                <SelectContent>
                                    {shiftsData?.shifts
                                        ?.filter((s: IShift) => s.isActive)
                                        .map((shift: IShift) => (
                                            <SelectItem
                                                key={shift._id}
                                                value={shift._id}
                                            >
                                                {shift.name} ({shift.startTime}{' '}
                                                - {shift.endTime})
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>

                            {form.formState.errors.shiftId && (
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.shiftId.message}
                                </p>
                            )}
                        </div>

                        <div className="grid gap-3">
                            <Label>Add Staff Members *</Label>

                            <Select
                                open={staffSelectOpen}
                                onOpenChange={setStaffSelectOpen}
                                value=""
                                onValueChange={handleAddStaff}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select staff to add" />
                                </SelectTrigger>

                                <SelectContent>
                                    <ScrollArea className="h-[200px]">
                                        {staffsData?.staffs
                                            ?.filter(
                                                (staff: IStaff) =>
                                                    !selectedStaffs.find(
                                                        (s) =>
                                                            s._id === staff._id,
                                                    ),
                                            )
                                            .map((staff: IStaff) => (
                                                <SelectItem
                                                    key={staff._id}
                                                    value={staff._id}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-6 w-6">
                                                            <AvatarImage
                                                                src={
                                                                    staff.user
                                                                        ?.image as string
                                                                }
                                                            />
                                                            <AvatarFallback>
                                                                {getInitials(
                                                                    staff.user
                                                                        ?.name ||
                                                                        'U',
                                                                )}
                                                            </AvatarFallback>
                                                        </Avatar>

                                                        <span>
                                                            {staff.user?.name ||
                                                                'Unknown'}
                                                        </span>

                                                        <span className="text-xs text-muted-foreground">
                                                            ({staff.designation}
                                                            )
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                    </ScrollArea>

                                    <div className="sticky bottom-0 border-t p-2">
                                        <Button
                                            type="button"
                                            className="w-full"
                                            onClick={() =>
                                                setStaffSelectOpen(false)
                                            }
                                        >
                                            Done Selecting
                                        </Button>
                                    </div>
                                </SelectContent>
                            </Select>

                            {form.formState.errors.staffIds && (
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.staffIds.message}
                                </p>
                            )}
                        </div>

                        {selectedStaffs.length > 0 && (
                            <div className="grid gap-2">
                                <Label>
                                    Selected Staff ({selectedStaffs.length})
                                </Label>

                                <ScrollArea className="h-[150px] border rounded-md p-2">
                                    <div className="flex flex-wrap gap-2">
                                        {selectedStaffs.map((staff) => (
                                            <Badge
                                                key={staff._id}
                                                variant="secondary"
                                                className="gap-2 items-center"
                                            >
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage
                                                        src={
                                                            staff.user
                                                                ?.image as string
                                                        }
                                                    />
                                                    <AvatarFallback>
                                                        {getInitials(
                                                            staff.user?.name ||
                                                                'U',
                                                        )}
                                                    </AvatarFallback>
                                                </Avatar>

                                                {staff.user?.name}

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                        handleRemoveStaff(
                                                            staff._id,
                                                        )
                                                    }
                                                >
                                                    <IconX className="text-destructive" />
                                                </Button>
                                            </Badge>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        )}

                        <DatePicker
                            label="Start Date *"
                            value={form.watch('startDate')}
                            onChange={(d) => d && form.setValue('startDate', d)}
                        />
                    </div>

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>

                        <Button
                            type="submit"
                            disabled={
                                isAssigning || selectedStaffs.length === 0
                            }
                        >
                            {isAssigning ? (
                                <Spinner className="mr-2" />
                            ) : (
                                `Assign to ${selectedStaffs.length} Staff${
                                    selectedStaffs.length !== 1 ? 's' : ''
                                }`
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
