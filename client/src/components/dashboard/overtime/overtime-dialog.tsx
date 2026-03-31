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
import { useForm, Controller, useWatch } from "react-hook-form";
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
import { ScrollArea } from "@/components/ui/scroll-area";
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

    // Initialize branch selection from currentUser once
    const hasInitializedRef = useRef(false);
    useEffect(() => {
        if (!hasInitializedRef.current && currentUser?.branchId) {
            // Using requestAnimationFrame to break the cascading render chain
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

    const watchStaffIds = useWatch({ control, name: "staffIds" }) || [];

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
        <DialogContent className="sm:max-w-2xl p-0 flex flex-col max-h-[90vh] overflow-hidden">
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col h-full overflow-hidden"
            >
                <div className="p-6 pb-2">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            <Users className="h-5 w-5 text-primary" />
                            {data ? "Update Overtime" : "Assign Overtime"}
                        </DialogTitle>
                        <DialogDescription className="text-sm">
                            {data
                                ? "Update the overtime details for the selected staff member."
                                : "Assign overtime to one or more staff members."}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <ScrollArea className="flex-1 px-6 py-2 border-y bg-muted/5">
                    <div className="grid gap-6 py-4">
                        {/* ── Branch Selection (Admin only) ── */}
                        {canChangeBranch && !data && (
                            <div className="space-y-2">
                                <Label htmlFor="branch" className="text-sm font-semibold">Branch Selection</Label>
                                <Select
                                    onValueChange={(v) =>
                                        setSelectedBranchId(v)
                                    }
                                    defaultValue={selectedBranchId || "all"}
                                >
                                    <SelectTrigger className="w-full h-10 border-muted-foreground/20 bg-background hover:bg-muted/50 transition-colors">
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

                        {/* ── Staff Selection ── */}
                        <div className="space-y-3">
                            <Label className="text-sm font-semibold">Staff Members <span className="text-destructive">*</span></Label>
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
                                        if (isAllSelected) {
                                            field.onChange([]);
                                        } else {
                                            field.onChange(allStaffIds);
                                        }
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

                                    const clearAll = (e: React.MouseEvent) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        field.onChange([]);
                                    };

                                    return (
                                        <div className="space-y-3">
                                            <Popover
                                                open={staffSelectOpen}
                                                onOpenChange={setStaffSelectOpen}
                                            >
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        className="w-full justify-between h-10 border-muted-foreground/30 font-normal hover:bg-accent/5 transition-all text-left"
                                                        disabled={!!data}
                                                    >
                                                        <span className="truncate">
                                                            {field.value
                                                                .length === 0
                                                                ? "Select staff members..."
                                                                : `${field.value.length} staff selected`}
                                                        </span>
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>

                                                <PopoverContent
                                                    className="p-0 shadow-lg border-muted-foreground/20"
                                                    align="start"
                                                    style={{
                                                        width: "var(--radix-popover-trigger-width)",
                                                    }}
                                                >
                                                    {/* Search Input */}
                                                    <div className="flex items-center gap-2 border-b px-3 py-2.5 bg-muted/30">
                                                        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                        <input
                                                            ref={searchInputRef}
                                                            type="text"
                                                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                                                            placeholder="Search workers..."
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
                                                                className="text-muted-foreground hover:text-foreground p-0.5 rounded-full hover:bg-muted"
                                                            >
                                                                <X className="h-3.5 w-3.5" />
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Staff List */}
                                                    <ScrollArea className="h-72 w-full p-1 bg-background border-t">
                                                        {isStaffsLoading ? (
                                                            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                                                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                                                Searching for staff...
                                                            </div>
                                                        ) : filteredStaffs.length ===
                                                          0 ? (
                                                            <div className="py-8 text-center text-sm text-muted-foreground">
                                                                {debouncedSearch
                                                                    ? `No results for "${debouncedSearch}"`
                                                                    : "No staff found"}
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-0.5">
                                                                {/* Select All */}
                                                                {!debouncedSearch && (
                                                                    <div
                                                                        role="button"
                                                                        tabIndex={0}
                                                                        onClick={
                                                                            toggleAll
                                                                        }
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === "Enter" || e.key === " ") {
                                                                                e.preventDefault();
                                                                                toggleAll();
                                                                            }
                                                                        }}
                                                                        className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-accent/80 hover:text-accent-foreground transition-all cursor-pointer group"
                                                                    >
                                                                        <Checkbox
                                                                            checked={
                                                                                isAllSelected
                                                                            }
                                                                            className="pointer-events-none data-[state=checked]:bg-primary"
                                                                        />
                                                                        <span className="font-semibold group-hover:translate-x-0.5 transition-transform">
                                                                            Select All Global
                                                                        </span>
                                                                        <span className="ml-auto text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                                                                            {
                                                                                allStaffIds.length
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                )}

                                                                {/* Staff Items */}
                                                                {filteredStaffs.map(
                                                                    (
                                                                        staffList: IStaff,
                                                                    ) => {
                                                                        const isSelected =
                                                                            field.value.includes(
                                                                                staffList._id,
                                                                            );
                                                                        return (
                                                                            <div
                                                                                key={
                                                                                    staffList._id
                                                                                }
                                                                                role="button"
                                                                                tabIndex={0}
                                                                                onClick={() =>
                                                                                    toggleStaff(
                                                                                        staffList._id,
                                                                                    )
                                                                                }
                                                                                onKeyDown={(e) => {
                                                                                    if (
                                                                                        e.key === "Enter" ||
                                                                                        e.key === " "
                                                                                    ) {
                                                                                        e.preventDefault();
                                                                                        toggleStaff(staffList._id);
                                                                                    }
                                                                                }}
                                                                                className={cn(
                                                                                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-all cursor-pointer group",
                                                                                    isSelected
                                                                                        ? "bg-primary/5 hover:bg-primary/10"
                                                                                        : "hover:bg-accent/80 hover:text-accent-foreground",
                                                                                )}
                                                                            >
                                                                                <Checkbox
                                                                                    checked={
                                                                                        isSelected
                                                                                    }
                                                                                    className="pointer-events-none data-[state=checked]:bg-primary"
                                                                                />
                                                                                <Avatar className="h-8 w-8 border border-muted ring-offset-background group-hover:ring-2 ring-primary/20 transition-all">
                                                                                    <AvatarImage
                                                                                        src={
                                                                                            staffList
                                                                                                .user
                                                                                                ?.image as string
                                                                                        }
                                                                                    />
                                                                                    <AvatarFallback className="text-[10px] bg-muted/50">
                                                                                        {getInitials(
                                                                                            staffList
                                                                                                .user
                                                                                                ?.name ||
                                                                                                "U",
                                                                                        )}
                                                                                    </AvatarFallback>
                                                                                </Avatar>
                                                                                <div className="flex flex-col items-start min-w-0">
                                                                                    <span className="truncate text-sm font-semibold text-foreground/90 group-hover:text-primary transition-colors">
                                                                                        {staffList
                                                                                            .user
                                                                                            ?.name ||
                                                                                            "Unknown"}
                                                                                    </span>
                                                                                    <span className="truncate text-[10px] text-muted-foreground leading-tight uppercase font-bold tracking-tight">
                                                                                        ID: {
                                                                                            staffList.staffId
                                                                                        }{" "}
                                                                                        •{" "}
                                                                                        {
                                                                                            staffList.designation
                                                                                        }
                                                                                    </span>
                                                                                </div>
                                                                                {isSelected && (
                                                                                    <Check className="ml-auto h-4 w-4 text-primary shrink-0 animate-in zoom-in-50 duration-200" />
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
                                            {field.value.length > 0 && !data && (
                                                <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                                                    {field.value.map((id) => {
                                                        const staff =
                                                            getStaffById(id);
                                                        return (
                                                            <Badge
                                                                key={id}
                                                                variant="outline"
                                                                className="gap-1 pr-1 border-primary/20 bg-primary/5 text-primary-foreground hover:bg-primary/10 transition-colors shadow-sm animate-in fade-in slide-in-from-top-1 duration-200"
                                                            >
                                                                <span className="max-w-[120px] truncate text-[11px] font-medium text-primary">
                                                                    {staff?.user
                                                                        ?.name ||
                                                                        "Staff"}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) =>
                                                                        removeStaff(
                                                                            e,
                                                                            id,
                                                                        )
                                                                    }
                                                                    className="ml-0.5 rounded-full p-0.5 hover:bg-destructive hover:text-destructive-foreground transition-all group/btn"
                                                                >
                                                                    <X className="h-3 w-3 group-hover/btn:scale-110" />
                                                                </button>
                                                            </Badge>
                                                        );
                                                    })}
                                                    {field.value.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={clearAll}
                                                            className="text-[10px] uppercase font-extrabold text-muted-foreground hover:text-destructive transition-all px-2 py-1 rounded-md hover:bg-destructive/5 tracking-wider"
                                                        >
                                                            Dismiss All
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }}
                            />
                            {errors.staffIds && (
                                <p className="text-[11px] text-destructive bg-destructive/5 px-2 py-1 rounded text-center font-bold uppercase tracking-tighter">
                                    {errors.staffIds.message}
                                </p>
                            )}
                        </div>

                        {/* ── Date & Type ── */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Overtime Date</Label>
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
                                    <p className="text-xs text-destructive font-medium">
                                        {errors.date.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="type" className="text-sm font-semibold">Category Type</Label>
                                <Controller
                                    name="type"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            value={field.value}
                                        >
                                            <SelectTrigger className="w-full h-10 border-muted-foreground/20 bg-background hover:bg-muted/50 transition-colors">
                                                <SelectValue placeholder="Selection type" />
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
                                    <p className="text-xs text-destructive font-medium">
                                        {errors.type.message}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* ── Start Time & Duration ── */}
                        <div className="grid grid-cols-2 gap-6 items-end">
                            <div className="space-y-2">
                                <Label htmlFor="startTime" className="text-sm font-semibold">Start Execution</Label>
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
                                    <p className="text-xs text-destructive font-medium">
                                        {errors.startTime.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="durationMinutes" className="text-sm font-semibold">
                                    Duration <span className="text-muted-foreground font-normal">(mins)</span>
                                </Label>
                                <Input
                                    id="durationMinutes"
                                    type="number"
                                    className="h-10 border-muted-foreground/20 bg-background focus-visible:ring-primary/20"
                                    {...register("durationMinutes", {
                                        valueAsNumber: true,
                                    })}
                                />
                                {errors.durationMinutes && (
                                    <p className="text-xs text-destructive font-medium">
                                        {errors.durationMinutes.message}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* ── Reason ── */}
                        <div className="space-y-2">
                            <Label htmlFor="reason" className="text-sm font-semibold">
                                Internal Remarks{" "}
                                <span className="text-muted-foreground font-normal text-xs uppercase tracking-widest ml-1">
                                    (optional)
                                </span>
                            </Label>
                            <Textarea
                                id="reason"
                                placeholder="State the business requirement for this overtime..."
                                rows={3}
                                className="border-muted-foreground/20 bg-background focus-visible:ring-primary/20 resize-none min-h-[100px]"
                                {...register("reason")}
                            />
                            {errors.reason && (
                                <p className="text-xs text-destructive font-medium">
                                    {errors.reason.message}
                                </p>
                            )}
                        </div>
                    </div>
                </ScrollArea>

                <div className="p-6 pt-3 border-t bg-muted/10">
                    <DialogFooter className="gap-3 sm:gap-0 flex-row-reverse sm:flex-row justify-between">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                            className="text-muted-foreground hover:text-foreground font-semibold"
                        >
                            Abort Changes
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                isCreating ||
                                isUpdating ||
                                watchStaffIds.length === 0
                            }
                            className={cn(
                                "min-w-[180px] font-bold shadow-lg transition-all",
                                watchStaffIds.length > 0 ? "bg-primary hover:bg-primary/90" : ""
                            )}
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Syncing...</span>
                                </div>
                            ) : (
                                <span>
                                    {data
                                        ? "Update Records"
                                        : `Assign to ${watchStaffIds.length} Engineer${watchStaffIds.length !== 1 ? "s" : ""}`}
                                </span>
                            )}
                        </Button>
                    </DialogFooter>
                </div>
            </form>
        </DialogContent>
    </Dialog>
);
}
