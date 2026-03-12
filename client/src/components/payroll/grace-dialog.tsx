"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import {
    useGetAbsentDatesQuery,
    useGraceAttendanceMutation,
} from "@/redux/features/payroll/payrollApi";
import { format } from "date-fns";
import { toast } from "sonner";

interface GraceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    staffId: string;
    staffName: string;
    month: string;
}

export default function GraceDialog({
    open,
    onOpenChange,
    staffId,
    staffName,
    month,
}: GraceDialogProps) {
    const [selectedDates, setSelectedDates] = useState<string[]>([]);
    const [note, setNote] = useState("");

    const { data: absentData, isLoading: isLoadingDates } =
        useGetAbsentDatesQuery({ staffId, month }, { skip: !open || !staffId });

    const [graceAttendance, { isLoading: isGracing }] =
        useGraceAttendanceMutation();

    const absentDates = absentData?.data || [];

    const toggleDate = (date: string) => {
        setSelectedDates((prev) =>
            prev.includes(date)
                ? prev.filter((d) => d !== date)
                : [...prev, date],
        );
    };

    const handleGrace = async () => {
        if (selectedDates.length === 0) return;

        try {
            await graceAttendance({
                staffId,
                dates: selectedDates,
                note: note || "Admin Graced via Payroll",
            }).unwrap();

            toast.success("Attendance Corrected", {
                description: `(${selectedDates.length}) absent day(s) have been marked as present.`,
            });
            onOpenChange(false);
            setSelectedDates([]);
            setNote("");
        } catch (error) {
            toast.error("Error", {
                description:
                    (error as Error).message || "Failed to process grace.",
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Grace Absence - {staffName}</DialogTitle>
                    <DialogDescription>
                        Select one or more absent days to convert them to
                        &apos;Present&apos;.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {isLoadingDates ? (
                        <div className="flex justify-center p-4">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : absentDates.length === 0 ? (
                        <div className="text-center text-muted-foreground py-4">
                            No absent days found for this month.
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-2">
                            {absentDates.map(
                                (record: { date: string; status?: string }) => (
                                    <div
                                        key={record.date}
                                        onClick={() => toggleDate(record.date)}
                                        className={`
                                        cursor-pointer border rounded-md p-2 text-center text-sm transition-all
                                        ${
                                            selectedDates.includes(record.date)
                                                ? "bg-primary text-primary-foreground border-primary ring-2 ring-primary ring-offset-1"
                                                : "hover:bg-muted"
                                        }
                                    `}
                                    >
                                        <div className="font-semibold">
                                            {format(
                                                new Date(record.date),
                                                "dd MMM",
                                            )}
                                        </div>
                                        <div className="text-xs opacity-80">
                                            {format(
                                                new Date(record.date),
                                                "EEE",
                                            )}
                                        </div>
                                    </div>
                                ),
                            )}
                        </div>
                    )}

                    {selectedDates.length > 0 && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <label className="text-sm font-medium">
                                Correction Note (Optional)
                            </label>
                            <Textarea
                                placeholder="Reason for grace..."
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="resize-none"
                            />
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={isGracing}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleGrace}
                        disabled={selectedDates.length === 0 || isGracing}
                    >
                        {isGracing && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Apply Grace ({selectedDates.length})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
