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
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { IOvertime } from "@/types/overtime.type";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/shared/DatePicker";
import { TimePicker } from "@/components/shared/TimePicker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import IStaff from "@/types/staff.type";
import { IBranch } from "@/types/branch.type";
import { useSession } from "@/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, Loader2, Search, Users, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
    data?: IOvertime | null;
}

// ─── Debounce hook ───────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
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

    // Current user
    const { data: session } = useSession();
    const { data: meData } = useGetMeQuery({});
    const currentUser = meData?.staff;

    const userRole = session?.user?.role || currentUser?.user?.role;
    const canChangeBranch = userRole === "admin" || userRole === "super_admin";
    const isBranchManagementRole =
        canChangeBranch ||
        userRole === "branch_admin" ||
        userRole === "hr_manager" ||
        userRole === "team_leader";

    // Branch selection state
    const [selectedBranchId, setSelectedBranchId] = useState<string>("");

    if (currentUser?.branchId && !selectedBranchId) {
        setSelectedBranchId(currentUser.branchId);
    }

    const { data: branchesData } = useGetAllBranchesQuery(undefined, {
        skip: !canChangeBranch,
    });

    // Staff query
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

    // Staff search with debounce
    const [staffSearchTerm, setStaffSearchTerm] = useState("");
    const debouncedSearch = useDebounce(staffSearchTerm, 300);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const filteredStaffs = useMemo(() => {
        const allStaffs: IStaff[] = staffsData?.staffs || [];
        if (!debouncedSearch.trim()) return allStaffs;

        const query = debouncedSearch.toLowerCase();
        return allStaffs.filter((staff) => {
            const name = staff.user?.name?.toLowerCase() || "";
            const sid = staff.staffId?.toLowerCase() || "";
            const designation = staff.designation?.toLowerCase() || "";
            const email = staff.user?.email?.toLowerCase() || "";
            return (
                name.includes(query) ||
                sid.includes(query) ||
                designation.includes(query) ||
                email.includes(query)
            );
        });
    }, [staffsData?.staffs, debouncedSearch]);

    // Staff select popover
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
                startTime: new Date(data.startTime).toTimeString().slice(0, 5),
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
                await updateOvertime({
                    id: data._id,
                    staffId: values.staffIds[0],
                    ...commonPayload,
                }).unwrap();
                toast.success("Overtime updated successfully");
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

    const getInitials = useCallback((name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
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

    return (
        <Dialog
            open={open}
            onOpenChange={(isOpen) => {
                if (!isOpen) setStaffSearchTerm("");
                onOpenChange(isOpen);
            }}
        >
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        {data ? "Edit Overtime" : "Add Overtime"}
                    </DialogTitle>
                    <DialogDescription>
                        {data
                            ? "Update the overtime details below."
                            : "Assign overtime to one or more staff members."}
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="space-y-5 pt-1"
                >
                    {/* ── Branch Selection ── */}
                    {canChangeBranch && (
                        <div className="space-y-2">
                            <Label htmlFor="branch">Branch</Label>
                            <Select
                                value={selectedBranchId}
                                onValueChange={setSelectedBranchId}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select branch" />
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

                    {/* ── Staff Multi-Select ── */}
                    <div className="space-y-2">
                        <Label>Staff Members</Label>
                        <Controller
                            name="staffIds"
                            control={control}
                            render={({ field }) => {
                                const allStaffIds: string[] =
                                    staffsData?.staffs?.map(
                                        (s: IStaff) => s._id,
                                    ) || [];
                                const isAllSelected =
                                    allStaffIds.length > 0 &&
                                    field.value.length === allStaffIds.length;

                                const toggleStaff = (staffId: string) => {
                                    const isSelected =
                                        field.value.includes(staffId);
                                    if (isSelected) {
                                        field.onChange(
                                            field.value.filter(
                                                (id) => id !== staffId,
                                            ),
                                        );
                                    } else {
                                        field.onChange([
                                            ...field.value,
                                            staffId,
                                        ]);
                                    }
                                };

                                const toggleAll = () => {
                                    if (isAllSelected) {
                                        field.onChange([]);
                                    } else {
                                        field.onChange(allStaffIds);
                                    }
                                };

                                const removeStaff = (
                                    e: React.MouseEvent,
                                    staffId: string,
                                ) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    field.onChange(
                                        field.value.filter(
                                            (id) => id !== staffId,
                                        ),
                                    );
                                };

                                const clearAll = (e: React.MouseEvent) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    field.onChange([]);
                                };

                                return (
                                    <div className="space-y-2">
                                        {/* Trigger */}
                                        <Popover
                                            open={staffSelectOpen}
                                            onOpenChange={(isOpen) => {
                                                setStaffSelectOpen(isOpen);
                                                if (!isOpen) {
                                                    setStaffSearchTerm("");
                                                }
                                            }}
                                        >
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={
                                                        staffSelectOpen
                                                    }
                                                    className="w-full justify-between h-10 text-left font-normal"
                                                    disabled={!!data}
                                                >
                                                    <span
                                                        className={cn(
                                                            "truncate",
                                                            field.value
                                                                .length === 0 &&
                                                                "text-muted-foreground",
                                                        )}
                                                    >
                                                        {field.value.length ===
                                                        0
                                                            ? "Select staff members..."
                                                            : `${field.value.length} staff selected`}
                                                    </span>
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>

                                            <PopoverContent
                                                className="p-0"
                                                align="start"
                                                style={{
                                                    width: "var(--radix-popover-trigger-width)",
                                                }}
                                            >
                                                {/* Search Input */}
                                                <div className="flex items-center gap-2 border-b px-3 py-2">
                                                    <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                    <input
                                                        ref={searchInputRef}
                                                        type="text"
                                                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                                                        placeholder="Search by name, ID, or designation..."
                                                        value={staffSearchTerm}
                                                        onChange={(e) =>
                                                            setStaffSearchTerm(
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                    {staffSearchTerm && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setStaffSearchTerm(
                                                                    "",
                                                                )
                                                            }
                                                            className="text-muted-foreground hover:text-foreground"
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Staff List */}
                                                <div className="max-h-[240px] overflow-y-auto p-1">
                                                    {isStaffsLoading ? (
                                                        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                            Loading staff...
                                                        </div>
                                                    ) : filteredStaffs.length ===
                                                      0 ? (
                                                        <div className="py-6 text-center text-sm text-muted-foreground">
                                                            {debouncedSearch
                                                                ? `No staff matching "${debouncedSearch}"`
                                                                : "No staff available"}
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {/* Select All */}
                                                            {!debouncedSearch && (
                                                                <button
                                                                    type="button"
                                                                    onClick={
                                                                        toggleAll
                                                                    }
                                                                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
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
                                                                        }{" "}
                                                                        staff
                                                                    </span>
                                                                </button>
                                                            )}

                                                            {/* Staff Items */}
                                                            {filteredStaffs.map(
                                                                (
                                                                    staff: IStaff,
                                                                ) => {
                                                                    const isSelected =
                                                                        field.value.includes(
                                                                            staff._id,
                                                                        );
                                                                    return (
                                                                        <button
                                                                            key={
                                                                                staff._id
                                                                            }
                                                                            type="button"
                                                                            onClick={() =>
                                                                                toggleStaff(
                                                                                    staff._id,
                                                                                )
                                                                            }
                                                                            className={cn(
                                                                                "flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm transition-colors",
                                                                                isSelected
                                                                                    ? "bg-accent/50"
                                                                                    : "hover:bg-accent hover:text-accent-foreground",
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
                                                                                <AvatarFallback className="text-[10px]">
                                                                                    {getInitials(
                                                                                        staff
                                                                                            .user
                                                                                            ?.name ||
                                                                                            "U",
                                                                                    )}
                                                                                </AvatarFallback>
                                                                            </Avatar>
                                                                            <div className="flex flex-col items-start min-w-0">
                                                                                <span className="truncate text-sm leading-tight">
                                                                                    {staff
                                                                                        .user
                                                                                        ?.name ||
                                                                                        "Unknown"}
                                                                                </span>
                                                                                <span className="truncate text-xs text-muted-foreground leading-tight">
                                                                                    {
                                                                                        staff.staffId
                                                                                    }{" "}
                                                                                    •{" "}
                                                                                    {
                                                                                        staff.designation
                                                                                    }
                                                                                </span>
                                                                            </div>
                                                                            {isSelected && (
                                                                                <Check className="ml-auto h-4 w-4 text-primary shrink-0" />
                                                                            )}
                                                                        </button>
                                                                    );
                                                                },
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </PopoverContent>
                                        </Popover>

                                        {/* Selected Badges */}
                                        {field.value.length > 0 && !data && (
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {field.value.map((id) => {
                                                    const staff =
                                                        getStaffById(id);
                                                    return (
                                                        <Badge
                                                            key={id}
                                                            variant="secondary"
                                                            className="gap-1 pr-1"
                                                        >
                                                            <span className="max-w-[120px] truncate">
                                                                {staff?.user
                                                                    ?.name ||
                                                                    "Selected"}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) =>
                                                                    removeStaff(
                                                                        e,
                                                                        id,
                                                                    )
                                                                }
                                                                className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        </Badge>
                                                    );
                                                })}
                                                {field.value.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={clearAll}
                                                        className="text-xs text-muted-foreground hover:text-destructive transition-colors px-1.5 py-0.5"
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
                            <p className="text-sm text-destructive">
                                {errors.staffIds.message}
                            </p>
                        )}
                    </div>

                    {/* ── Date & Type ── */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
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
                                <p className="text-sm text-destructive">
                                    {errors.date.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
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
                                <p className="text-sm text-destructive">
                                    {errors.type.message}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* ── Start Time & Duration ── */}
                    <div className="grid grid-cols-2 gap-4 items-end">
                        <div className="space-y-2">
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
                                <p className="text-sm text-destructive">
                                    {errors.startTime.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
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
                                <p className="text-sm text-destructive">
                                    {errors.durationMinutes.message}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* ── Reason ── */}
                    <div className="space-y-2">
                        <Label htmlFor="reason">
                            Reason{" "}
                            <span className="text-muted-foreground font-normal">
                                (optional)
                            </span>
                        </Label>
                        <Textarea
                            id="reason"
                            placeholder="Describe why the overtime is needed..."
                            rows={3}
                            {...register("reason")}
                        />
                        {errors.reason && (
                            <p className="text-sm text-destructive">
                                {errors.reason.message}
                            </p>
                        )}
                    </div>

                    {/* ── Footer ── */}
                    <DialogFooter className="gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {isLoading
                                ? "Saving..."
                                : data
                                  ? "Update Overtime"
                                  : "Assign Overtime"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
