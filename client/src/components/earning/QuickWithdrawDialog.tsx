import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader, DollarSign, Calculator } from 'lucide-react';
import { useWithdrawEarningMutation } from '@/redux/features/earning/earningApi';
import type { IOrder } from '@/types/order.type';
import { toast } from 'sonner';

interface QuickWithdrawDialogProps {
    isOpen: boolean;
    onClose: () => void;
    order: IOrder;
    onSuccess?: () => void;
}

export function QuickWithdrawDialog({
    isOpen,
    onClose,
    order,
    onSuccess,
}: QuickWithdrawDialogProps) {
    // Mutation
    const [withdrawEarning, { isLoading }] = useWithdrawEarningMutation();

    // Form State
    const [fees, setFees] = useState<string>('0');
    const [tax, setTax] = useState<string>('0');
    const [conversionRate, setConversionRate] = useState<string>('1');
    const [notes, setNotes] = useState('');

    // Derived State
    const orderAmount = order.totalPrice;
    const netAmount = Math.max(0, orderAmount - Number(fees) - Number(tax));
    const finalAmountInBDT = netAmount * Number(conversionRate);

    // Reset form when dialog opens/order changes
    useEffect(() => {
        if (isOpen) {
            setFees('0');
            setTax('0');
            // Look up client currency logic if needed, defaulting to 1 for now
            // If we had client currency rate stored, we could pre-fill it here
            setConversionRate('1');
            setNotes('');
        }
    }, [isOpen, order]);

    const handleWithdraw = async () => {
        if (!order) return;

        try {
            await withdrawEarning({
                id: order._id, // We pass orderId, backend handles finding/creating the earning
                data: {
                    fees: Number(fees),
                    tax: Number(tax),
                    conversionRate: Number(conversionRate),
                    notes: notes,
                },
            }).unwrap();

            toast.success('Earning withdrawn successfully');
            if (onSuccess) onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Withdraw failed:', error);
            toast.error(error?.data?.message || 'Failed to withdraw earning');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Quick Withdraw</DialogTitle>
                    <DialogDescription>
                        Mark order <strong>{order.orderName}</strong> as paid.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Summary Card */}
                    <div className="rounded-lg bg-muted p-3 text-sm">
                        <div className="flex justify-between mb-1">
                            <span className="text-muted-foreground">
                                Order Amount:
                            </span>
                            <span className="font-medium">
                                ${orderAmount.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between mb-1">
                            <span className="text-muted-foreground">
                                Client:
                            </span>
                            <span className="font-medium">
                                {order.clientId.name}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="fees">Fees ($)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="fees"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={fees}
                                    onChange={(e) => setFees(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tax">Tax ($)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="tax"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={tax}
                                    onChange={(e) => setTax(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="rate">Conversion Rate</Label>
                        <div className="relative">
                            <Calculator className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="rate"
                                type="number"
                                min="0"
                                step="0.01"
                                value={conversionRate}
                                onChange={(e) =>
                                    setConversionRate(e.target.value)
                                }
                                className="pl-8"
                            />
                        </div>
                    </div>

                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 mt-2">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-muted-foreground">
                                Net Amount (USD)
                            </span>
                            <span className="text-lg font-bold">
                                ${netAmount.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                            <span className="text-sm font-medium text-muted-foreground">
                                Total (BDT)
                            </span>
                            <span className="text-lg font-bold text-primary">
                                ৳{finalAmountInBDT.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Transaction Notes</Label>
                        <Textarea
                            id="notes"
                            placeholder="Transaction ID, Check No, etc."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="resize-none"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleWithdraw} disabled={isLoading}>
                        {isLoading && (
                            <Loader className=" h-4 w-4 animate-spin" />
                        )}
                        Confirm Withdraw
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
