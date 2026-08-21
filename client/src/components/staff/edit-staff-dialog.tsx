"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Role } from "@/constants/role";
import { useGetAllBranchesQuery } from "@/redux/features/branch/branchApi";
import { useUpdateStaffMutation } from "@/redux/features/staff/staffApi";
import { useGetAllDepartmentsQuery } from "@/redux/features/department/departmentApi";
import { useGetAllDesignationsQuery } from "@/redux/features/designation/designationApi";
import IStaff from "@/types/staff.type";
import { zodResolver } from "@hookform/resolvers/zod";
import { DESIGNATIONS, DEPARTMENTS } from "@/constants/metadata";
import { CalendarIcon, Edit, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const formSchema = z.object({
    branchId: z.string().optional(),
    department: z.string().min(1, "Department is required"),
    designation: z.string().min(1, "Designation is required"),
    role: z.string().optional(),
    status: z.enum(["active", "inactive", "terminated"]),
    salary: z.number().min(0, "Salary must be positive"),
    salaryVisibleToEmployee: z.boolean(),
    joinDate: z.string().optional(),
    // Bank Account Fields
    bank: z.object({
        bankName: z.string().optional(),
        accountNumber: z.string().optional(),
        accountHolderName: z.string().optional(),
        branch: z.string().optional(),
        routingNumber: z.string().optional(),
    }),
});

type FormData = z.infer<typeof formSchema>;

interface EditStaffDialogProps {
    staff: IStaff;
    currentShiftId?: string;
}

export function EditStaffDialog({ staff }: EditStaffDialogProps) {
    const [open, setOpen] = useState(false);

    const [updateStaff, { isLoading }] = useUpdateStaffMutation();
    const { data: branchesData } = useGetAllBranchesQuery({});
    const { data: depData } = useGetAllDepartmentsQuery(undefined);
    const { data: desData } = useGetAllDesignationsQuery(undefined);

    const departmentsList = depData?.departments?.length
        ? depData.departments.filter((d: any) => d.isActive).map((d: any) => ({ value: d.name, label: d.name }))
        : DEPARTMENTS;

    const designationsList = desData?.designations?.length
        ? desData.designations.filter((d: any) => d.isActive).map((d: any) => ({ value: d.title, label: d.title }))
        : DESIGNATIONS;

    const getResolvedBranchId = () => {
        return (
            (typeof staff.branchId === "string" ? staff.branchId : (staff.branch as any)?._id) ||
            (staff as any).branchId ||
            ""
        );
    };

    const getResolvedDepartment = () => {
        const raw = staff.department?.trim() || "";
        if (!raw) return "";
        const match = departmentsList.find(
            (d: any) =>
                d.value.toLowerCase() === raw.toLowerCase() ||
                d.label.toLowerCase() === raw.toLowerCase()
        );
        return match ? match.value : raw;
    };

    const getResolvedDesignation = () => {
        const raw = staff.designation?.trim() || "";
        if (!raw) return "";
        const match = designationsList.find(
            (d: any) =>
                d.value.toLowerCase() === raw.toLowerCase() ||
                d.label.toLowerCase() === raw.toLowerCase()
        );
        return match ? match.value : raw;
    };

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            branchId: getResolvedBranchId(),
            department: getResolvedDepartment(),
            designation: getResolvedDesignation(),
            role: staff.user?.role || Role.STAFF,
            status: staff.status || "active",
            salary: staff.salary || 0,
            joinDate: staff.joinDate ? new Date(staff.joinDate).toISOString().split('T')[0] : "",
            salaryVisibleToEmployee: staff.salaryVisibleToEmployee !== false,
            bank: {
                bankName: staff.bank?.bankName || "",
                accountNumber: staff.bank?.accountNumber || "",
                accountHolderName: staff.bank?.accountHolderName || "",
                branch: staff.bank?.branch || "",
                routingNumber: staff.bank?.routingNumber || "",
            },
        },
    });

    useEffect(() => {
        if (open) {
            form.reset({
                branchId: getResolvedBranchId(),
                department: getResolvedDepartment(),
                designation: getResolvedDesignation(),
                role: staff.user?.role || Role.STAFF,
                status: staff.status || "active",
                salary: staff.salary || 0,
                joinDate: staff.joinDate ? new Date(staff.joinDate).toISOString().split('T')[0] : "",
                salaryVisibleToEmployee:
                    staff.salaryVisibleToEmployee !== false,
                bank: {
                    bankName: staff.bank?.bankName || "",
                    accountNumber: staff.bank?.accountNumber || "",
                    accountHolderName: staff.bank?.accountHolderName || "",
                    branch: staff.bank?.branch || "",
                    routingNumber: staff.bank?.routingNumber || "",
                },
            });
        }
    }, [open, staff, depData, desData, branchesData]);

    async function onSubmit(values: FormData) {
        try {
            const payload = {
                ...values,
            };

            await updateStaff({
                id: staff.staffId,
                data: payload,
            }).unwrap();

            toast.success("Staff profile updated successfully");
            setOpen(false);
        } catch (error: unknown) {
            const err = error as { data?: { message?: string } };
            toast.error(err?.data?.message || "Failed to update profile");
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
                            <Label>Department</Label>
                            <Controller
                                control={form.control}
                                name="department"
                                render={({ field }) => (
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select department" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {departmentsList.map((dept: any) => (
                                                <SelectItem
                                                    key={dept.value}
                                                    value={dept.value}
                                                >
                                                    {dept.label}
                                                </SelectItem>
                                            ))}
                                            {field.value && !departmentsList.some((d: any) => d.value === field.value) && (
                                                <SelectItem value={field.value}>{field.value}</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {form.formState.errors.department && (
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.department.message}
                                </p>
                            )}
                        </div>

                        {/* Designation */}
                        <div className="space-y-2">
                            <Label>Designation</Label>
                            <Controller
                                control={form.control}
                                name="designation"
                                render={({ field }) => (
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select designation" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {designationsList.map((desig: any) => (
                                                <SelectItem
                                                    key={desig.value}
                                                    value={desig.value}
                                                >
                                                    {desig.label}
                                                </SelectItem>
                                            ))}
                                            {field.value && !designationsList.some((d: any) => d.value === field.value) && (
                                                <SelectItem value={field.value}>{field.value}</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                )}
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
                                                (branch: {
                                                    _id: string;
                                                    name: string;
                                                }) => (
                                                    <SelectItem
                                                        key={branch._id}
                                                        value={branch._id}
                                                    >
                                                        {branch.name}
                                                    </SelectItem>
                                                ),
                                            )}
                                            {field.value && !branchesData?.branches?.some((b: any) => b._id === field.value) && (
                                                <SelectItem value={field.value}>{(staff.branch as any)?.name || field.value}</SelectItem>
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
                            Employment Dates
                        </h4>
                        <div className="space-y-2 flex flex-col">
                            <Label htmlFor="joinDate">Join Date</Label>
                            <Controller
                                control={form.control}
                                name="joinDate"
                                render={({ field }) => (
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full pl-3 text-left font-normal",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value ? (
                                                    format(new Date(field.value), "PPP")
                                                ) : (
                                                    <span>Pick a date</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value ? new Date(field.value) : undefined}
                                                onSelect={(date) => 
                                                    field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                                                }
                                                disabled={(date) =>
                                                    date > new Date() || date < new Date("1900-01-01")
                                                }
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
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
                                    {...form.register("salary", {
                                        valueAsNumber: true,
                                    })}
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
                                    {...form.register("bank.bankName")}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="accountNumber">
                                    Account Number
                                </Label>
                                <Input
                                    id="accountNumber"
                                    placeholder="e.g., 1234567890"
                                    {...form.register("bank.accountNumber")}
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="accountHolderName">
                                    Account Holder Name
                                </Label>
                                <Input
                                    id="accountHolderName"
                                    placeholder="Name as per bank account"
                                    {...form.register("bank.accountHolderName")}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="branch">Branch</Label>
                                <Input
                                    id="branch"
                                    placeholder="Branch Name"
                                    {...form.register("bank.branch")}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="routingNumber">
                                    Routing Number
                                </Label>
                                <Input
                                    id="routingNumber"
                                    placeholder="Routing Number"
                                    {...form.register("bank.routingNumber")}
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
