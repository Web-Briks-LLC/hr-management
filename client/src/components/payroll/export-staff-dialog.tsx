"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { IPayrollItem } from "@/types/payroll.type";

interface ExportStaffDialogProps {
    data: IPayrollItem[];
    format: "excel" | "pdf";
    isOvertime: boolean;
    onClose: () => void;
    onConfirm: (staff: IPayrollItem[]) => void;
}

export default function ExportStaffDialog({
    data, format, isOvertime, onClose, onConfirm,
}: ExportStaffDialogProps) {
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
    const query = search.trim().toLowerCase();
    const visibleStaff = data.filter(row =>
        [row.name, row.staffId, row.designation, row.branch]
            .some(value => value?.toLowerCase().includes(query)),
    );
    // Always derive the export from this report's rows, in report order.
    const selectedStaff = data.filter(row => selectedIds.has(row._id));
    const selectedVisibleCount = visibleStaff.filter(row => selectedIds.has(row._id)).length;
    const allVisibleSelected = visibleStaff.length > 0 && selectedVisibleCount === visibleStaff.length;
    const selectedAmount = selectedStaff.reduce(
        (total, row) => total + (isOvertime ? row.otPayable : row.payableSalary), 0,
    );

    const toggleStaff = (id: string, checked: boolean) => {
        setSelectedIds(previous => {
            const next = new Set(previous);
            if (checked) next.add(id);
            else next.delete(id);
            return next;
        });
    };

    const toggleVisible = (checked: boolean) => {
        setSelectedIds(previous => {
            const next = new Set(previous);
            for (const row of visibleStaff) {
                if (checked) next.add(row._id);
                else next.delete(row._id);
            }
            return next;
        });
    };

    return (
        <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
            <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Select staff to export</DialogTitle>
                    <DialogDescription>
                        Choose whose {isOvertime ? "overtime" : "salary"} information to include in the {format === "excel" ? "Excel report" : "PDF letter"}.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        aria-label="Search staff to export"
                        placeholder="Search by name, staff ID, designation or branch"
                        className="pl-9"
                        value={search}
                        onChange={event => setSearch(event.target.value)}
                    />
                </div>

                <div className="flex items-center justify-between gap-2 text-sm">
                    <span role="status" aria-live="polite">{selectedStaff.length} of {data.length} staff selected</span>
                    <Button type="button" variant="ghost" size="sm" disabled={!selectedStaff.length} onClick={() => setSelectedIds(new Set())}>
                        Clear selection
                    </Button>
                </div>

                <div className="min-h-0 overflow-auto rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-10">
                                    <Checkbox
                                        aria-label="Select all visible staff"
                                        checked={allVisibleSelected ? true : selectedVisibleCount > 0 ? "indeterminate" : false}
                                        disabled={!visibleStaff.length}
                                        onCheckedChange={checked => toggleVisible(checked === true)}
                                    />
                                </TableHead>
                                <TableHead>Staff</TableHead>
                                <TableHead>Designation</TableHead>
                                <TableHead className="text-right">{isOvertime ? "Overtime" : "Payable salary"}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visibleStaff.length ? visibleStaff.map(row => (
                                <TableRow key={row._id} data-state={selectedIds.has(row._id) ? "selected" : undefined}>
                                    <TableCell>
                                        <Checkbox
                                            id={`export-staff-${row._id}`}
                                            aria-label={`Include ${row.name || row.staffId} in export`}
                                            checked={selectedIds.has(row._id)}
                                            onCheckedChange={checked => toggleStaff(row._id, checked === true)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <label htmlFor={`export-staff-${row._id}`} className="cursor-pointer font-medium">{row.name || row.staffId}</label>
                                        <p className="text-xs text-muted-foreground">{row.staffId}</p>
                                    </TableCell>
                                    <TableCell>{row.designation || "—"}</TableCell>
                                    <TableCell className="text-right tabular-nums">৳{(isOvertime ? row.otPayable : row.payableSalary).toLocaleString()}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No staff found.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <p className="text-xs text-muted-foreground">The header checkbox selects all visible staff. Your selections are kept while searching.</p>
                <div className="flex items-center justify-between text-sm font-medium">
                    <span>Selected total</span>
                    <span className="tabular-nums">৳{selectedAmount.toLocaleString()}</span>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                    <Button type="button" disabled={!selectedStaff.length} onClick={() => onConfirm(selectedStaff)}>
                        {format === "excel" ? `Export Excel (${selectedStaff.length})` : `Continue to PDF (${selectedStaff.length})`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
