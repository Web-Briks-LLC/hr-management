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
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Ban,
    Banknote,
    Loader2,
    User,
    CheckCheck,
    Pencil,
    RefreshCcw,
} from "lucide-react";
import GraceDialog from "./grace-dialog";
import EditSalaryDialog from "./edit-salary-dialog";
import BulkReviewDialog from "./bulk-review-dialog";
import {
    useBulkProcessPaymentMutation,
    useUndoPaymentMutation,
} from "@/redux/features/payroll/payrollApi";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { IPayrollItem } from "@/types/payroll.type";

interface PayrollTableProps {
    data: IPayrollItem[];
    month: string;
    isSelectMode: boolean;
}

type Adjustment = {
    baseAmount?: number;
    bonus: number;
    deduction: number;
    note: string;
};

export default function PayrollTable({
    data,
    month,
    isSelectMode,
}: PayrollTableProps) {
    const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);

    // Local state to store adjustments before payment
    const [adjustments, setAdjustments] = useState<Record<string, Adjustment>>(
        {},
    );

    // Dialog States
    const [graceParams, setGraceParams] = useState<{
        open: boolean;
        staffId: string;
        staffName: string;
    }>({ open: false, staffId: "", staffName: "" });

    const [editParams, setEditParams] = useState<{
        open: boolean;
        staffId: string;
        staffName: string;
        baseAmount: number;
        mode: "pay" | "edit";
    } | null>(null);

    const [bulkReviewOpen, setBulkReviewOpen] = useState(false);

    const [bulkPay, { isLoading: isBulkPaying }] =
        useBulkProcessPaymentMutation();
    const [undoPayment, { isLoading: isUndoing }] = useUndoPaymentMutation();

    // Selection Logic

    const isAllSelected =
        data.length > 0 && selectedStaffIds.length === data.length;

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedStaffIds([]);
        } else {
            // Only select staff who are NOT paid
            const unpaidIds = data
                .filter((d) => d.status !== "paid")
                .map((d) => d._id);
            setSelectedStaffIds(unpaidIds);
        }
    };

    const toggleSelect = (id: string) => {
        if (selectedStaffIds.includes(id)) {
            setSelectedStaffIds((prev) => prev.filter((i) => i !== id));
        } else {
            setSelectedStaffIds((prev) => [...prev, id]);
        }
    };

    const handleSaveAdjustment = (id: string, adj: Adjustment) => {
        setAdjustments((prev) => ({
            ...prev,
            [id]: adj,
        }));
    };

    const handleUndoPayment = async (staffId: string) => {
        try {
            await undoPayment({
                staffId,
                month,
            }).unwrap();
            toast.success("Payment undone successfully");
        } catch (error) {
            toast.error((error as Error)?.message || "Failed to undo payment");
        }
    };

    const getFinalAmount = useMemo(
        () => (staff: IPayrollItem) => {
            const adj = adjustments[staff._id] || { bonus: 0, deduction: 0 };
            const base =
                adj.baseAmount !== undefined
                    ? adj.baseAmount
                    : staff.payableSalary || 0;
            return base + adj.bonus - adj.deduction;
        },
        [adjustments],
    );

    // Bulk Pay Confirmation Handler from Dialog
    const handleBulkConfirm = async () => {
        const payments = selectedStaffIds.map((id) => {
            const staff = data.find((d) => d._id === id);
            const adj = adjustments[id] || { bonus: 0, deduction: 0, note: "" };
            const amount = getFinalAmount(staff!);

            return {
                staffId: id,
                amount,
                bonus: adj.bonus,
                deduction: adj.deduction,
                note: adj.note,
            };
        });

        try {
            await bulkPay({
                month,
                paymentMethod: "cash",
                payments,
                createdBy: "admin", // Should be fetched from auth context
            }).unwrap();

            toast.success("Bulk Payment Successful", {
                description: `Processed payments for ${payments.length} staff members.`,
            });
            setSelectedStaffIds([]);
            setBulkReviewOpen(false);
            setAdjustments({}); // Clear adjustments after success
        } catch (error) {
            toast.error("Bulk Payment Failed", {
                description:
                    (error as { data?: { message?: string } })?.data?.message ||
                    "Failed to process payments",
            });
        }
    };

    const totalPayableWithAdjustments = useMemo(() => {
        return data
            .filter((d) => selectedStaffIds.includes(d._id))
            .reduce((sum, d) => sum + getFinalAmount(d), 0);
    }, [data, selectedStaffIds, getFinalAmount]);

    return (
        <div className="space-y-4">
            {/* Bulk Action Bar */}
            {selectedStaffIds.length > 0 && isSelectMode && (
                <div className="bg-primary/10 border border-primary/20 rounded-md p-3 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                    <div className="text-sm font-medium">
                        {selectedStaffIds.length} staff selected
                        <span className="mx-2 text-muted-foreground">•</span>
                        Total Payable: ৳{" "}
                        {totalPayableWithAdjustments.toLocaleString()}
                    </div>
                    <Button
                        size="sm"
                        onClick={() => setBulkReviewOpen(true)}
                        disabled={isBulkPaying}
                    >
                        Review & Pay
                    </Button>
                </div>
            )}

            <div className="border rounded-md overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/40">
                        <TableRow>
                            {isSelectMode && (
                                <TableHead className="w-[40px]">
                                    <Checkbox
                                        checked={isAllSelected}
                                        onCheckedChange={toggleSelectAll}
                                        aria-label="Select all"
                                    />
                                </TableHead>
                            )}
                            <TableHead>Staff Info</TableHead>
                            <TableHead className="text-center">
                                Work Days
                            </TableHead>
                            <TableHead className="text-center">
                                Present
                            </TableHead>
                            <TableHead className="text-center">
                                Absent
                            </TableHead>
                            <TableHead className="text-center">Late</TableHead>
                            <TableHead className="text-right">
                                Per Day
                            </TableHead>
                            <TableHead className="text-right">
                                Payable
                            </TableHead>
                            <TableHead className="text-center">
                                Action
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={isSelectMode ? 9 : 8}
                                    className="h-24 text-center"
                                >
                                    No payroll data found for this month.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((row) => {
                                const isPaid = row.status === "paid";
                                const adj = adjustments[row._id];
                                const hasAdjustment =
                                    adj &&
                                    (adj.bonus > 0 ||
                                        adj.deduction > 0 ||
                                        (adj.baseAmount !== undefined &&
                                            adj.baseAmount !==
                                                row.payableSalary));
                                const finalAmount = isPaid
                                    ? row.paidAmount
                                    : getFinalAmount(row);

                                return (
                                    <TableRow
                                        key={row._id}
                                        className={cn(
                                            selectedStaffIds.includes(row._id)
                                                ? "bg-muted/30"
                                                : "",
                                        )}
                                    >
                                        {isSelectMode && (
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedStaffIds.includes(
                                                        row._id,
                                                    )}
                                                    onCheckedChange={() =>
                                                        toggleSelect(row._id)
                                                    }
                                                    disabled={isPaid}
                                                />
                                            </TableCell>
                                        )}
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
                                        <TableCell className="text-center">
                                            {row.workDays}
                                        </TableCell>
                                        <TableCell className="text-center text-green-600 font-medium">
                                            {row.present}
                                        </TableCell>
                                        <TableCell className="text-center text-red-600 font-medium">
                                            {row.absent}
                                        </TableCell>
                                        <TableCell className="text-center text-yellow-600">
                                            {row.late}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs">
                                            {row.perDaySalary}
                                        </TableCell>
                                        <TableCell className="text-right group relative">
                                            <div className="flex flex-col items-end">
                                                <div className="flex items-center gap-2">
                                                    {!isPaid && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditParams({
                                                                    open: true,
                                                                    staffId:
                                                                        row._id,
                                                                    staffName:
                                                                        row.name,
                                                                    baseAmount:
                                                                        adjustments[
                                                                            row
                                                                                ._id
                                                                        ]
                                                                            ?.baseAmount ??
                                                                        row.payableSalary,
                                                                    mode: "pay", // Using 'pay' mode to show review dialog, but will have Save button
                                                                });
                                                            }}
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                                                            title="Adjust Salary"
                                                        >
                                                            <Pencil className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                    <span
                                                        className={cn(
                                                            "font-bold font-mono",
                                                            hasAdjustment
                                                                ? "text-blue-600"
                                                                : "",
                                                        )}
                                                    >
                                                        {finalAmount}
                                                    </span>
                                                </div>
                                                {hasAdjustment && !isPaid && (
                                                    <span className="text-[10px] text-blue-500 font-mono">
                                                        {adj.bonus > 0 &&
                                                            `+${adj.bonus}`}
                                                        {adj.deduction > 0 &&
                                                            ` -${adj.deduction}`}
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-muted-foreground">
                                                    / {row.salary}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 w-8 p-0"
                                                    onClick={() =>
                                                        setGraceParams({
                                                            open: true,
                                                            staffId: row._id,
                                                            staffName: row.name,
                                                        })
                                                    }
                                                    title="Grace"
                                                    disabled={isPaid}
                                                >
                                                    <Ban className="h-3.5 w-3.5 text-muted-foreground" />
                                                </Button>

                                                {isPaid ? (
                                                    <div className="flex items-center gap-2">
                                                        <Badge
                                                            variant="outline"
                                                            className="h-8 px-3 text-xs gap-1.5 border-green-200 bg-green-50 text-green-700"
                                                        >
                                                            <CheckCheck className="h-3.5 w-3.5" />
                                                            Paid
                                                        </Badge>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                                                            onClick={() =>
                                                                handleUndoPayment(
                                                                    row._id,
                                                                )
                                                            }
                                                            disabled={isUndoing}
                                                            title="Undo Payment"
                                                        >
                                                            {isUndoing ? (
                                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                            ) : (
                                                                <RefreshCcw className="h-3.5 w-3.5" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        className="h-8 px-3 text-xs gap-1.5 bg-green-600 hover:bg-green-700"
                                                        onClick={() =>
                                                            setEditParams({
                                                                open: true,
                                                                staffId:
                                                                    row._id,
                                                                staffName:
                                                                    row.name,
                                                                baseAmount:
                                                                    adjustments[
                                                                        row._id
                                                                    ]
                                                                        ?.baseAmount ??
                                                                    row.payableSalary,
                                                                mode: "pay",
                                                            })
                                                        }
                                                    >
                                                        <Banknote className="h-3.5 w-3.5" />
                                                        Pay
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

            <GraceDialog
                open={graceParams.open}
                onOpenChange={(open) => setGraceParams((p) => ({ ...p, open }))}
                staffId={graceParams.staffId}
                staffName={graceParams.staffName}
                month={month}
            />

            {editParams && (
                <EditSalaryDialog
                    open={editParams.open}
                    onOpenChange={(open) => !open && setEditParams(null)}
                    staffId={editParams.staffId}
                    staffName={editParams.staffName}
                    month={month}
                    baseAmount={editParams.baseAmount}
                    mode={editParams.mode}
                    initialBonus={adjustments[editParams.staffId]?.bonus}
                    initialDeduction={
                        adjustments[editParams.staffId]?.deduction
                    }
                    initialNote={adjustments[editParams.staffId]?.note}
                    onSave={
                        editParams.mode === "pay"
                            ? (data) =>
                                  handleSaveAdjustment(editParams.staffId, data)
                            : undefined
                    }
                />
            )}

            <BulkReviewDialog
                open={bulkReviewOpen}
                onOpenChange={setBulkReviewOpen}
                selectedCount={selectedStaffIds.length}
                totalAmount={totalPayableWithAdjustments}
                month={month}
                onConfirm={handleBulkConfirm}
                isProcessing={isBulkPaying}
            />
        </div>
    );
}
