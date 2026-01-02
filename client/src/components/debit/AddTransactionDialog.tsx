'use client';

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/redux/store';
import { createDebit, fetchDebitStats } from '@/redux/slices/debitSlice';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

export function AddTransactionDialog() {
    const [open, setOpen] = useState(false);
    const [personId, setPersonId] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState<Date>(new Date());
    const [type, setType] = useState<'Borrow' | 'Return'>('Borrow');
    const [description, setDescription] = useState('');
    const [errors, setErrors] = useState<{ personId?: string; amount?: string }>(
        {}
    );

    const dispatch = useDispatch<AppDispatch>();
    const { persons } = useSelector((state: RootState) => state.debit);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: { personId?: string; amount?: string } = {};

        if (!personId) {
            newErrors.personId = 'Person is required';
        }

        const amountNum = parseFloat(amount);
        if (!amount || amountNum <= 0) {
            newErrors.amount = 'Amount must be greater than 0';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});

        dispatch(
            createDebit({
                personId,
                amount: amountNum,
                date: date.toISOString(),
                type,
                description,
            })
        )
            .unwrap()
            .then(() => {
                toast.success('Debit added successfully');
                dispatch(fetchDebitStats());
                setOpen(false);
                setPersonId('');
                setAmount('');
                setDate(new Date());
                setType('Borrow');
                setDescription('');
            })
            .catch((err) => {
                toast.error(`Failed to add debit: ${err}`);
            });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary">New Debit</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Debit</DialogTitle>
                    <DialogDescription>
                        Record a borrow or return debit.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="person">Person</Label>
                        <Select value={personId} onValueChange={setPersonId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a person" />
                            </SelectTrigger>
                            <SelectContent>
                                {persons.map((person) => (
                                    <SelectItem
                                        key={person._id}
                                        value={person._id}
                                    >
                                        {person.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.personId && (
                            <p className="text-sm text-destructive">
                                {errors.personId}
                            </p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="type">Type</Label>
                        <Select
                            value={type}
                            onValueChange={(val) =>
                                setType(val as 'Borrow' | 'Return')
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Borrow">Borrow</SelectItem>
                                <SelectItem value="Return">Return</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                            id="amount"
                            type="number"
                            placeholder="Amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                        {errors.amount && (
                            <p className="text-sm text-destructive">
                                {errors.amount}
                            </p>
                        )}
                    </div>
                    <div className="flex flex-col space-y-2">
                        <Label>Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={'outline'}
                                    className={cn(
                                        'w-full pl-3 text-left font-normal',
                                        !date && 'text-muted-foreground'
                                    )}
                                >
                                    {date ? (
                                        format(date, 'PPP')
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={(d) => d && setDate(d)}
                                    disabled={(d) =>
                                        d > new Date() ||
                                        d < new Date('1900-01-01')
                                    }
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            placeholder="Optional notes..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                    <Button type="submit">Save Debit</Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
