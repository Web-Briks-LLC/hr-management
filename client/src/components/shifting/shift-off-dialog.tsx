'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, CalendarOff, X } from 'lucide-react';
import { toast } from 'sonner';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

import {
    useGetShiftOffDatesQuery,
    useAddShiftOffDatesMutation,
    useRemoveShiftOffDatesMutation,
} from '@/redux/features/shift/shiftApi';

interface ShiftOffDialogProps {
    shiftId: string;
    shiftName: string;
}

export default function ShiftOffDialog({
    shiftId,
    shiftName,
}: ShiftOffDialogProps) {
    const [open, setOpen] = useState(false);
    const [selectedDates, setSelectedDates] = useState<Date[]>([]);
    const [reason, setReason] = useState('');

    const { data, isLoading: isLoadingDates } = useGetShiftOffDatesQuery(
        shiftId,
        {
            skip: !open,
        },
    );

    const [addOffDates, { isLoading: isAdding }] =
        useAddShiftOffDatesMutation();
    const [removeOffDates, { isLoading: isRemoving }] =
        useRemoveShiftOffDatesMutation();

    const existingDates = data?.data?.dates || [];

    const handleAddDates = async () => {
        if (selectedDates.length === 0) {
            toast.error('Please select at least one date');
            return;
        }

        try {
            const dateStrings = selectedDates.map((d) => d.toISOString());
            await addOffDates({
                shiftId,
                dates: dateStrings,
                reason: reason || undefined,
            }).unwrap();

            toast.success('Off dates added successfully');
            // Keep the dates selected so user can see what was added
            setReason('');
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to add off dates');
        }
    };

    const handleRemoveDate = async (date: string) => {
        try {
            await removeOffDates({
                shiftId,
                dates: [date],
            }).unwrap();
            toast.success('Off date removed');
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to remove off date');
        }
    };

    const handleDayClick = (day: Date) => {
        // Don't allow selecting dates that are already saved
        const isAlreadyExisting = existingDates.some(
            (d: string) => new Date(d).toDateString() === day.toDateString(),
        );
        if (isAlreadyExisting) {
            toast.info('This date is already an off day');
            return;
        }

        setSelectedDates((prev) => {
            const isSelected = prev.some(
                (d) => d.toDateString() === day.toDateString(),
            );
            if (isSelected) {
                return prev.filter(
                    (d) => d.toDateString() !== day.toDateString(),
                );
            }
            return [...prev, day];
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="default">
                    <CalendarOff className="h-4 w-4" />
                    Set Off Days
                </Button>
            </DialogTrigger>

            <DialogContent className="w-full! max-w-2xl! max-h-[80vh] overflow-y-auto overflow-x-hidden">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CalendarOff className="h-5 w-5" />
                        {shiftName} - Off Days
                    </DialogTitle>
                    <DialogDescription>
                        Select dates when this shift will be off. Staff cannot
                        check-in on these days.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-6">
                    {/* Calendar Section */}
                    <div className="space-y-4">
                        <Label className="text-sm font-medium">
                            Select New Off Dates
                        </Label>
                        <Calendar
                            mode="multiple"
                            selected={selectedDates}
                            onDayClick={handleDayClick}
                            disabled={(date) =>
                                date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            className="rounded-md border"
                        />

                        {selectedDates.length > 0 && (
                            <div className="space-y-2">
                                <Label className="text-sm">
                                    Selected ({selectedDates.length})
                                </Label>
                                <div className="flex flex-wrap gap-1">
                                    {selectedDates.map((d) => (
                                        <Badge
                                            key={d.toISOString()}
                                            variant="secondary"
                                            className="cursor-pointer"
                                            onClick={() => handleDayClick(d)}
                                        >
                                            {format(d, 'dd MMM')}
                                            <X className="h-3 w-3 ml-1" />
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label className="text-sm">Reason (optional)</Label>
                            <Textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="e.g., Eid holiday, Office renovation..."
                                rows={2}
                            />
                        </div>
                    </div>

                    {/* Existing Off Dates */}
                    <div className="space-y-4">
                        <Label className="text-sm font-medium">
                            Current Off Dates
                        </Label>
                        {isLoadingDates ? (
                            <p className="text-sm text-muted-foreground">
                                Loading...
                            </p>
                        ) : existingDates.length === 0 ? (
                            <div className="rounded-md border border-dashed p-6 text-center">
                                <CalendarOff className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">
                                    No off dates set
                                </p>
                            </div>
                        ) : (
                            <ScrollArea className="h-[280px] rounded-md border p-3">
                                <div className="space-y-2">
                                    {existingDates.map((date: string) => (
                                        <div
                                            key={date}
                                            className="flex items-center justify-between rounded-md border p-2 bg-muted/30"
                                        >
                                            <div className="flex items-center gap-2">
                                                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm">
                                                    {format(
                                                        new Date(date),
                                                        'EEE, dd MMM yyyy',
                                                    )}
                                                </span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-destructive hover:text-destructive"
                                                disabled={isRemoving}
                                                onClick={() =>
                                                    handleRemoveDate(date)
                                                }
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}

                        {data?.data?.reason && (
                            <div className="text-sm text-muted-foreground bg-muted/30 p-2 rounded-md">
                                <strong>Reason:</strong> {data.data.reason}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Close
                    </Button>
                    <Button
                        onClick={handleAddDates}
                        disabled={selectedDates.length === 0 || isAdding}
                    >
                        {isAdding ? 'Adding...' : 'Add Off Dates'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
