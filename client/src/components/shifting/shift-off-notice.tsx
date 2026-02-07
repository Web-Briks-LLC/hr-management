'use client';

import { useEffect, useState } from 'react';
import { CalendarOff, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    useGetMyShiftOffDatesQuery,
    useGetMyShiftQuery,
} from '@/redux/features/shift/shiftApi';
import { isToday } from 'date-fns';

const DISMISSED_KEY = 'shift-off-notice-dismissed';

export default function ShiftOffNotice() {
    const [dismissed, setDismissed] = useState(true);
    const { data: shiftData } = useGetMyShiftQuery({});
    const { data: offDatesData, isLoading } = useGetMyShiftOffDatesQuery({});

    const shiftName = shiftData?.data?.shift?.name || 'Your shift';
    const offDates = offDatesData?.data?.dates || [];
    const reason = offDatesData?.data?.reason;

    // Check if today is an off day
    const isTodayOff = offDates.some((d: string) => isToday(new Date(d)));

    // Check localStorage for today's dismissal
    useEffect(() => {
        if (!isTodayOff) {
            setDismissed(true);
            return;
        }

        const today = new Date().toDateString();
        const dismissedDate = localStorage.getItem(DISMISSED_KEY);

        if (dismissedDate === today) {
            setDismissed(true);
        } else {
            setDismissed(false);
        }
    }, [isTodayOff]);

    const handleDismiss = () => {
        const today = new Date().toDateString();
        localStorage.setItem(DISMISSED_KEY, today);
        setDismissed(true);
    };

    if (isLoading || !isTodayOff || dismissed) {
        return null;
    }

    return (
        <Alert
            variant="destructive"
            className="relative mb-4 border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-300"
        >
            <CalendarOff className="h-5 w-5" />
            <AlertTitle className="font-semibold">
                {shiftName} is Off Today
            </AlertTitle>
            <AlertDescription>
                {reason
                    ? `Reason: ${reason}`
                    : 'You are not required to check-in today. Enjoy your day off!'}
            </AlertDescription>
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 text-orange-700 dark:text-orange-300 hover:bg-orange-500/20"
                onClick={handleDismiss}
            >
                <X className="h-4 w-4" />
            </Button>
        </Alert>
    );
}
