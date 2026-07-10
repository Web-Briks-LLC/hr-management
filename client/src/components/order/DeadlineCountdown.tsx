'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface DeadlineCountdownProps {
    deadline: string;
    status: string;
    className?: string;
}

export function DeadlineCountdown({
    deadline,
    status,
    className,
}: DeadlineCountdownProps) {
    const [timeRemaining, setTimeRemaining] = useState<string>('');
    const [colorClass, setColorClass] = useState<string>('');

    useEffect(() => {
        const calculateTimeRemaining = () => {
            const now = new Date();
            const deadlineDate = new Date(deadline);
            const diff = deadlineDate.getTime() - now.getTime();

            // If order is completed, delivered, or cancelled, don't show countdown
            if (['completed', 'delivered', 'cancelled'].includes(status)) {
                setTimeRemaining('—');
                setColorClass('text-muted-foreground');
                return;
            }

            if (diff < 0) {
                // Overdue
                const overdueDiff = Math.abs(diff);
                const days = Math.floor(overdueDiff / (1000 * 60 * 60 * 24));
                const hours = Math.floor(
                    (overdueDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
                );

                if (days > 0) {
                    setTimeRemaining(`-${days}d ${hours}h`);
                } else {
                    setTimeRemaining(`-${hours}h`);
                }
                setColorClass('text-red-600 font-semibold');
            } else {
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor(
                    (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
                );
                const minutes = Math.floor(
                    (diff % (1000 * 60 * 60)) / (1000 * 60)
                );

                // Calculate time string
                if (days > 0) {
                    setTimeRemaining(`${days}d ${hours}h`);
                } else if (hours > 0) {
                    setTimeRemaining(`${hours}h ${minutes}m`);
                } else {
                    setTimeRemaining(`${minutes}m`);
                }

                // Set color based on time remaining
                const hoursRemaining = diff / (1000 * 60 * 60);
                if (hoursRemaining > 24) {
                    // More than 24 hours - green
                    setColorClass('text-green-600');
                } else if (hoursRemaining > 12) {
                    // 12-24 hours - yellow
                    setColorClass('text-yellow-600 font-medium');
                } else if (hoursRemaining > 0) {
                    // Less than 12 hours - orange
                    setColorClass('text-orange-600 font-semibold');
                }
            }
        };

        calculateTimeRemaining();

        // Update every minute
        const interval = setInterval(calculateTimeRemaining, 60000);

        return () => clearInterval(interval);
    }, [deadline, status]);

    return (
        <span className={cn('text-sm tabular-nums', colorClass, className)}>
            {timeRemaining}
        </span>
    );
}
