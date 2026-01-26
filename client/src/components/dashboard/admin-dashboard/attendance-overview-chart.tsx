'use client';

import * as React from 'react';
import { Label, Pie, PieChart } from 'recharts';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import type { AttendanceOverview } from '@/types/dashboard.type';

interface AttendanceOverviewChartProps {
    data: AttendanceOverview;
}

const chartConfig = {
    visitors: {
        label: 'Staff',
    },
    present: {
        label: 'Present',
        color: 'hsl(var(--chart-1))',
    },
    late: {
        label: 'Late',
        color: 'hsl(var(--chart-2))',
    },
    absent: {
        label: 'Absent',
        color: 'hsl(var(--chart-3))',
    },
    onLeave: {
        label: 'On Leave',
        color: 'hsl(var(--chart-4))',
    },
} satisfies ChartConfig;

export function AttendanceOverviewChart({
    data,
}: AttendanceOverviewChartProps) {
    const chartData = React.useMemo(() => {
        return [
            {
                browser: 'present',
                visitors: data.present,
                fill: 'var(--color-present)',
            },
            { browser: 'late', visitors: data.late, fill: 'var(--color-late)' },
            {
                browser: 'absent',
                visitors: data.absent,
                fill: 'var(--color-absent)',
            },
            {
                browser: 'onLeave',
                visitors: data.onLeave,
                fill: 'var(--color-onLeave)',
            },
        ].filter((item) => item.visitors > 0);
    }, [data]);

    const totalVisitors = React.useMemo(() => {
        return chartData.reduce((acc, curr) => acc + curr.visitors, 0);
    }, [chartData]);

    return (
        <Card className="flex flex-col">
            <CardHeader className="items-center pb-0">
                <CardTitle>Attendance Distribution</CardTitle>
                <CardDescription>Today's Overview</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
                <ChartContainer
                    config={chartConfig}
                    className="mx-auto aspect-square max-h-[250px]"
                >
                    <PieChart>
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />}
                        />
                        <Pie
                            data={chartData}
                            dataKey="visitors"
                            nameKey="browser"
                            innerRadius={60}
                            strokeWidth={5}
                        >
                            <Label
                                content={({ viewBox }) => {
                                    if (
                                        viewBox &&
                                        'cx' in viewBox &&
                                        'cy' in viewBox
                                    ) {
                                        return (
                                            <text
                                                x={viewBox.cx}
                                                y={viewBox.cy}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                            >
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={viewBox.cy}
                                                    className="fill-foreground text-3xl font-bold"
                                                >
                                                    {totalVisitors.toLocaleString()}
                                                </tspan>
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={(viewBox.cy || 0) + 24}
                                                    className="fill-muted-foreground text-sm"
                                                >
                                                    Total Staff
                                                </tspan>
                                            </text>
                                        );
                                    }
                                }}
                            />
                        </Pie>
                    </PieChart>
                </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col gap-2 text-sm">
                <div className="flex items-center gap-2 font-medium leading-none">
                    Attendance Rate: {data.presentPercentage.toFixed(1)}%
                </div>
                <div className="leading-none text-muted-foreground">
                    Showing total staff distribution for today
                </div>
            </CardFooter>
        </Card>
    );
}
