import { useState, useMemo } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Banknote, Loader2, RefreshCcw } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import {
    useProcessPaymentMutation,
    useUndoPaymentMutation,
    useBulkProcessPaymentMutation,
} from "@/redux/features/payroll/payrollApi";
import { toast } from "sonner";
import { IPayrollItem } from "@/types/payroll.type";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

interface OvertimeTableProps {
    data: IPayrollItem[];
    month: string;
    isLocked?: boolean;
}

interface ApiError {
    data?: {
        message?: string;
    };
}

export default function OvertimeTable({
    data,
    month,
    isLocked = false,
}: OvertimeTableProps) {
    const [processPayment, { isLoading: isProcessing }] =
        useProcessPaymentMutation();
    const [undoPayment, { isLoading: isUndoing }] = useUndoPaymentMutation();
    const [bulkProcessPayment, { isLoading: isBulkProcessing }] =
        useBulkProcessPaymentMutation();

    const [processingId, setProcessingId] = useState<string | null>(null);
    const { data: session } = useSession();

    const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
    const [isReviewOpen, setIsReviewOpen] = useState(false);

    const filteredData = useMemo(() => {
        return data.filter((item) => item.otMinutes > 1);
    }, [data]);

    const pendingStaff = useMemo(() => {
        return filteredData.filter(
            (item) => item.otStatus !== "paid" && item.otPayable > 0,
        );
    }, [filteredData]);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedStaffIds(pendingStaff.map((s) => s._id));
        } else {
            setSelectedStaffIds([]);
        }
    };

    const handleSelectOne = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedStaffIds((prev) => [...prev, id]);
        } else {
            setSelectedStaffIds((prev) => prev.filter((sid) => sid !== id));
        }
    };

    const handleBulkPay = async () => {
        if (!session?.user?.id) {
            toast.error("You must be logged in to process payments.");
            return;
        }

        const payments = pendingStaff
            .filter((s) => selectedStaffIds.includes(s._id))
            .map((s) => ({
                staffId: s._id,
                amount: s.otPayable, // OT Amount
                note: `Overtime Payment for ${month}`,
            }));

        try {
            await bulkProcessPayment({
                month,
                payments,
                paymentMethod: "cash",
                createdBy: session.user.id,
                paymentType: "overtime",
            }).unwrap();
            toast.success(
                `Successfully processed ${payments.length} overtime payments.`,
            );
            setIsReviewOpen(false);
            setSelectedStaffIds([]);
        } catch (error) {
            const err = error as ApiError;
            toast.error(
                err?.data?.message || "Failed to process bulk payments",
            );
        }
    };

    const selectedTotalAmount = useMemo(() => {
        return pendingStaff
            .filter((s) => selectedStaffIds.includes(s._id))
            .reduce((sum, s) => sum + s.otPayable, 0);
    }, [pendingStaff, selectedStaffIds]);

    const handlePayOvertime = async (staff: IPayrollItem) => {
        if (staff.otPayable <= 0) {
            toast.error("No overtime payable for this staff.");
            return;
        }

        if (!session?.user?.id) {
            toast.error("You must be logged in to process payments.");
            return;
        }

        setProcessingId(staff._id);
        try {
            await processPayment({
                staffId: staff._id,
                month,
                amount: staff.otPayable,
                paymentMethod: "cash",
                paymentType: "overtime",
                branchId: staff.branchId, // Crucial for optimistic update key matching
                note: `Overtime Payment for ${month}`,
                createdBy: session.user.id,
            }).unwrap();
            toast.success(`Overtime paid for ${staff.name}`);
        } catch (error) {
            const err = error as ApiError;
            toast.error(
                err?.data?.message || "Failed to process overtime payment",
            );
        } finally {
            setProcessingId(null);
        }
    };

    const handleUndoOvertime = async (staff: IPayrollItem) => {
        setProcessingId(staff._id);
        try {
            await undoPayment({
                staffId: staff._id,
                month,
                paymentType: "overtime",
                branchId: staff.branchId, // Crucial for optimistic update key matching
            }).unwrap();
            toast.success("Overtime payment undone successfully");
        } catch (error) {
            const err = error as ApiError;
            toast.error(
                err?.data?.message || "Failed to undo overtime payment",
            );
        } finally {
            setProcessingId(null);
        }
    };

    const formatDuration = (minutes: number) => {
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hrs}h ${mins}m`;
    };

    return (
        <div className="space-y-4">
            {selectedStaffIds.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex items-center justify-between animate-in fade-in duration-300">
                    <div className="text-sm font-semibold text-indigo-900">
                        {selectedStaffIds.length} staff selected for OT
                    </div>

                    <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
                        <DialogTrigger asChild>
                            <Button
                                size="sm"
                                className="bg-indigo-600 hover:bg-indigo-700"
                                disabled={
                                    selectedStaffIds.length === 0 ||
                                    isBulkProcessing ||
                                    isLocked
                                }
                            >
                                Review & Pay
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-xl">
                            <DialogHeader>
                                <DialogTitle>Review Overtime Payments</DialogTitle>
                                <DialogDescription>
                                    Verify the selected overtime disbursements.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="max-h-[300px] overflow-y-auto border rounded-lg">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead className="py-3 font-semibold">Staff</TableHead>
                                            <TableHead className="text-right py-3 font-semibold">Hours</TableHead>
                                            <TableHead className="text-right py-3 font-semibold">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pendingStaff
                                            .filter((s) =>
                                                selectedStaffIds.includes(s._id),
                                            )
                                            .map((s) => (
                                                <TableRow key={s._id}>
                                                    <TableCell className="font-medium">{s.name}</TableCell>
                                                    <TableCell className="text-right font-mono text-xs">
                                                        {formatDuration(
                                                            s.otMinutes,
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold">
                                                        ৳{s.otPayable.toLocaleString()}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="flex justify-between items-center py-4 border-t">
                                <span className="text-sm font-semibold opacity-60">Grand Total</span>
                                <div className="text-xl font-bold">
                                    ৳{selectedTotalAmount.toLocaleString()}
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setIsReviewOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                    onClick={handleBulkPay}
                                    disabled={isBulkProcessing}
                                >
                                    {isBulkProcessing && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    Confirm Payment
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            )}

            <div className="border rounded-md overflow-hidden bg-background">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow className="hover:bg-transparent border-b border-border/40">
                            <TableHead className="w-[50px] py-5">
                                <Checkbox
                                    checked={
                                        pendingStaff.length > 0 &&
                                        selectedStaffIds.length ===
                                        pendingStaff.length
                                    }
                                    onCheckedChange={(checked) =>
                                        handleSelectAll(checked as boolean)
                                    }
                                    disabled={pendingStaff.length === 0}
                                    className="rounded-md border-muted-foreground/30 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                                />
                            </TableHead>
                            <TableHead className="py-4 font-semibold">Staff Info</TableHead>
                            <TableHead className="text-center py-4 font-semibold">
                                Total OT Time
                            </TableHead>
                            <TableHead className="text-right py-4 font-semibold">
                                Payable Amount
                            </TableHead>
                            <TableHead className="text-center py-4 font-semibold">
                                Status
                            </TableHead>
                            <TableHead className="text-center py-4 font-semibold">
                                Action
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={6}
                                    className="h-24 text-center"
                                >
                                    No overtime data found for this month.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredData.map((row) => {
                                const isPaid = row.otStatus === "paid";
                                const isRowProcessing =
                                    processingId === row._id;
                                const isSelected = selectedStaffIds.includes(
                                    row._id,
                                );
                                const isPayable = !isPaid && row.otPayable > 0;

                                return (
                                    <TableRow key={row._id}>
                                        <TableCell>
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={(checked) =>
                                                    handleSelectOne(
                                                        row._id,
                                                        checked as boolean,
                                                    )
                                                }
                                                disabled={
                                                    !isPayable || isLocked
                                                }
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{row.name}</span>
                                                <span className="text-xs text-muted-foreground mt-0.5">
                                                  Shift: {row.calendar?.find(c => c.shiftStart && c.shiftEnd) 
                                                           ? `${row.calendar.find(c => c.shiftStart && c.shiftEnd)!.shiftStart} - ${row.calendar.find(c => c.shiftStart && c.shiftEnd)!.shiftEnd}`
                                                           : "No Shift Assigned"}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-mono">
                                            {formatDuration(row.otMinutes)}
                                        </TableCell>
                                        <TableCell className="text-right font-bold font-mono">
                                            {isPaid
                                                ? row.otPaidAmount
                                                : row.otPayable}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {isPaid ? (
                                                <Badge
                                                    variant="outline"
                                                    className="border-green-200 bg-green-50 text-green-700"
                                                >
                                                    Paid
                                                </Badge>
                                            ) : (
                                                <Badge
                                                    variant="outline"
                                                    className="text-muted-foreground"
                                                >
                                                    Pending
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center gap-2">
                                                <TooltipProvider delayDuration={200}>
                                                    {isPaid ? (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                                                                    onClick={() => handleUndoOvertime(row)}
                                                                    disabled={isRowProcessing || isUndoing || isLocked}
                                                                >
                                                                    {isRowProcessing ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                    ) : (
                                                                        <RefreshCcw className="h-4 w-4" />
                                                                    )}
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Undo Payment</TooltipContent>
                                                        </Tooltip>
                                                    ) : (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 p-0 hover:bg-green-50 hover:text-green-600"
                                                                    onClick={() => handlePayOvertime(row)}
                                                                    disabled={
                                                                        isRowProcessing ||
                                                                        isProcessing ||
                                                                        row.otPayable <= 0 ||
                                                                        isLocked
                                                                    }
                                                                >
                                                                    {isRowProcessing ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                                                                    ) : (
                                                                        <Banknote className="h-4 w-4 text-green-600" />
                                                                    )}
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Proceed to Pay OT</TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                </TooltipProvider>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
