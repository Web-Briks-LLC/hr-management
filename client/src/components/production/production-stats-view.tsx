'use client';

import React from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { IProductionStats, STAGE_LABELS } from '@/types/production.type';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    AreaChart,
    Area,
} from 'recharts';
import { Layers, Flame, TrendingUp, Sparkles } from 'lucide-react';

interface ProductionStatsViewProps {
    stats?: IProductionStats;
    isLoading: boolean;
}

const shiftChartConfig: ChartConfig = {
    images: {
        label: 'Images Completed',
        color: 'hsl(var(--primary))',
    },
};

const stageChartConfig: ChartConfig = {
    count: {
        label: 'Images Processed',
        color: 'hsl(262, 83%, 58%)',
    },
};

const trendChartConfig: ChartConfig = {
    completed: {
        label: 'Completed Images',
        color: 'hsl(142, 76%, 36%)',
    },
};

export function ProductionStatsView({ stats, isLoading }: ProductionStatsViewProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Skeleton className="h-80 w-full rounded-2xl" />
                <Skeleton className="h-80 w-full rounded-2xl" />
                <Skeleton className="h-80 w-full rounded-2xl lg:col-span-2" />
            </div>
        );
    }

    const shiftData = (stats?.shiftComparison || []).map((s) => ({
        name: s.shiftName,
        images: s.imagesCompleted,
        logs: s.logsCount,
    }));

    const stageData = (stats?.stageBreakdown || []).map((st) => ({
        name: STAGE_LABELS[st.stage] || st.stage,
        count: st.completedImages,
    }));

    const dailyData = stats?.dailyTrend || [];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Shift Productivity Comparison */}
                <Card className="border-border/60 shadow-xs">
                    <CardHeader>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Flame className="h-4 w-4 text-primary" /> Shift Output Comparison
                        </CardTitle>
                        <CardDescription>
                            Total completed images processed by each shift (Morning, Evening, Night).
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {shiftData.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-xs">
                                <Sparkles className="h-8 w-8 text-muted-foreground/40 mb-2" />
                                No shift comparison data available yet.
                            </div>
                        ) : (
                            <ChartContainer config={shiftChartConfig} className="h-[280px] w-full">
                                <BarChart data={shiftData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                                    <XAxis
                                        dataKey="name"
                                        tickLine={false}
                                        axisLine={false}
                                        className="text-xs"
                                    />
                                    <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        className="text-xs"
                                    />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar
                                        dataKey="images"
                                        fill="var(--color-images)"
                                        radius={[6, 6, 0, 0]}
                                    />
                                </BarChart>
                            </ChartContainer>
                        )}
                    </CardContent>
                </Card>

                {/* 2. Service / Stage Distribution */}
                <Card className="border-border/60 shadow-xs">
                    <CardHeader>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Layers className="h-4 w-4 text-purple-600 dark:text-purple-400" /> Stage-Wise Output Volume
                        </CardTitle>
                        <CardDescription>
                            Volume of images completed across Clipping Path, Masking, Retouching, and Ghost Mannequin stages.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {stageData.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-xs">
                                <Sparkles className="h-8 w-8 text-muted-foreground/40 mb-2" />
                                No stage breakdown data available yet.
                            </div>
                        ) : (
                            <ChartContainer config={stageChartConfig} className="h-[280px] w-full">
                                <BarChart data={stageData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                                    <XAxis
                                        dataKey="name"
                                        tickLine={false}
                                        axisLine={false}
                                        className="text-xs"
                                    />
                                    <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        className="text-xs"
                                    />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar
                                        dataKey="count"
                                        fill="var(--color-count)"
                                        radius={[6, 6, 0, 0]}
                                    />
                                </BarChart>
                            </ChartContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* 3. Daily Completion Output Trend */}
            <Card className="border-border/60 shadow-xs">
                <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Daily Production Output Trend
                    </CardTitle>
                    <CardDescription>
                        Daily volume of edited images delivered across all active shifts over time.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {dailyData.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-xs">
                            <Sparkles className="h-8 w-8 text-muted-foreground/40 mb-2" />
                            No daily trend records found.
                        </div>
                    ) : (
                        <ChartContainer config={trendChartConfig} className="h-[300px] w-full">
                            <AreaChart data={dailyData}>
                                <defs>
                                    <linearGradient id="fillCompleted" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--color-completed)" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="var(--color-completed)" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                    className="text-xs"
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    className="text-xs"
                                />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <ChartLegend content={<ChartLegendContent />} />
                                <Area
                                    type="monotone"
                                    dataKey="completed"
                                    stroke="var(--color-completed)"
                                    fill="url(#fillCompleted)"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ChartContainer>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
