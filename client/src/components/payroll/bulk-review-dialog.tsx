import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle } from 'lucide-react';

interface BulkReviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedCount: number;
    totalAmount: number;
    month: string;
    onConfirm: () => Promise<void>;
    isProcessing: boolean;
}

export default function BulkReviewDialog({
    open,
    onOpenChange,
    selectedCount,
    totalAmount,
    month,
    onConfirm,
    isProcessing,
}: BulkReviewDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        Confirm Bulk Payment
                    </DialogTitle>
                    <DialogDescription className="pt-2">
                        You are about to process salary payments for{' '}
                        <span className="font-semibold text-foreground">
                            {selectedCount} staff members
                        </span>
                        .
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-3">
                    <div className="flex justify-between items-center p-3 bg-muted rounded-md border">
                        <span className="text-sm font-medium text-muted-foreground">
                            Total Payable Amount
                        </span>
                        <span className="text-2xl font-bold text-primary">
                            ৳ {totalAmount.toLocaleString()}
                        </span>
                    </div>

                    <p className="text-sm text-muted-foreground">
                        Please review all amounts before confirming. This action
                        will record payments for the month of{' '}
                        <span className="font-medium text-foreground">
                            {new Date(month).toLocaleString('default', {
                                month: 'long',
                                year: 'numeric',
                            })}
                        </span>
                        .
                    </p>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isProcessing}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={onConfirm}
                        disabled={isProcessing}
                        className="bg-green-600 hover:bg-green-700 min-w-[140px]"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            'Confirm & Pay'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
