'use client';

import * as React from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type DateTimePickerProps = {
    label?: string;
    value: Date | undefined;
    onChange: (date: Date | undefined) => void;
    placeholder?: string;
    disabled?: boolean;
    minDate?: Date;
    maxDate?: Date;
    className?: string;
};

export function DateTimePicker({
    label,
    value,
    onChange,
    placeholder = 'Select date and time',
    disabled = false,
    minDate,
    maxDate,
    className,
}: DateTimePickerProps) {
    const [open, setOpen] = React.useState(false);
    const [time, setTime] = React.useState(
        value ? format(value, 'HH:mm') : '12:00'
    );

    const handleDateSelect = (selectedDate: Date | undefined) => {
        if (selectedDate) {
            const [hours, minutes] = time.split(':').map(Number);
            selectedDate.setHours(hours, minutes, 0, 0);
            onChange(selectedDate);
        } else {
            onChange(undefined);
        }
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = e.target.value;
        setTime(newTime);
        if (value) {
            const [hours, minutes] = newTime.split(':').map(Number);
            const newDate = new Date(value);
            newDate.setHours(hours, minutes, 0, 0);
            onChange(newDate);
        }
    };

    return (
        <div className={`flex flex-col gap-2 ${className ?? ''}`}>
            {label && <Label className="px-1">{label}</Label>}

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        disabled={disabled}
                        className={cn('justify-between font-normal w-full')}
                    >
                        {value
                            ? format(value, 'PPP h:mm a')
                            : placeholder}
                        <ChevronDownIcon className="h-4 w-4 opacity-60" />
                    </Button>
                </PopoverTrigger>

                <PopoverContent
                    className="w-auto overflow-hidden p-0"
                    align="start"
                >
                    <Calendar
                        mode="single"
                        selected={value}
                        onSelect={handleDateSelect}
                        captionLayout="dropdown"
                        fromDate={minDate}
                        toDate={maxDate}
                        initialFocus
                    />
                    <div className="border-t p-3">
                        <Label className="text-sm text-muted-foreground mb-2 block">
                            Time
                        </Label>
                        <Input
                            type="time"
                            value={time}
                            onChange={handleTimeChange}
                            className="w-full"
                        />
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
