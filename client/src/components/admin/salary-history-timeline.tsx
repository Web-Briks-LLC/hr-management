'use client';

import { useEffect, useState } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Loader, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format } from 'date-fns';

interface SalaryHistoryProps {
    staffId: string;
}

export default function SalaryHistoryTimeline({ staffId }: SalaryHistoryProps) {
    const [history, setHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (staffId) {
            fetchHistory();
        }
    }, [staffId]);

    const fetchHistory = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(
                `/api/analytics/salary-history/${staffId}`,
                {
                    credentials: 'include',
                },
            );
            const data = await response.json();
            if (data.success) {
                setHistory(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch salary history:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const getChangeIcon = (previous: number, current: number) => {
        if (current > previous) {
            return <TrendingUp className="h-4 w-4 text-green-500" />;
        } else if (current < previous) {
            return <TrendingDown className="h-4 w-4 text-red-500" />;
        }
        return <Minus className="h-4 w-4 text-gray-500" />;
    };

    const getChangePercentage = (previous: number, current: number) => {
        if (previous === 0) return 0;
        return (((current - previous) / previous) * 100).toFixed(1);
    };

    const getChangeColor = (previous: number, current: number) => {
        if (current > previous) return 'text-green-600 dark:text-green-400';
        if (current < previous) return 'text-red-600 dark:text-red-400';
        return 'text-gray-600 dark:text-gray-400';
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-10">
                    <Loader className="h-8 w-8 animate-spin" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Salary History</CardTitle>
                <CardDescription>Timeline of salary changes</CardDescription>
            </CardHeader>
            <CardContent>
                {history.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                        No salary history available
                    </p>
                ) : (
                    <div className="relative">
                        {/* Timeline Line */}
                        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />

                        {/* Timeline Items */}
                        <div className="space-y-6">
                            {history.map((item, index) => (
                                <div
                                    key={item._id}
                                    className="relative flex gap-4"
                                >
                                    {/* Timeline Dot */}
                                    <div className="relative z-10 flex items-center justify-center w-16 h-16 rounded-full bg-background border-2 border-primary">
                                        {getChangeIcon(
                                            item.previousSalary,
                                            item.newSalary,
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 pb-8">
                                        <div className="bg-muted rounded-lg p-4">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <p className="text-sm text-muted-foreground">
                                                        {format(
                                                            new Date(
                                                                item.effectiveDate ||
                                                                    item.createdAt,
                                                            ),
                                                            'MMM dd, yyyy',
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {format(
                                                            new Date(
                                                                item.createdAt,
                                                            ),
                                                            'HH:mm:ss',
                                                        )}
                                                    </p>
                                                </div>
                                                <span
                                                    className={`text-sm font-medium ${getChangeColor(item.previousSalary, item.newSalary)}`}
                                                >
                                                    {item.newSalary >
                                                    item.previousSalary
                                                        ? '+'
                                                        : ''}
                                                    {getChangePercentage(
                                                        item.previousSalary,
                                                        item.newSalary,
                                                    )}
                                                    %
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 mt-3">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">
                                                        Previous Salary
                                                    </p>
                                                    <p className="text-lg font-semibold">
                                                        ৳
                                                        {item.previousSalary.toLocaleString()}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">
                                                        New Salary
                                                    </p>
                                                    <p className="text-lg font-semibold">
                                                        ৳
                                                        {item.newSalary.toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>

                                            {item.reason && (
                                                <div className="mt-3 pt-3 border-t">
                                                    <p className="text-xs text-muted-foreground">
                                                        Reason
                                                    </p>
                                                    <p className="text-sm mt-1">
                                                        {item.reason}
                                                    </p>
                                                </div>
                                            )}

                                            <div className="mt-3 pt-3 border-t">
                                                <p className="text-xs text-muted-foreground">
                                                    Changed by:{' '}
                                                    <span className="font-mono">
                                                        {item.changedBy}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
