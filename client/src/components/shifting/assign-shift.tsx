"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Role } from "@/constants/role";
import { useSession } from "@/lib/auth-client";
import { useGetAllShiftsQuery } from "@/redux/features/shift/shiftApi";
import { useGetStaffsQuery } from "@/redux/features/staff/staffApi";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus, IconX } from "@tabler/icons-react";
import { useState, useMemo, useCallback, useRef } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import z from "zod";
import { DatePicker } from "../shared/DatePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import IStaff from "@/types/staff.type";
import { IShift } from "@/types/shift.type";
import { toast } from "sonner";
import { useAssignShiftMutation } from "@/redux/features/shiftAssignment/shiftAssignmentApi";
import { useDebounce } from "@/hooks/use-debounce";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Loader2, Search, X } from "lucide-react";
import { Checkbox } from "../ui/checkbox";

const shiftAssignSchema = z.object({
  staffIds: z.array(z.string()).min(1, "At least one staff member is required"),
  shiftId: z.string().min(1, "Shift is required"),
  startDate: z
    .date()
    .refine(
      (date) => date >= new Date(new Date().setHours(0, 0, 0, 0)),
      "Start date must be today or later",
    ),
});

type FormData = z.infer<typeof shiftAssignSchema>;

export default function AssignShift() {
  const { data: session, isPending, isRefetching } = useSession();

  const [open, setOpen] = useState(false);
  const [staffSelectOpen, setStaffSelectOpen] = useState(false);
  const [staffSearchTerm, setStaffSearchTerm] = useState("");
  const debouncedSearch = useDebounce(staffSearchTerm, 300);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    data: staffsData,
    isLoading: isStaffsLoading,
    isFetching: isStaffsFetching,
  } = useGetStaffsQuery(
    { limit: 1000, status: "active" },
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
      shiftId: "",
      startDate: new Date(),
    },
  });

  const shiftId = useWatch({ control: form.control, name: "shiftId" });
  const startDate = useWatch({ control: form.control, name: "startDate" });
  const watchStaffIds =
    useWatch({ control: form.control, name: "staffIds" }) || [];

  const isLoading =
    isPending ||
    isRefetching ||
    isStaffsLoading ||
    isStaffsFetching ||
    isShiftsLoading ||
    isShiftsFetching;

  const canCreate = session && session.user.role !== Role.STAFF;

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

  const getStaffById = useCallback(
    (id: string): IStaff | undefined => {
      return staffsData?.staffs?.find((s: IStaff) => s._id === id);
    },
    [staffsData?.staffs],
  );

  const onSubmit = async (data: FormData) => {
    try {
      const result = await assignShift({
        staffIds: data.staffIds,
        shiftId: data.shiftId,
        startDate: data.startDate.toISOString(),
      }).unwrap();

      if (result.success) {
        toast.success(result.message);
        form.reset();
        setOpen(false);
      } else {
        toast.error(result.message || "Failed to assign shift");
      }
    } catch (error) {
      toast.error((error as Error).message || "Failed to assign shift");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setStaffSearchTerm("");
          form.reset();
        }
        setOpen(isOpen);
      }}
    >
      <DialogTrigger asChild>
        <Button disabled={isLoading || !canCreate}>
          <IconPlus className="h-4 w-4 mr-2" />
          Assign Shift
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl p-0 flex flex-col max-h-[90vh]">
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col min-h-0 flex-1"
        >
          {/* Fixed header */}
          <div className="px-6 pt-6 pb-4 shrink-0">
            <DialogHeader>
              <DialogTitle>Assign Shift to Staff</DialogTitle>
              <DialogDescription>
                Select one or more staff members and assign them to a shift.
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Scrollable body — key fix: overflow-y-auto + min-h-0 */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6">
            <div className="grid gap-6 pb-4">
              {/* Shift Selection */}
              <div className="grid gap-3">
                <Label className="font-semibold">Shift Selection *</Label>
                <Select
                  value={shiftId}
                  onValueChange={(v) => form.setValue("shiftId", v)}
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
                          className="font-medium"
                        >
                          {shift.name} ({shift.startTime} - {shift.endTime})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.shiftId && (
                  <p className="text-sm text-destructive font-medium">
                    {form.formState.errors.shiftId.message}
                  </p>
                )}
              </div>

              {/* Staff Members */}
              <div className="grid gap-3">
                <Label className="font-semibold">Staff Members *</Label>

                <Controller
                  name="staffIds"
                  control={form.control}
                  render={({ field }) => {
                    const allStaffIds: string[] =
                      staffsData?.staffs?.map((s: IStaff) => s._id) || [];
                    const isAllSelected =
                      allStaffIds.length > 0 &&
                      field.value.length === allStaffIds.length;

                    const toggleStaff = (staffId: string) => {
                      const isSelected = field.value.includes(staffId);
                      field.onChange(
                        isSelected
                          ? field.value.filter((id: string) => id !== staffId)
                          : [...field.value, staffId],
                      );
                    };

                    const toggleAll = () => {
                      field.onChange(isAllSelected ? [] : allStaffIds);
                    };

                    const removeStaff = (staffId: string) => {
                      field.onChange(
                        field.value.filter((id: string) => id !== staffId),
                      );
                    };

                    return (
                      <div className="space-y-3">
                        <Popover
                          open={staffSelectOpen}
                          onOpenChange={(isOpen) => {
                            setStaffSelectOpen(isOpen);
                            if (!isOpen) setStaffSearchTerm("");
                          }}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={staffSelectOpen}
                              className="w-full justify-between h-10 text-left font-normal border-muted-foreground/30"
                            >
                              <span
                                className={cn(
                                  "truncate",
                                  field.value.length === 0 &&
                                    "text-muted-foreground",
                                )}
                              >
                                {field.value.length === 0
                                  ? "Select staff members..."
                                  : `${field.value.length} staff selected`}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>

                          <PopoverContent
                            className="p-0 border-none shadow-xl"
                            align="start"
                            style={{
                              width: "var(--radix-popover-trigger-width)",
                            }}
                          >
                            <div className="flex items-center gap-2 border-b px-3 py-2 bg-muted/30">
                              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <input
                                ref={searchInputRef}
                                type="text"
                                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground py-1"
                                placeholder="Search name, ID, or designation..."
                                value={staffSearchTerm}
                                onChange={(e) =>
                                  setStaffSearchTerm(e.target.value)
                                }
                              />
                              {staffSearchTerm && (
                                <button
                                  type="button"
                                  onClick={() => setStaffSearchTerm("")}
                                  className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>

                            <ScrollArea className="h-72 w-full p-1 bg-background border-t">
                              {isStaffsLoading ? (
                                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Loading staff...
                                </div>
                              ) : filteredStaffs.length === 0 ? (
                                <div className="py-8 text-center text-sm text-muted-foreground">
                                  {debouncedSearch
                                    ? `No results for "${debouncedSearch}"`
                                    : "No staff available"}
                                </div>
                              ) : (
                                <>
                                  {!debouncedSearch && (
                                    <div
                                      role="button"
                                      tabIndex={0}
                                      onClick={toggleAll}
                                      onKeyDown={(e) => {
                                        if (
                                          e.key === "Enter" ||
                                          e.key === " "
                                        ) {
                                          e.preventDefault();
                                          toggleAll();
                                        }
                                      }}
                                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent transition-all mb-1 cursor-pointer"
                                    >
                                      <Checkbox
                                        checked={isAllSelected}
                                        className="rounded-sm pointer-events-none"
                                      />
                                      <span className="font-semibold">
                                        Select All
                                      </span>
                                      <span className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded-full font-bold">
                                        {allStaffIds.length}
                                      </span>
                                    </div>
                                  )}

                                  {filteredStaffs.map((staff) => {
                                    const isSelected = field.value.includes(
                                      staff._id,
                                    );
                                    return (
                                      <div
                                        key={staff._id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => toggleStaff(staff._id)}
                                        onKeyDown={(e) => {
                                          if (
                                            e.key === "Enter" ||
                                            e.key === " "
                                          ) {
                                            e.preventDefault();
                                            toggleStaff(staff._id);
                                          }
                                        }}
                                        className={cn(
                                          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-all mb-0.5 cursor-pointer",
                                          isSelected
                                            ? "bg-primary/5 text-primary!"
                                            : "hover:bg-accent",
                                        )}
                                      >
                                        <Checkbox
                                          checked={isSelected}
                                          className="rounded-sm pointer-events-none"
                                        />
                                        <Avatar className="h-8 w-8 border border-muted">
                                          <AvatarImage
                                            src={staff.user?.image as string}
                                          />
                                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                                            {getInitials(
                                              staff.user?.name || "U",
                                            )}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col items-start min-w-0 overflow-hidden">
                                          <span className="truncate font-medium leading-none mb-1">
                                            {staff.user?.name}
                                          </span>
                                          <span className="truncate text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                                            {staff.staffId} •{" "}
                                            {staff.designation}
                                          </span>
                                        </div>
                                        {isSelected && (
                                          <Check className="ml-auto h-4 w-4 text-primary shrink-0" />
                                        )}
                                      </div>
                                    );
                                  })}
                                </>
                              )}
                            </ScrollArea>
                          </PopoverContent>
                        </Popover>

                        {field.value.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {field.value.map((id: string) => {
                              const staff = getStaffById(id);
                              return (
                                <Badge
                                  key={id}
                                  variant="secondary"
                                  className="pl-1 pr-1 py-0.5 gap-1.5 items-center bg-muted/50 border-muted hover:bg-muted"
                                >
                                  <Avatar className="h-5 w-5 border border-muted">
                                    <AvatarImage
                                      src={staff?.user?.image as string}
                                    />
                                    <AvatarFallback className="text-[8px] font-bold">
                                      {getInitials(staff?.user?.name || "U")}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-[11px] font-medium truncate max-w-[120px]">
                                    {staff?.user?.name}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeStaff(id)}
                                    className="rounded-full p-0.5 hover:bg-destructive hover:text-white transition-all"
                                  >
                                    <IconX size={12} />
                                  </button>
                                </Badge>
                              );
                            })}
                            {field.value.length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[10px] text-muted-foreground hover:text-destructive font-bold uppercase tracking-wider"
                                onClick={() => field.onChange([])}
                              >
                                Clear All
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }}
                />

                {form.formState.errors.staffIds && (
                  <p className="text-sm text-destructive font-medium">
                    {form.formState.errors.staffIds.message}
                  </p>
                )}
              </div>

              {/* Assignment Period */}
              <div className="grid gap-3">
                <Label className="font-semibold">Assignment Period *</Label>
                <DatePicker
                  value={startDate}
                  onChange={(d) => d && form.setValue("startDate", d)}
                />
                <p className="text-[11px] text-muted-foreground font-medium">
                  The shift assignment will be effective from the selected date.
                </p>
              </div>
            </div>
          </div>

          {/* Fixed footer */}
          <div className="px-6 py-4 border-t bg-muted/10 shrink-0">
            <DialogFooter className="gap-2 sm:gap-0">
              <DialogClose asChild>
                <Button variant="ghost" className="font-semibold">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isAssigning || watchStaffIds.length === 0}
                className="font-bold min-w-[140px]"
              >
                {isAssigning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  `Assign to ${watchStaffIds.length} Member${watchStaffIds.length !== 1 ? "s" : ""}`
                )}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
