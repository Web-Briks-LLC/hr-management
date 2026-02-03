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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useProcessPaymentMutation } from '@/redux/features/payroll/payrollApi';
import { Loader2, Save } from 'lucide-react';

interface EditSalaryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    staffId: string;
    staffName: string;
    month: string;
    baseAmount: number; // calculated payable amount
    mode?: 'pay' | 'edit';
    initialBonus?: number;
    initialDeduction?: number;
    initialNote?: string;
    onSave?: (data: {
        baseAmount: number;
        bonus: number;
        deduction: number;
        note: string;
    }) => void;
}

export default function EditSalaryDialog({
    open,
    onOpenChange,
    staffId,
    staffName,
    month,
    baseAmount,
    mode = 'pay',
    initialBonus = 0,
    initialDeduction = 0,
    initialNote = '',
    onSave,
}: EditSalaryDialogProps) {
    const [bonus, setBonus] = useState<string>('');
    const [deduction, setDeduction] = useState<string>('');
    const [note, setNote] = useState('');
    const [localBaseAmount, setLocalBaseAmount] = useState<string>(
        (baseAmount || 0).toString(),
    );
    const [finalAmount, setFinalAmount] = useState<number>(baseAmount || 0);
    const [isBaseEditable, setIsBaseEditable] = useState(false);

    const [processPayment, { isLoading }] = useProcessPaymentMutation();

    useEffect(() => {
        if (open) {
            setBonus(initialBonus > 0 ? initialBonus.toString() : '');
            setDeduction(
                initialDeduction > 0 ? initialDeduction.toString() : '',
            );
            setNote(initialNote || '');
            setLocalBaseAmount((baseAmount || 0).toString());
            setFinalAmount(baseAmount || 0);
            setIsBaseEditable(false);
        }
    }, [open, baseAmount, initialBonus, initialDeduction, initialNote]);

    // Recalculate final amount when bonus/deduction/base changes
    useEffect(() => {
        const b = parseFloat(bonus) || 0;
        const d = parseFloat(deduction) || 0;
        const base = parseFloat(localBaseAmount) || 0;
        setFinalAmount(Math.max(0, base + b - d));
    }, [localBaseAmount, bonus, deduction]);

    const handleSave = () => {
        if (onSave) {
            onSave({
                baseAmount: parseFloat(localBaseAmount) || 0,
                bonus: parseFloat(bonus) || 0,
                deduction: parseFloat(deduction) || 0,
                note: note.trim(),
            });
            onOpenChange(false);
            toast.success('Changes Saved', {
                description:
                    'Salary adjustments have been saved for bulk payment.',
            });
        }
    };

    const handlePayment = async () => {
        try {
            await processPayment({
                staffId,
                month,
                amount: finalAmount,
                paymentMethod: 'cash',
                note,
                bonus: parseFloat(bonus) || 0,
                deduction: parseFloat(deduction) || 0,
            }).unwrap();

            toast.success('Payment Successful', {
                description: `Salary paid to ${staffName}`,
            });
            onOpenChange(false);
        } catch (error: any) {
            toast.error('Payment Failed', {
                description: error.data?.message || 'Could not process payment',
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>
                        {mode === 'edit'
                            ? 'Edit Payment'
                            : 'Review & Process Payment'}
                    </DialogTitle>
                    <DialogDescription>
                        Review and adjust salary for{' '}
                        <span className="font-semibold">{staffName}</span>.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="base" className="text-right">
                            Base
                        </Label>
                        <div className="col-span-3 flex items-center gap-2">
                            <Input
                                id="base"
                                type="number"
                                value={localBaseAmount}
                                onChange={(e) =>
                                    setLocalBaseAmount(e.target.value)
                                }
                                disabled={!isBaseEditable}
                                className={!isBaseEditable ? 'bg-muted' : ''}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-10 w-10 shrink-0"
                                onClick={() =>
                                    setIsBaseEditable(!isBaseEditable)
                                }
                                title="Edit Base Salary"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="lucide lucide-pencil"
                                >
                                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                    <path d="m15 5 4 4" />
                                </svg>
                            </Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="bonus" className="text-right">
                            Bonus
                        </Label>
                        <Input
                            id="bonus"
                            type="number"
                            value={bonus}
                            onChange={(e) => setBonus(e.target.value)}
                            className="col-span-3"
                            placeholder="0.00"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="deduction" className="text-right">
                            Deduction
                        </Label>
                        <Input
                            id="deduction"
                            type="number"
                            value={deduction}
                            onChange={(e) => setDeduction(e.target.value)}
                            className="col-span-3 text-red-500"
                            placeholder="0.00"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="total" className="text-right font-bold">
                            Total
                        </Label>
                        <div className="col-span-3 font-bold text-lg">
                            {(finalAmount || 0).toFixed(2)}
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="note" className="text-right">
                            Note
                        </Label>
                        <Input
                            id="note"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="col-span-3"
                            placeholder="Optional note..."
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    {onSave && (
                        <Button
                            variant="secondary"
                            onClick={handleSave}
                            disabled={isLoading}
                            className="gap-2"
                        >
                            <Save className="h-4 w-4" />
                            Save
                        </Button>
                    )}
                    <Button onClick={handlePayment} disabled={isLoading}>
                        {isLoading && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Confirm Payment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
