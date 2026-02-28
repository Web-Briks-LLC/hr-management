// Imports updated for new components
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
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
import {
    useCreateOvertimeMutation,
    useUpdateOvertimeMutation,
} from "@/redux/features/overtime/overtimeApi";
import {
    useGetStaffsQuery,
    useGetMeQuery,
} from "@/redux/features/staff/staffApi";
import { useGetAllBranchesQuery } from "@/redux/features/branch/branchApi";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useEffect, useState } from "react";
import { IOvertime } from "@/types/overtime.type";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/shared/DatePicker";
import { TimePicker } from "@/components/shared/TimePicker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import IStaff from "@/types/staff.type";
import { IBranch } from "@/types/branch.type";
import { useSession } from "@/lib/auth-client";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ChevronsUpDown, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const overtimeSchema = z.object({
    staffIds: z
        .array(z.string())
        .min(1, "At least one staff member is required"),
    date: z.date({ error: "Date is required" }),
    type: z.enum(["pre_shift", "post_shift", "weekend", "holiday"]),
    startTime: z.string().min(1, "Start time is required"),
    durationMinutes: z.number().min(1, "Duration must be at least 1 minute"),
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

    const canChangeBranch = userRole === "admin" || userRole === "super_admin";

    const isBranchManagementRole =
        canChangeBranch ||
        userRole === "branch_admin" ||
        userRole === "hr_manager" ||
        userRole === "team_leader";

    // State for Branch Selection (only for admins)
    const [selectedBranchId, setSelectedBranchId] = useState<string>("");

    // Initialize selectedBranchId when currentUser loads
    if (currentUser?.branchId && !selectedBranchId) {
        setSelectedBranchId(currentUser.branchId);
    }

    // Fetch Branches (only if they can change branch)
    const { data: branchesData } = useGetAllBranchesQuery(undefined, {
        skip: !canChangeBranch,
    });

    // Fetch staffs for selection
    const { data: staffsData, isLoading: isStaffsLoading } = useGetStaffsQuery(
        {
            limit: 1000,
            status: "active",
            branchId: selectedBranchId,
            excludeAdmins: true,
        },
        {
            skip: !selectedBranchId || !isBranchManagementRole,
        },
    );

    // State for staff selection dropdown
    const [staffSelectOpen, setStaffSelectOpen] = useState(false);

    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors },
    } = useForm<OvertimeFormValues>({
        resolver: zodResolver(overtimeSchema),
        defaultValues: {
            staffIds: [],
            date: new Date(),
            type: "post_shift",
            startTime: "",
            durationMinutes: 60,
            reason: "",
        },
    });

    useEffect(() => {
        if (data) {
            reset({
                staffIds: [data.staffId._id],
                date: new Date(data.date),
                type: data.type,
                startTime: new Date(data.startTime).toTimeString().slice(0, 5), // HH:mm
                durationMinutes: data.durationMinutes,
                reason: data.reason || "",
            });
        } else {
            reset({
                staffIds: [],
                date: new Date(),
                type: "post_shift",
                startTime: "",
                durationMinutes: 60,
                reason: "",
            });
        }
    }, [data, reset, open]);

    const onSubmit = async (values: OvertimeFormValues) => {
        try {
            // Construct ISO date string for startTime
            const dateStr = values.date.toISOString().split("T")[0];
            const startDateTime = new Date(`${dateStr}T${values.startTime}`);

            const commonPayload = {
                date: dateStr,
                type: values.type,
                startTime: startDateTime.toISOString(),
                durationMinutes: values.durationMinutes,
                reason: values.reason,
            };

            if (data) {
                // Editing existing record
                await updateOvertime({
                    id: data._id,
                    staffId: values.staffIds[0],
                    ...commonPayload,
                }).unwrap();
                toast.success("Overtime updated successfully");
            } else {
                // Bulk creation
                const result = await createOvertime({
                    staffIds: values.staffIds,
                    ...commonPayload,
                }).unwrap();

                if (result.errorCount > 0) {
                    toast.warning(
                        `Created ${result.successCount} and skipped ${result.errorCount} duplicates`,
                    );
                } else {
                    toast.success("Overtime assigned successfully");
                }
            }
            onOpenChange(false);
            reset();
        } catch (error) {
            toast.error((error as Error).message || "Something went wrong");
        }
    };

    const isLoading = isCreating || isUpdating;

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
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
                        {data ? "Edit Overtime" : "Add Overtime"}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <DialogDescription className="hidden">
                        Overtime details form
                    </DialogDescription>
                    {/* Branch Selection for Admins */}
                    {canChangeBranch && (
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
                        <Label>Staff Members</Label>
                        <Controller
                            name="staffIds"
                            control={control}
                            render={({ field }) => (
                                <div className="space-y-2">
                                    <Popover
                                        open={staffSelectOpen}
                                        onOpenChange={setStaffSelectOpen}
                                    >
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={staffSelectOpen}
                                                className="w-full justify-between h-auto min-h-10 text-left font-normal"
                                                disabled={!!data} // Disable multi-select when editing
                                            >
                                                <div className="flex flex-wrap gap-1 items-center">
                                                    {field.value.length > 0 ? (
                                                        field.value.map(
                                                            (id) => {
                                                                const staff =
                                                                    staffsData?.staffs?.find(
                                                                        (
                                                                            s: IStaff,
                                                                        ) =>
                                                                            s._id ===
                                                                            id,
                                                                    );
                                                                return (
                                                                    <Badge
                                                                        key={id}
                                                                        variant="secondary"
                                                                        className="mr-1 mb-1"
                                                                    >
                                                                        {staff
                                                                            ?.user
                                                                            ?.name ||
                                                                            "Selected"}
                                                                        {!data && (
                                                                            <button
                                                                                className="ml-1 ring-offset-background rounded-full outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                                                                onKeyDown={(
                                                                                    e,
                                                                                ) => {
                                                                                    if (
                                                                                        e.key ===
                                                                                        "Enter"
                                                                                    ) {
                                                                                        field.onChange(
                                                                                            field.value.filter(
                                                                                                (
                                                                                                    v,
                                                                                                ) =>
                                                                                                    v !==
                                                                                                    id,
                                                                                            ),
                                                                                        );
                                                                                    }
                                                                                }}
                                                                                onMouseDown={(
                                                                                    e,
                                                                                ) => {
                                                                                    e.preventDefault();
                                                                                    e.stopPropagation();
                                                                                }}
                                                                                onClick={() =>
                                                                                    field.onChange(
                                                                                        field.value.filter(
                                                                                            (
                                                                                                v,
                                                                                            ) =>
                                                                                                v !==
                                                                                                id,
                                                                                        ),
                                                                                    )
                                                                                }
                                                                            >
                                                                                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                                                            </button>
                                                                        )}
                                                                    </Badge>
                                                                );
                                                            },
                                                        )
                                                    ) : (
                                                        <span className="text-muted-foreground">
                                                            Select staff members
                                                        </span>
                                                    )}
                                                </div>
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            className="w-(--radix-popover-trigger-width) p-0"
                                            align="start"
                                        >
                                            <Command>
                                                <CommandInput placeholder="Search staff..." />
                                                <CommandList>
                                                    {isStaffsLoading ? (
                                                        <div className="p-4 text-center text-sm text-muted-foreground italic">
                                                            Loading staff
                                                            members...
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <CommandEmpty>
                                                                No staff found.
                                                            </CommandEmpty>
                                                            <CommandGroup>
                                                                <CommandItem
                                                                    className="flex items-center gap-2"
                                                                    onSelect={() => {
                                                                        const allIds =
                                                                            staffsData?.staffs?.map(
                                                                                (
                                                                                    s: IStaff,
                                                                                ) =>
                                                                                    s._id,
                                                                            ) ||
                                                                            [];
                                                                        if (
                                                                            field
                                                                                .value
                                                                                .length ===
                                                                            allIds.length
                                                                        ) {
                                                                            field.onChange(
                                                                                [],
                                                                            );
                                                                        } else {
                                                                            field.onChange(
                                                                                allIds,
                                                                            );
                                                                        }
                                                                    }}
                                                                >
                                                                    <Checkbox
                                                                        checked={
                                                                            field
                                                                                .value
                                                                                .length ===
                                                                                (staffsData
                                                                                    ?.staffs
                                                                                    ?.length ||
                                                                                    0) &&
                                                                            field
                                                                                .value
                                                                                .length >
                                                                                0
                                                                        }
                                                                        className="mr-2"
                                                                    />
                                                                    <span className="font-semibold">
                                                                        Select
                                                                        All
                                                                    </span>
                                                                </CommandItem>
                                                                {staffsData?.staffs?.map(
                                                                    (
                                                                        staff: IStaff,
                                                                    ) => (
                                                                        <CommandItem
                                                                            key={
                                                                                staff._id
                                                                            }
                                                                            onSelect={() => {
                                                                                const isSelected =
                                                                                    field.value.includes(
                                                                                        staff._id,
                                                                                    );
                                                                                if (
                                                                                    isSelected
                                                                                ) {
                                                                                    field.onChange(
                                                                                        field.value.filter(
                                                                                            (
                                                                                                id,
                                                                                            ) =>
                                                                                                id !==
                                                                                                staff._id,
                                                                                        ),
                                                                                    );
                                                                                } else {
                                                                                    field.onChange(
                                                                                        [
                                                                                            ...field.value,
                                                                                            staff._id,
                                                                                        ],
                                                                                    );
                                                                                }
                                                                            }}
                                                                        >
                                                                            <Checkbox
                                                                                checked={field.value.includes(
                                                                                    staff._id,
                                                                                )}
                                                                                className="mr-2"
                                                                            />
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
                                                                                                "U",
                                                                                        )}
                                                                                    </AvatarFallback>
                                                                                </Avatar>
                                                                                <div className="flex flex-col">
                                                                                    <span className="text-sm">
                                                                                        {staff
                                                                                            .user
                                                                                            ?.name ||
                                                                                            "Unknown"}
                                                                                    </span>
                                                                                    <span className="text-xs text-muted-foreground">
                                                                                        {
                                                                                            staff.staffId
                                                                                        }{" "}
                                                                                        •{" "}
                                                                                        {
                                                                                            staff.designation
                                                                                        }
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        </CommandItem>
                                                                    ),
                                                                )}
                                                            </CommandGroup>
                                                        </>
                                                    )}
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            )}
                        />
                        {errors.staffIds && (
                            <p className="text-sm text-red-500">
                                {errors.staffIds.message}
                            </p>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label>Date</Label>
                        <Controller
                            control={control}
                            name="date"
                            render={({ field }) => (
                                <DatePicker
                                    value={field.value}
                                    onChange={(date) =>
                                        field.onChange(date as Date)
                                    }
                                />
                            )}
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
                                {...register("durationMinutes", {
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
                            {...register("reason")}
                        />
                        {errors.reason && (
                            <p className="text-sm text-red-500">
                                {errors.reason.message}
                            </p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
