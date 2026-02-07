'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import { Switch } from '@/components/ui/switch';
import { Role } from '@/constants/role';
import { useGetAllBranchesQuery } from '@/redux/features/branch/branchApi';
import { useUpdateStaffMutation } from '@/redux/features/staff/staffApi';
import IStaff from '@/types/staff.type';
import { zodResolver } from '@hookform/resolvers/zod';
import { Edit, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const formSchema = z.object({
    branchId: z.string().optional(),
    department: z.string().min(1, 'Department is required'),
    designation: z.string().min(1, 'Designation is required'),
    role: z.string().optional(),
    status: z.enum(['active', 'inactive', 'terminated']),
    salary: z.coerce.number().min(0, 'Salary must be positive'),
    salaryVisibleToEmployee: z.boolean().default(true),
    // Bank Account Fields
    bankName: z.string().optional(),
    bankAccountNo: z.string().optional(),
    bankAccountName: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EditStaffDialogProps {
    staff: IStaff;
    currentShiftId?: string;
}

export function EditStaffDialog({ staff }: EditStaffDialogProps) {
    const [open, setOpen] = useState(false);

    const { data: branchesData } = useGetAllBranchesQuery({});
    const [updateStaff, { isLoading }] = useUpdateStaffMutation();

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            branchId: staff.branchId || '',
            department: staff.department || '',
            designation: staff.designation || '',
            role: staff.user?.role || Role.STAFF,
            status: staff.status || 'active',
            salary: staff.salary || 0,
            salaryVisibleToEmployee: staff.salaryVisibleToEmployee !== false,
            bankName: staff.bankName || '',
            bankAccountNo: staff.bankAccountNo || '',
            bankAccountName: staff.bankAccountName || '',
        },
    });

    useEffect(() => {
        if (open) {
            form.reset({
                branchId: staff.branchId || '',
                department: staff.department || '',
                designation: staff.designation || '',
                role: staff.user?.role || Role.STAFF,
                status: staff.status || 'active',
                salary: staff.salary || 0,
                salaryVisibleToEmployee:
                    staff.salaryVisibleToEmployee !== false,
                bankName: staff.bankName || '',
                bankAccountNo: staff.bankAccountNo || '',
                bankAccountName: staff.bankAccountName || '',
            });
        }
    }, [open, staff, form]);

    async function onSubmit(values: FormData) {
        try {
            const payload = {
                ...values,
            };

            await updateStaff({
                id: staff.staffId,
                data: payload,
            }).unwrap();

            toast.success('Staff profile updated successfully');
            setOpen(false);
        } catch (error: any) {
            toast.error(error.data?.message || 'Failed to update profile');
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Staff Profile</DialogTitle>
                    <DialogDescription>
                        Update employment details, role, salary and bank
                        information.
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Department */}
                        <div className="space-y-2">
                            <Label htmlFor="department">Department</Label>
                            <Input
                                id="department"
                                {...form.register('department')}
                            />
                            {form.formState.errors.department && (
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.department.message}
                                </p>
                            )}
                        </div>

                        {/* Designation */}
                        <div className="space-y-2">
                            <Label htmlFor="designation">Designation</Label>
                            <Input
                                id="designation"
                                {...form.register('designation')}
                            />
                            {form.formState.errors.designation && (
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.designation.message}
                                </p>
                            )}
                        </div>

                        {/* Branch */}
                        <div className="space-y-2">
                            <Label>Branch</Label>
                            <Controller
                                control={form.control}
                                name="branchId"
                                render={({ field }) => (
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select branch" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {branchesData?.branches?.map(
                                                (branch: any) => (
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
                                )}
                            />
                            {form.formState.errors.branchId && (
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.branchId.message}
                                </p>
                            )}
                        </div>

                        {/* Status */}
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Controller
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">
                                                Active
                                            </SelectItem>
                                            <SelectItem value="inactive">
                                                Inactive
                                            </SelectItem>
                                            <SelectItem value="terminated">
                                                Terminated
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <h4 className="text-sm font-medium mb-4">
                            Role & Permissions
                        </h4>
                        <div className="space-y-2">
                            <Label>System Role</Label>
                            <Controller
                                control={form.control}
                                name="role"
                                render={({ field }) => (
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={Role.STAFF}>
                                                Staff
                                            </SelectItem>
                                            <SelectItem
                                                value={Role.TEAM_LEADER}
                                            >
                                                Team Leader
                                            </SelectItem>
                                            <SelectItem value={Role.HR_MANAGER}>
                                                HR Manager
                                            </SelectItem>
                                            <SelectItem value={Role.ADMIN}>
                                                Admin
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <h4 className="text-sm font-medium mb-4">
                            Compensation
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="salary">
                                    Base Salary (Monthly)
                                </Label>
                                <Input
                                    id="salary"
                                    type="number"
                                    {...form.register('salary')}
                                />
                                {form.formState.errors.salary && (
                                    <p className="text-sm text-destructive">
                                        {form.formState.errors.salary.message}
                                    </p>
                                )}
                            </div>

                            <div className="md:mt-1">
                                <Controller
                                    control={form.control}
                                    name="salaryVisibleToEmployee"
                                    render={({ field }) => (
                                        <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm h-full">
                                            <div className="space-y-0.5">
                                                <Label className="text-base">
                                                    Visible to Staff
                                                </Label>
                                                <div className="text-[0.8rem] text-muted-foreground">
                                                    Can staff see this salary?
                                                </div>
                                            </div>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </div>
                                    )}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bank Account Section */}
                    <div className="border-t pt-4">
                        <h4 className="text-sm font-medium mb-4">
                            Bank Account Details
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="bankName">Bank Name</Label>
                                <Input
                                    id="bankName"
                                    placeholder="e.g., Dutch Bangla Bank"
                                    {...form.register('bankName')}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="bankAccountNo">
                                    Account Number
                                </Label>
                                <Input
                                    id="bankAccountNo"
                                    placeholder="e.g., 1234567890"
                                    {...form.register('bankAccountNo')}
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="bankAccountName">
                                    Account Holder Name
                                </Label>
                                <Input
                                    id="bankAccountName"
                                    placeholder="Name as per bank account"
                                    {...form.register('bankAccountName')}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
