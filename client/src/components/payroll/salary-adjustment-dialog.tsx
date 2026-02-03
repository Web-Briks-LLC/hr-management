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

interface SalaryAdjustmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    staffId: string;
    staffName: string;
    currentBonus: number;
    currentDeduction: number;
    currentNote: string;
    onSave: (
        id: string,
        adjustment: { bonus: number; deduction: number; note: string },
    ) => void;
}

export default function SalaryAdjustmentDialog({
    open,
    onOpenChange,
    staffId,
    staffName,
    currentBonus,
    currentDeduction,
    currentNote,
    onSave,
}: SalaryAdjustmentDialogProps) {
    const [bonus, setBonus] = useState<string>('');
    const [deduction, setDeduction] = useState<string>('');
    const [note, setNote] = useState('');

    useEffect(() => {
        if (open) {
            setBonus(currentBonus > 0 ? currentBonus.toString() : '');
            setDeduction(
                currentDeduction > 0 ? currentDeduction.toString() : '',
            );
            setNote(currentNote || '');
        }
    }, [open, currentBonus, currentDeduction, currentNote]);

    const handleSave = () => {
        onSave(staffId, {
            bonus: parseFloat(bonus) || 0,
            deduction: parseFloat(deduction) || 0,
            note: note.trim(),
        });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Adjust Salary</DialogTitle>
                    <DialogDescription>
                        Add bonus or deduction for{' '}
                        <span className="font-semibold">{staffName}</span>.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
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
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
