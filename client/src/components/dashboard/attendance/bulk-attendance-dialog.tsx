"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBulkUpdateAttendanceStatusMutation } from "@/redux/features/attendance/attendanceApi";
import { useGetAllShiftsQuery } from "@/redux/features/shift/shiftApi";
import { AttendanceStatus } from "@/types/attendance.type";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon, Search } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { IShift } from "@/types/shift.type";

interface IStaffListItem {
  _id: string;
  staffId: string;
  designation: string;
  user?: {
    name: string;
  };
}

interface BulkAttendanceDialogProps {
  staffs: IStaffListItem[];
}

export function BulkAttendanceDialog({ staffs }: BulkAttendanceDialogProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [status, setStatus] = useState<AttendanceStatus>("present");
  const [notes, setNotes] = useState("");
  const [shiftId, setShiftId] = useState<string>("none");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);

  const [bulkUpdate, { isLoading }] = useBulkUpdateAttendanceStatusMutation();
  const { data: shiftsData } = useGetAllShiftsQuery({});
  const shifts = shiftsData?.shifts || [];

  const filteredStaffs = useMemo(() => {
    if (!searchQuery) return staffs;
    const lowerQ = searchQuery.toLowerCase();
    return staffs.filter((staff) => {
      return (
        (staff.user?.name || "").toLowerCase().includes(lowerQ) ||
        (staff.staffId || "").toLowerCase().includes(lowerQ) ||
        (staff.designation || "").toLowerCase().includes(lowerQ)
      );
    });
  }, [staffs, searchQuery]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set([
        ...selectedStaffIds,
        ...filteredStaffs.map((s) => s._id),
      ]);
      setSelectedStaffIds(Array.from(allIds));
    } else {
      const filteredIds = new Set(filteredStaffs.map((s) => s._id));
      setSelectedStaffIds(
        selectedStaffIds.filter((id) => !filteredIds.has(id)),
      );
    }
  };

  const handleToggleStaff = (staffId: string, checked: boolean) => {
    if (checked) {
      setSelectedStaffIds([...selectedStaffIds, staffId]);
    } else {
      setSelectedStaffIds(selectedStaffIds.filter((id) => id !== staffId));
    }
  };

  const handleSubmit = async () => {
    if (selectedStaffIds.length === 0) {
      toast.error("Please select at least one staff member.");
      return;
    }

    if (!date) {
      toast.error("Please select a date.");
      return;
    }

    try {
      await bulkUpdate({
        staffIds: selectedStaffIds,
        date,
        status,
        notes,
        shiftId: shiftId === "none" ? undefined : shiftId,
      }).unwrap();

      toast.success(
        `Successfully updated attendance for ${selectedStaffIds.length} staff members.`,
      );
      setOpen(false);

      // Reset state
      setSelectedStaffIds([]);
      setStatus("present");
      setNotes("");
      setShiftId("none");
      setSearchQuery("");
      setDate(format(new Date(), "yyyy-MM-dd"));
    } catch (error) {
      console.error("Bulk update error:", error);
      toast.error(
        (error as Error).message ||
          "Failed to update attendance records. Check console.",
      );
    }
  };

  const isAllFilteredSelected =
    filteredStaffs.length > 0 &&
    filteredStaffs.every((s) => selectedStaffIds.includes(s._id));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="font-medium">
          Bulk Actions
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-dvh overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Update Attendance</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4 pr-2">
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? (
                    format(new Date(date), "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date ? new Date(date) : undefined}
                  onSelect={(d) => setDate(d ? format(d, "yyyy-MM-dd") : "")}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Shift (Optional)</Label>
            <Select value={shiftId} onValueChange={setShiftId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Auto-detect from schedule" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Auto-detect from schedule</SelectItem>
                {shifts.map((shift: IShift) => (
                  <SelectItem key={shift._id} value={shift._id}>
                    {shift.name} ({shift.startTime} - {shift.endTime})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select a specific shift, or leave it to detect automatically based
              on their assigned schedule.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Attendance Status</Label>
            <Select
              value={status}
              onValueChange={(val) => setStatus(val as AttendanceStatus)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
                <SelectItem value="half_day">Half Day</SelectItem>
                <SelectItem value="holiday">Holiday</SelectItem>
                <SelectItem value="weekend">Weekend</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <Label>Staff Selection</Label>
              <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {selectedStaffIds.length} selected
              </span>
            </div>

            <div className="border rounded-md overflow-hidden flex flex-col focus-within:ring-1 focus-within:ring-ring transition-shadow">
              <div className="flex items-center px-3 border-b bg-background">
                <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                <Input
                  placeholder="Search staff by name or ID..."
                  className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-10 bg-transparent shadow-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="border-b bg-muted/40 px-3 py-2 flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={isAllFilteredSelected}
                  onCheckedChange={handleSelectAll}
                />
                <Label
                  htmlFor="select-all"
                  className="text-xs tracking-wide font-medium uppercase cursor-pointer w-full text-muted-foreground"
                >
                  {searchQuery ? "Select all matching" : "Select all staff"}
                </Label>
              </div>

              <ScrollArea className="h-[200px] bg-background">
                <div className="p-1 space-y-0.5">
                  {filteredStaffs.map((staff) => (
                    <Label
                      key={staff._id}
                      htmlFor={`staff-${staff._id}`}
                      className="flex items-center space-x-3 rounded-md px-2.5 py-2 hover:bg-muted cursor-pointer transition-colors"
                    >
                      <Checkbox
                        id={`staff-${staff._id}`}
                        checked={selectedStaffIds.includes(staff._id)}
                        onCheckedChange={(checked) =>
                          handleToggleStaff(staff._id, checked as boolean)
                        }
                      />
                      <div className="flex flex-col gap-1 leading-none">
                        <span className="text-sm font-medium">
                          {staff.user?.name || staff.staffId}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {staff.designation}
                        </span>
                      </div>
                    </Label>
                  ))}
                  {filteredStaffs.length === 0 && (
                    <div className="flex flex-col items-center justify-center text-sm text-muted-foreground h-32">
                      No staff found matching query.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              placeholder="Reason for manual update (e.g. Hosting Downtime)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || selectedStaffIds.length === 0}
          >
            {isLoading ? "Updating..." : "Update Selected"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
