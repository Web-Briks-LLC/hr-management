import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { IEarning, EarningStatus } from '@/types/earning.type';
import { AlertCircle, Calculator } from 'lucide-react';

interface EditEarningDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    earning: IEarning | null;
    onSave: (id: string, data: Partial<IEarning>) => Promise<void>;
    isLoading: boolean;
}

export function EditEarningDialog({
    open,
    onOpenChange,
    earning,
    onSave,
    isLoading,
}: EditEarningDialogProps) {
    const [formData, setFormData] = useState<Partial<IEarning>>({});

    useEffect(() => {
        if (earning && open) {
            setFormData({
                imageQty: earning.imageQty || 0,
                totalAmount: earning.totalAmount || 0,
                fees: earning.fees || 0,
                tax: earning.tax || 0,
                conversionRate: earning.conversionRate || 0,
                netAmount: earning.netAmount || 0,
                amountInBDT: earning.amountInBDT || 0,
                paidAmount: earning.paidAmount || 0,
                paidAmountBDT: earning.paidAmountBDT || 0,
                status: earning.status || 'unpaid',
                notes: earning.notes || '',
            });
        } else {
            setFormData({});
        }
    }, [earning, open]);

    const handleNumberChange = (field: keyof IEarning, value: string) => {
        const numValue = value === '' ? 0 : parseFloat(value);
        setFormData((prev) => {
            const next = { ...prev, [field]: numValue };

            // Auto-calculations
            if (['totalAmount', 'fees', 'tax'].includes(field)) {
                const total = field === 'totalAmount' ? numValue : prev.totalAmount || 0;
                const fees = field === 'fees' ? numValue : prev.fees || 0;
                const tax = field === 'tax' ? numValue : prev.tax || 0;
                next.netAmount = Math.max(0, total - fees - tax);
                next.amountInBDT = Math.round(next.netAmount * (prev.conversionRate || 0));
            }

            if (['conversionRate'].includes(field)) {
                next.amountInBDT = Math.round((prev.netAmount || 0) * numValue);
                if (prev.paidAmount && prev.paidAmount > 0 && (!prev.paidAmountBDT || prev.paidAmountBDT === 0)) {
                    next.paidAmountBDT = Math.round(prev.paidAmount * numValue);
                }
            }

            if (field === 'paidAmount' && prev.conversionRate) {
                next.paidAmountBDT = Math.round(numValue * prev.conversionRate);
            }

            return next;
        });
    };

    const handleTextChange = (field: keyof IEarning, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        if (!earning) return;
        await onSave(earning._id, formData);
    };

    if (!earning) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Earning Record</DialogTitle>
                    <DialogDescription>
                        Modify all values for this earning. Changes will automatically update derived values like net amounts.
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 p-3 rounded-md flex items-start gap-2 text-sm mt-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                        <p className="font-semibold">Manual Override Warning</p>
                        <p className="opacity-90">Modifying these values manually will override the order-based calculations. Ensure values are accurate to prevent financial discrepancies.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                            value={formData.status as string}
                            onValueChange={(v) => handleTextChange('status', v)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unpaid">Unpaid</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Image Quantity</Label>
                        <Input
                            type="number"
                            value={formData.imageQty || ''}
                            onChange={(e) => handleNumberChange('imageQty', e.target.value)}
                        />
                    </div>

                    {/* USD Block */}
                    <div className="space-y-4 col-span-1 sm:col-span-2 border rounded-md p-4 bg-muted/20 relative">
                        <div className="absolute top-2 right-2 flex items-center gap-1 text-xs text-muted-foreground">
                            <Calculator className="h-3 w-3" /> Auto-calc
                        </div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-2">USD Details</h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Total Amount (USD)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.totalAmount ?? ''}
                                    onChange={(e) => handleNumberChange('totalAmount', e.target.value)}
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Fees (USD)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.fees ?? ''}
                                    onChange={(e) => handleNumberChange('fees', e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Tax (USD)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.tax ?? ''}
                                    onChange={(e) => handleNumberChange('tax', e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Net Amount (USD)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.netAmount ?? ''}
                                    onChange={(e) => handleNumberChange('netAmount', e.target.value)}
                                    className="bg-primary/5 border-primary/20"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Conversion Block */}
                    <div className="space-y-4 col-span-1 sm:col-span-2 border rounded-md p-4 bg-muted/20">
                        <h4 className="font-medium text-sm text-muted-foreground mb-2">Conversion & BDT Details</h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Conversion Rate (BDT/USD)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.conversionRate ?? ''}
                                    onChange={(e) => handleNumberChange('conversionRate', e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Net Amount (BDT)</Label>
                                <Input
                                    type="number"
                                    value={formData.amountInBDT ?? ''}
                                    onChange={(e) => handleNumberChange('amountInBDT', e.target.value)}
                                    className="bg-primary/5 border-primary/20"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Payment Block */}
                    <div className="space-y-4 col-span-1 sm:col-span-2 border rounded-md p-4 bg-muted/20">
                        <h4 className="font-medium text-sm text-muted-foreground mb-2">Payment Details</h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Paid Amount (USD)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.paidAmount ?? ''}
                                    onChange={(e) => handleNumberChange('paidAmount', e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Paid Amount (BDT)</Label>
                                <Input
                                    type="number"
                                    value={formData.paidAmountBDT ?? ''}
                                    onChange={(e) => handleNumberChange('paidAmountBDT', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 col-span-1 sm:col-span-2">
                        <Label>Notes / References</Label>
                        <Textarea
                            placeholder="Add manual edit reference..."
                            value={formData.notes || ''}
                            onChange={(e) => handleTextChange('notes', e.target.value)}
                            className="resize-none"
                            rows={2}
                        />
                    </div>
                </div>

                <DialogFooter className="mt-6">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
