'use client';

import * as React from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type DatePickerProps = {
    label?: string;
    value: Date | undefined;
    onChange: (date: Date | undefined) => void;
    placeholder?: string;
    disabled?: boolean;
    minDate?: Date;
    maxDate?: Date;
    className?: string;
};

export function DatePicker({
    label,
    value,
    onChange,
    placeholder = 'Select date',
    disabled = false,
    minDate,
    maxDate,
    className,
}: DatePickerProps) {
    const [open, setOpen] = React.useState(false);

    return (
        <div className={`flex flex-col gap-2 ${className ?? ''}`}>
            {label && <Label className="px-1">{label}</Label>}

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        disabled={disabled}
                        className={cn('justify-between font-normal')}
                    >
                        {value ? format(value, 'PPP') : placeholder}
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
                        onSelect={(date) => {
                            onChange(date);
                            setOpen(false);
                        }}
                        captionLayout="dropdown"
                        fromDate={minDate}
                        toDate={maxDate}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
}
