'use client';

import * as React from 'react';
import { Pie, PieChart, Cell } from 'recharts';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import type { AttendanceOverview } from '@/types/dashboard.type';
import { UserCheck, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface AttendanceOverviewChartProps {
    data: AttendanceOverview;
}

const attendanceChartConfig = {
    present: {
        label: 'Present',
        color: 'hsl(142.1 76.2% 36.3%)', // emerald
    },
    late: {
        label: 'Late',
        color: 'hsl(37.7 92.1% 50.2%)', // amber
    },
    onLeave: {
        label: 'On Leave',
        color: 'hsl(238.7 83.5% 66.7%)', // indigo
    },
    absent: {
        label: 'Absent',
        color: 'hsl(346.8 77.2% 49.8%)', // rose
    },
} satisfies ChartConfig;

export function AttendanceOverviewChart({
    data,
}: AttendanceOverviewChartProps) {
    const chartData = React.useMemo(() => {
        return [
            {
                status: 'present',
                name: 'Present',
                value: data?.present || 0,
                fill: 'var(--color-present)',
            },
            {
                status: 'late',
                name: 'Late',
                value: data?.late || 0,
                fill: 'var(--color-late)',
            },
            {
                status: 'onLeave',
                name: 'On Leave',
                value: data?.onLeave || 0,
                fill: 'var(--color-onLeave)',
            },
            {
                status: 'absent',
                name: 'Absent',
                value: data?.absent || 0,
                fill: 'var(--color-absent)',
            },
        ].filter((item) => item.value > 0);
    }, [data]);

    return (
        <Card className="flex flex-col border-border/60 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <UserCheck className="size-4" />
                        </div>
                        <CardTitle className="text-base font-semibold">
                            Today&apos;s Attendance
                        </CardTitle>
                    </div>
                    <CardDescription className="text-xs mt-1">
                        Real-time workforce presence & leave distribution
                    </CardDescription>
                </div>

                <Link href="/attendance">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                        Live Sheet <ArrowRight className="size-3" />
                    </Button>
                </Link>
            </CardHeader>

            <CardContent className="pt-4 flex-1 flex flex-col justify-between">
                <div className="h-[210px] w-full relative flex items-center justify-center">
                    <ChartContainer
                        config={attendanceChartConfig}
                        className="mx-auto aspect-square max-h-[210px] w-full"
                    >
                        <PieChart>
                            <ChartTooltip
                                cursor={false}
                                content={
                                    <ChartTooltipContent
                                        hideLabel
                                        formatter={(value, name) => (
                                            <div className="flex items-center justify-between gap-3 w-full">
                                                <span className="text-muted-foreground">{name}:</span>
                                                <span className="font-mono font-medium text-foreground">
                                                    {Number(value)} staff
                                                </span>
                                            </div>
                                        )}
                                    />
                                }
                            />
                            <Pie
                                data={chartData.length > 0 ? chartData : [{ status: 'none', name: 'No Records', value: 1, fill: '#e2e8f0' }]}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={58}
                                outerRadius={82}
                                paddingAngle={3}
                                stroke="none"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ChartContainer>

                    {/* Centered Percentage Stat */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-bold font-mono tracking-tight text-foreground">
                            {data?.presentPercentage ? data.presentPercentage.toFixed(0) : 0}%
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground uppercase">
                            Present
                        </span>
                    </div>
                </div>

                {/* Status Badges Grid */}
                <div className="grid grid-cols-4 gap-1.5 pt-3 border-t">
                    <div className="text-center p-1.5 rounded-md bg-emerald-500/[0.06] border border-emerald-500/10">
                        <span className="text-[10px] text-muted-foreground block font-medium">Present</span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                            {data?.present || 0}
                        </span>
                    </div>
                    <div className="text-center p-1.5 rounded-md bg-amber-500/[0.06] border border-amber-500/10">
                        <span className="text-[10px] text-muted-foreground block font-medium">Late</span>
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">
                            {data?.late || 0}
                        </span>
                    </div>
                    <div className="text-center p-1.5 rounded-md bg-indigo-500/[0.06] border border-indigo-500/10">
                        <span className="text-[10px] text-muted-foreground block font-medium">On Leave</span>
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                            {data?.onLeave || 0}
                        </span>
                    </div>
                    <div className="text-center p-1.5 rounded-md bg-rose-500/[0.06] border border-rose-500/10">
                        <span className="text-[10px] text-muted-foreground block font-medium">Absent</span>
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400 font-mono">
                            {data?.absent || 0}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
