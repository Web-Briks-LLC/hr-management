'use client';

import { format } from 'date-fns';
import type { ITimelineEntry } from '@/types/order.type';
import { ORDER_STATUS_LABELS } from '@/types/order.type';
import {
    Clock,
    CheckCircle,
    AlertCircle,
    Loader,
    XCircle,
    PackageCheck,
    RotateCcw,
    ClipboardCheck,
} from 'lucide-react';

interface OrderTimelineProps {
    timeline: ITimelineEntry[];
}

const statusIcons: Record<string, React.ReactNode> = {
    pending: <Clock className="h-4 w-4 text-yellow-500" />,
    in_progress: <Loader className="h-4 w-4 text-blue-500" />,
    quality_check: <ClipboardCheck className="h-4 w-4 text-purple-500" />,
    revision: <RotateCcw className="h-4 w-4 text-orange-500" />,
    completed: <CheckCircle className="h-4 w-4 text-green-500" />,
    delivered: <PackageCheck className="h-4 w-4 text-emerald-500" />,
    cancelled: <XCircle className="h-4 w-4 text-red-500" />,
};

const statusColors: Record<string, string> = {
    pending: 'border-yellow-500 bg-yellow-500/20',
    in_progress: 'border-blue-500 bg-blue-500/20',
    quality_check: 'border-purple-500 bg-purple-500/20',
    revision: 'border-orange-500 bg-orange-500/20',
    completed: 'border-green-500 bg-green-500/20',
    delivered: 'border-emerald-500 bg-emerald-500/20',
    cancelled: 'border-red-500 bg-red-500/20',
};

export function OrderTimeline({ timeline }: OrderTimelineProps) {
    // Sort timeline by timestamp descending (newest first)
    const sortedTimeline = [...timeline].sort(
        (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return (
        <div className="space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground">
                Order Timeline
            </h4>
            <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />

                <div className="space-y-4">
                    {sortedTimeline.map((entry, index) => (
                        <div key={index} className="relative flex gap-3">
                            {/* Icon */}
                            <div
                                className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 ${statusColors[entry.status]}`}
                            >
                                {statusIcons[entry.status] || (
                                    <AlertCircle className="h-4 w-4 text-gray-500" />
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 pt-0.5">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-sm">
                                        {ORDER_STATUS_LABELS[entry.status] ||
                                            entry.status}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {format(
                                            new Date(entry.timestamp),
                                            'MMM d, yyyy h:mm a',
                                        )}
                                    </span>
                                </div>
                                {entry.note && (
                                    <p className="text-sm text-muted-foreground mt-0.5">
                                        {entry.note}
                                    </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                    by Admin
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
