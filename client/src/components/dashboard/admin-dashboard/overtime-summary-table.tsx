'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { OvertimeSummary } from '@/types/dashboard.type';

interface OvertimeSummaryTableProps {
    data: OvertimeSummary;
}

export function OvertimeSummaryTable({ data }: OvertimeSummaryTableProps) {
    const summaryItems = [
        {
            label: 'Pending',
            value: data.pending,
            variant: 'secondary' as const,
        },
        {
            label: 'Approved',
            value: data.approved,
            variant: 'default' as const,
        },
        {
            label: 'Rejected',
            value: data.rejected,
            variant: 'destructive' as const,
        },
        {
            label: 'Completed',
            value: data.completed,
            variant: 'default' as const,
        },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Overtime Summary</CardTitle>
                <CardDescription>
                    Total: {data.total} requests | {data.totalHours.toFixed(1)} hours
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {summaryItems.map((item) => (
                        <div
                            key={item.label}
                            className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                        >
                            <div className="flex items-center gap-2">
                                <Badge variant={item.variant}>{item.label}</Badge>
                            </div>
                            <div className="text-2xl font-bold">{item.value}</div>
                        </div>
                    ))}
                    <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Total Hours</span>
                            <span className="text-xl font-bold text-primary">
                                {data.totalHours.toFixed(1)}h
                            </span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
