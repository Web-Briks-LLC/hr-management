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
import { IProductionStats, STAGE_LABELS } from '@/types/production.type';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    Legend,
} from 'recharts';
import { Layers, Flame, BarChart3, TrendingUp, Sparkles } from 'lucide-react';

interface ProductionStatsViewProps {
    stats?: IProductionStats;
    isLoading: boolean;
}

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
        fullName: STAGE_LABELS[st.stage] || st.stage,
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
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={shiftData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'hsl(var(--card))',
                                                borderColor: 'hsl(var(--border))',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                            }}
                                        />
                                        <Bar dataKey="images" name="Images Completed" fill="#4E12D4" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
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
                            Volume of images completed across Clipping Path, Masking, and Retouching stages.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {stageData.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-xs">
                                <Sparkles className="h-8 w-8 text-muted-foreground/40 mb-2" />
                                No stage breakdown data available yet.
                            </div>
                        ) : (
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'hsl(var(--card))',
                                                borderColor: 'hsl(var(--border))',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                            }}
                                        />
                                        <Bar dataKey="count" name="Images Processed" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
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
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4E12D4" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#4E12D4" stopOpacity={0.0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--card))',
                                            borderColor: 'hsl(var(--border))',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                        }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                    <Area
                                        type="monotone"
                                        dataKey="completed"
                                        name="Completed Images"
                                        stroke="#4E12D4"
                                        strokeWidth={2.5}
                                        fillOpacity={1}
                                        fill="url(#colorCompleted)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
