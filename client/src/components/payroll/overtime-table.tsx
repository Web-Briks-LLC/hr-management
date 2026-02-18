import { useState } from "react";
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
import {
    useProcessPaymentMutation,
    useUndoPaymentMutation,
} from "@/redux/features/payroll/payrollApi";
import { toast } from "sonner";
import { IPayrollItem } from "@/types/payroll.type";

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
    const [processingId, setProcessingId] = useState<string | null>(null);

    const handlePayOvertime = async (staff: IPayrollItem) => {
        if (staff.otPayable <= 0) {
            toast.error("No overtime payable for this staff.");
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
                createdBy: "admin", // Ideally from auth context
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
        <div className="border rounded-md overflow-hidden">
            <Table>
                <TableHeader className="bg-muted/40">
                    <TableRow>
                        <TableHead>Staff Info</TableHead>
                        <TableHead className="text-center">
                            Total OT Time
                        </TableHead>
                        <TableHead className="text-right">
                            Payable Amount
                        </TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                No overtime data found for this month.
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((row) => {
                            const isPaid = row.otStatus === "paid";
                            const isLoading = processingId === row._id;

                            // Skip row if no OT and not paid (optional, but cleaner)
                            // But user might want to see who has 0 OT.
                            // Let's keep everyone but highlight those with OT.

                            return (
                                <TableRow key={row._id}>
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
                                                    {row.bankName || "N/A"} -{" "}
                                                    {row.branch || "N/A"}
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
                                                        handleUndoOvertime(row)
                                                    }
                                                    disabled={
                                                        isLoading || isUndoing
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
                                                        handlePayOvertime(row)
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
    );
}
