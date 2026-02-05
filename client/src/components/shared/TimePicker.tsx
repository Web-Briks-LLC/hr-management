import * as React from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface TimePickerProps {
    value?: string; // Format "HH:mm"
    onChange: (value: string) => void;
    className?: string;
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
    const [hours, minutes] = value ? value.split(':') : ['12', '00'];

    const handleHourChange = (newHour: string) => {
        onChange(`${newHour}:${minutes}`);
    };

    const handleMinuteChange = (newMinute: string) => {
        onChange(`${hours}:${newMinute}`);
    };

    const generateHours = () => {
        return Array.from({ length: 24 }, (_, i) =>
            i.toString().padStart(2, '0'),
        );
    };

    const generateMinutes = () => {
        return Array.from({ length: 60 }, (_, i) =>
            i.toString().padStart(2, '0'),
        );
    };

    return (
        <div className={`flex items-end gap-2 ${className}`}>
            <div className="grid gap-1 text-center">
                <Label htmlFor="hours" className="text-xs">
                    Hours
                </Label>
                <Select value={hours} onValueChange={handleHourChange}>
                    <SelectTrigger id="hours" className="w-[70px]">
                        <SelectValue placeholder="HH" />
                    </SelectTrigger>
                    <SelectContent className="h-[200px]">
                        {generateHours().map((hour) => (
                            <SelectItem key={hour} value={hour}>
                                {hour}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <span className="mb-2 text-xl font-bold">:</span>
            <div className="grid gap-1 text-center">
                <Label htmlFor="minutes" className="text-xs">
                    Minutes
                </Label>
                <Select value={minutes} onValueChange={handleMinuteChange}>
                    <SelectTrigger id="minutes" className="w-[70px]">
                        <SelectValue placeholder="MM" />
                    </SelectTrigger>
                    <SelectContent className="h-[200px]">
                        {generateMinutes().map((minute) => (
                            <SelectItem key={minute} value={minute}>
                                {minute}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
