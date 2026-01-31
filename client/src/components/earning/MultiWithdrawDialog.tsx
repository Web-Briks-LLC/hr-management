'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader, DollarSign, Calculator, X } from 'lucide-react';
import { useBulkWithdrawEarningsMutation } from '@/redux/features/earning/earningApi';
import type { IOrder } from '@/types/order.type';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface MultiWithdrawDialogProps {
    isOpen: boolean;
    onClose: () => void;
    orders: IOrder[];
    onSuccess?: () => void;
}

export function MultiWithdrawDialog({
    isOpen,
    onClose,
    orders,
    onSuccess,
}: MultiWithdrawDialogProps) {
    // Mutation
    const [bulkWithdraw, { isLoading }] = useBulkWithdrawEarningsMutation();

    // Form State
    const [fees, setFees] = useState<string>('0');
    const [tax, setTax] = useState<string>('0');
    const [conversionRate, setConversionRate] = useState<string>('1');
    const [notes, setNotes] = useState('');

    // Only include unpaid orders
    const unpaidOrders = useMemo(() => {
        return orders.filter((order) => order.earning?.status !== 'paid');
    }, [orders]);

    // Derived State
    const totalOrderAmount = useMemo(() => {
        return unpaidOrders.reduce((sum, order) => sum + order.totalPrice, 0);
    }, [unpaidOrders]);

    const netAmount = Math.max(
        0,
        totalOrderAmount - Number(fees) - Number(tax),
    );
    const finalAmountInBDT = netAmount * Number(conversionRate);

    // Reset form when dialog opens
    useEffect(() => {
        if (isOpen) {
            setFees('0');
            setTax('0');
            setConversionRate('1');
            setNotes('');
        }
    }, [isOpen]);

    const handleWithdraw = async () => {
        if (unpaidOrders.length === 0) {
            toast.error('No unpaid orders selected');
            return;
        }

        try {
            // Get earning IDs from orders
            const earningIds = unpaidOrders
                .map((order) => order._id) // We pass order IDs, backend will find/create earnings
                .filter(Boolean);

            if (earningIds.length === 0) {
                toast.error('No valid orders selected');
                return;
            }

            await bulkWithdraw({
                earningIds,
                totalFees: Number(fees),
                totalTax: Number(tax),
                conversionRate: Number(conversionRate),
                notes,
            }).unwrap();

            toast.success(
                `${unpaidOrders.length} earnings withdrawn successfully`,
            );
            if (onSuccess) onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Bulk withdraw failed:', error);
            toast.error(error?.data?.message || 'Failed to withdraw earnings');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg! max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Bulk Withdraw</DialogTitle>
                    <DialogDescription>
                        Withdraw {unpaidOrders.length} selected order
                        {unpaidOrders.length !== 1 ? 's' : ''} as paid.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Selected Orders List */}
                    <div className="space-y-2">
                        <Label>Selected Orders ({unpaidOrders.length})</Label>
                        <ScrollArea className="h-[150px] rounded-md border p-2">
                            {unpaidOrders.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No unpaid orders selected
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {unpaidOrders.map((order) => (
                                        <div
                                            key={order._id}
                                            className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">
                                                    {order.orderName}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {order.clientId?.name} •{' '}
                                                    {format(
                                                        new Date(
                                                            order.orderDate,
                                                        ),
                                                        'PP',
                                                    )}
                                                </p>
                                            </div>
                                            <span className="font-medium ml-2">
                                                ${order.totalPrice.toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>

                    {/* Summary Card */}
                    <div className="rounded-lg bg-muted p-3 text-sm">
                        <div className="flex justify-between mb-1">
                            <span className="text-muted-foreground">
                                Total Order Amount:
                            </span>
                            <span className="font-medium">
                                ${totalOrderAmount.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">
                                Orders:
                            </span>
                            <span className="font-medium">
                                {unpaidOrders.length}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="multi-fees">Total Fees ($)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="multi-fees"
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
                            <Label htmlFor="multi-tax">Total Tax ($)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="multi-tax"
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
                        <Label htmlFor="multi-rate">Conversion Rate</Label>
                        <div className="relative">
                            <Calculator className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="multi-rate"
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
                        <Label htmlFor="multi-notes">Transaction Notes</Label>
                        <Textarea
                            id="multi-notes"
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
                    <Button
                        onClick={handleWithdraw}
                        disabled={isLoading || unpaidOrders.length === 0}
                    >
                        {isLoading && (
                            <Loader className=" h-4 w-4 animate-spin" />
                        )}
                        Withdraw {unpaidOrders.length} Orders
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
