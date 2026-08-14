'use client';

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useSubmitQCReviewMutation } from '@/redux/features/production/productionApi';
import { IShiftProduction, STAGE_LABELS } from '@/types/production.type';
import { CheckCircle2, XCircle, ShieldCheck, Loader2 } from 'lucide-react';

interface QCReviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    log: IShiftProduction | null;
}

export function QCReviewDialog({ open, onOpenChange, log }: QCReviewDialogProps) {
    const [passedCount, setPassedCount] = useState<number>(log?.completedQuantity || 0);
    const [rejectedCount, setRejectedCount] = useState<number>(0);
    const [qcNotes, setQcNotes] = useState<string>('');
    const [requiresRevision, setRequiresRevision] = useState<boolean>(false);
    const [revisionInstructions, setRevisionInstructions] = useState<string>('');

    const [submitQC, { isLoading }] = useSubmitQCReviewMutation();

    const handleRejectedChange = (val: number) => {
        const rejected = Math.max(0, val);
        setRejectedCount(rejected);
        if (log) {
            const passed = Math.max(0, log.completedQuantity - rejected);
            setPassedCount(passed);
        }
        if (rejected > 0) {
            setRequiresRevision(true);
        }
    };

    const handlePassedChange = (val: number) => {
        const passed = Math.max(0, val);
        setPassedCount(passed);
        if (log) {
            const rejected = Math.max(0, log.completedQuantity - passed);
            setRejectedCount(rejected);
            if (rejected > 0) {
                setRequiresRevision(true);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!log) return;

        try {
            await submitQC({
                id: log._id,
                data: {
                    passedCount: Number(passedCount) || 0,
                    rejectedCount: Number(rejectedCount) || 0,
                    qcNotes,
                    requiresRevision,
                    revisionInstructions: requiresRevision ? revisionInstructions : undefined,
                },
            }).unwrap();

            toast.success('Quality check review submitted successfully!');
            onOpenChange(false);
        } catch (error: any) {
            console.error('Submit QC review error:', error);
            toast.error(error?.data?.message || 'Failed to submit QC review');
        }
    };

    if (!log) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold">Quality Check (QC Review)</DialogTitle>
                            <DialogDescription>
                                Verify processed images and log defects or approve completed batch.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="p-3 bg-muted/40 rounded-xl border border-border/50 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Order:</span>
                            <span className="font-bold text-foreground">{log.orderId?.orderName || 'Order'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Shift:</span>
                            <span className="font-medium">{log.shiftId?.name || 'Shift'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Stage:</span>
                            <span className="font-medium text-primary">{STAGE_LABELS[log.stage] || log.stage}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Total Processed Images in Batch:</span>
                            <span className="font-bold text-base text-foreground">{log.completedQuantity}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="passedQty" className="text-xs font-semibold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Passed Count (সঠিক)
                            </Label>
                            <Input
                                id="passedQty"
                                type="number"
                                min={0}
                                max={log.completedQuantity}
                                value={passedCount}
                                onChange={(e) => handlePassedChange(Number(e.target.value))}
                                className="h-10 font-bold text-base text-emerald-600 border-emerald-500/30 focus-visible:ring-emerald-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="rejectedQty" className="text-xs font-semibold uppercase text-destructive flex items-center gap-1">
                                <XCircle className="h-3.5 w-3.5" /> Rejected (ভুল / রিভিশন)
                            </Label>
                            <Input
                                id="rejectedQty"
                                type="number"
                                min={0}
                                max={log.completedQuantity}
                                value={rejectedCount}
                                onChange={(e) => handleRejectedChange(Number(e.target.value))}
                                className="h-10 font-bold text-base text-destructive border-destructive/30 focus-visible:ring-destructive"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="qcNotes" className="text-xs font-semibold uppercase text-muted-foreground">
                            QC Review Notes
                        </Label>
                        <Textarea
                            id="qcNotes"
                            placeholder="Overall quality feedback, precision remarks, background clean notes..."
                            value={qcNotes}
                            onChange={(e) => setQcNotes(e.target.value)}
                            className="min-h-[70px] text-xs resize-none"
                        />
                    </div>

                    <div className="flex items-center space-x-2 pt-1">
                        <Checkbox
                            id="requiresRevision"
                            checked={requiresRevision}
                            onCheckedChange={(checked) => setRequiresRevision(!!checked)}
                        />
                        <Label htmlFor="requiresRevision" className="text-xs font-medium cursor-pointer">
                            Mark order as <span className="font-bold text-destructive">Requires Revision</span>
                        </Label>
                    </div>

                    {requiresRevision && (
                        <div className="space-y-2 p-3 bg-destructive/5 rounded-xl border border-destructive/20 animate-in fade-in-50">
                            <Label htmlFor="revisionInstructions" className="text-xs font-bold text-destructive">
                                Revision Instructions (রিভিশন সংক্রান্ত নির্দেশনা)
                            </Label>
                            <Textarea
                                id="revisionInstructions"
                                placeholder="Specify exactly which images need fixes, e.g. 'Images 12, 15, 28 have edge feathering defects. Please re-path.'"
                                value={revisionInstructions}
                                onChange={(e) => setRevisionInstructions(e.target.value)}
                                className="min-h-[70px] text-xs resize-none border-destructive/30"
                            />
                        </div>
                    )}

                    <DialogFooter className="pt-3 gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading} className="min-w-[120px] bg-purple-600 hover:bg-purple-700 text-white">
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Submit QC Result'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
