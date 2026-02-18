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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Banknote, Loader2, User, RefreshCcw } from "lucide-react";
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
}

interface ApiError {
    data?: {
        message?: string;
    };
}

export default function OvertimeTable({ data, month }: OvertimeTableProps) {
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
            <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    {selectedStaffIds.length} selected
                </div>
                <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
                    <DialogTrigger asChild>
                        <Button
                            disabled={
                                selectedStaffIds.length === 0 ||
                                isBulkProcessing
                            }
                        >
                            Review & Pay
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Review Overtime Payments</DialogTitle>
                            <DialogDescription>
                                Review the selected staff and amounts before
                                processing payment.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="max-h-[300px] overflow-y-auto border rounded-md p-2">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Staff</TableHead>
                                        <TableHead className="text-right">
                                            Hours
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Amount
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingStaff
                                        .filter((s) =>
                                            selectedStaffIds.includes(s._id),
                                        )
                                        .map((s) => (
                                            <TableRow key={s._id}>
                                                <TableCell>{s.name}</TableCell>
                                                <TableCell className="text-right">
                                                    {formatDuration(
                                                        s.otMinutes,
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right font-bold">
                                                    {s.otPayable}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="flex justify-end items-center gap-4 py-4 border-t">
                            <div className="text-lg font-bold">
                                Total: {selectedTotalAmount}
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

            <div className="border rounded-md overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/40">
                        <TableRow>
                            <TableHead className="w-[50px]">
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
                                />
                            </TableHead>
                            <TableHead>Staff Info</TableHead>
                            <TableHead className="text-center">
                                Total OT Time
                            </TableHead>
                            <TableHead className="text-right">
                                Payable Amount
                            </TableHead>
                            <TableHead className="text-center">
                                Status
                            </TableHead>
                            <TableHead className="text-center">
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
                                const isLoading = processingId === row._id;
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
                                                disabled={!isPayable}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9 border">
                                                    <AvatarImage
                                                        src={row.image}
                                                        alt={row.name}
                                                    />
                                                    <AvatarFallback>
                                                        <User className="h-4 w-4" />
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-medium">
                                                        {row.name}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {row.bankName || "N/A"}{" "}
                                                        - {row.branch || "N/A"}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground font-mono bg-muted/60 px-1.5 py-0.5 rounded w-fit mt-1">
                                                        {row.bankAccountNo ||
                                                            "No Account"}
                                                    </div>
                                                </div>
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
                                                {isPaid ? (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                                                        onClick={() =>
                                                            handleUndoOvertime(
                                                                row,
                                                            )
                                                        }
                                                        disabled={
                                                            isLoading ||
                                                            isUndoing
                                                        }
                                                        title="Undo Payment"
                                                    >
                                                        {isLoading ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <RefreshCcw className="h-3.5 w-3.5" />
                                                        )}
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        className="h-8 px-3 text-xs gap-1.5 bg-green-600 hover:bg-green-700"
                                                        onClick={() =>
                                                            handlePayOvertime(
                                                                row,
                                                            )
                                                        }
                                                        disabled={
                                                            isLoading ||
                                                            isProcessing ||
                                                            row.otPayable <= 0
                                                        }
                                                    >
                                                        {isLoading ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <Banknote className="h-3.5 w-3.5" />
                                                        )}
                                                        Pay OT
                                                    </Button>
                                                )}
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
