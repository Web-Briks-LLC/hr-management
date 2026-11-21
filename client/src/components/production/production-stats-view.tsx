'use client';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { IProductionStats, STAGE_LABELS } from '@/types/production.type';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
    ChartNoAxesCombined,
    Clock,
    Flame,
    Image as ImageIcon,
    Layers,
    Sparkles,
    TrendingUp,
} from 'lucide-react';
import { StatTile } from '@/components/production/stat-tile';

interface ProductionStatsViewProps {
    stats?: IProductionStats;
    isLoading: boolean;
}

const config = (label: string, color: string): ChartConfig => ({
    value: { label, color },
});

function NoData({ text }: { text: string }) {
    return (
        <div className="flex h-64 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-8 w-8 text-muted-foreground/40" />
            {text}
        </div>
    );
}

export function ProductionStatsView({ stats, isLoading }: ProductionStatsViewProps) {
    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {[0, 1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-32 rounded-2xl" />
                    ))}
                </div>
                <Skeleton className="h-96 w-full rounded-2xl" />
            </div>
        );
    }

    const summary = stats?.summary;
    const daily = stats?.dailyTrend || [];
    const shifts = (stats?.shiftComparison || []).map((s) => ({
        name: s.shiftName,
        value: s.imagesCompleted,
    }));
    const stages = (stats?.stageBreakdown || []).map((s) => ({
        name: STAGE_LABELS[s.stage] || s.stage,
        value: s.completedImages,
    }));

    const bar = (data: { name: string; value: number }[], color: string, label: string, empty: string) =>
        data.length === 0 ? (
            <NoData text={empty} />
        ) : (
            <ChartContainer config={config(label, color)} className="h-[300px] w-full">
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} className="text-xs" />
                    <YAxis tickLine={false} axisLine={false} className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="var(--color-value)" radius={[6, 6, 0, 0]} />
                </BarChart>
            </ChartContainer>
        );

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatTile label="Images done" value={(summary?.totalImages ?? 0).toLocaleString()} hint="All shift logs" icon={ImageIcon} tone="green" />
                <StatTile label="Done today" value={(summary?.todayImages ?? 0).toLocaleString()} hint="Logged since midnight" icon={Clock} tone="blue" />
                <StatTile label="Active orders" value={summary?.activeOrders ?? 0} hint="Still in production" icon={Layers} tone="slate" />
                <StatTile label="In revision" value={summary?.activeRevisions ?? 0} hint="Sent back for fixes" icon={Flame} tone="orange" />
            </div>

            <Card className="border-border/60 shadow-md">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <ChartNoAxesCombined className="h-5 w-5 text-primary" />
                        Production trends
                    </CardTitle>
                    <CardDescription className="mt-1">
                        How much work was finished over time, by shift and by
                        service. Based on the shift logs.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="daily">
                        <TabsList className="mb-4 h-auto gap-1 p-1">
                            <TabsTrigger value="daily" className="gap-2 px-4 py-2">
                                <TrendingUp className="size-4" /> Day by day
                            </TabsTrigger>
                            <TabsTrigger value="shift" className="gap-2 px-4 py-2">
                                <Flame className="size-4" /> By shift
                            </TabsTrigger>
                            <TabsTrigger value="service" className="gap-2 px-4 py-2">
                                <Layers className="size-4" /> By service
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="daily" className="m-0">
                            {daily.length === 0 ? (
                                <NoData text="No daily records yet." />
                            ) : (
                                <ChartContainer config={config('Images finished', 'hsl(142, 76%, 36%)')} className="h-[320px] w-full">
                                    <AreaChart data={daily}>
                                        <defs>
                                            <linearGradient id="fillDaily" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                                        <XAxis dataKey="date" tickLine={false} axisLine={false} className="text-xs" />
                                        <YAxis tickLine={false} axisLine={false} className="text-xs" />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Area type="monotone" dataKey="completed" name="value" stroke="var(--color-value)" fill="url(#fillDaily)" strokeWidth={2} />
                                    </AreaChart>
                                </ChartContainer>
                            )}
                        </TabsContent>
                        <TabsContent value="shift" className="m-0">
                            {bar(shifts, 'hsl(var(--primary))', 'Images finished', 'No shift records yet.')}
                        </TabsContent>
                        <TabsContent value="service" className="m-0">
                            {bar(stages, 'hsl(262, 83%, 58%)', 'Images finished', 'No service records yet.')}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
