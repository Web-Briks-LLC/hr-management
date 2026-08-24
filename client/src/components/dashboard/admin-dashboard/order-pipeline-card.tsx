'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { OrderDashboardStats } from '@/types/dashboard.type';
import {
    Package,
    ArrowRight,
    Flame,
    Clock,
    CheckCircle2,
    RotateCcw,
    Send,
    Eye,
    Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface OrderPipelineCardProps {
    data?: OrderDashboardStats;
}

const STAGE_CONFIGS: Record<
    string,
    {
        label: string;
        icon: React.ComponentType<{ className?: string }>;
        bg: string;
        text: string;
        border: string;
        indicator: string;
    }
> = {
    pending: {
        label: 'Pending Queue',
        icon: Clock,
        bg: 'bg-amber-500/[0.08] hover:bg-amber-500/[0.12]',
        text: 'text-amber-600 dark:text-amber-400',
        border: 'border-amber-500/20',
        indicator: 'bg-amber-500',
    },
    in_progress: {
        label: 'In Production',
        icon: Sparkles,
        bg: 'bg-blue-500/[0.08] hover:bg-blue-500/[0.12]',
        text: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-500/20',
        indicator: 'bg-blue-500',
    },
    quality_check: {
        label: 'Quality Check',
        icon: Eye,
        bg: 'bg-purple-500/[0.08] hover:bg-purple-500/[0.12]',
        text: 'text-purple-600 dark:text-purple-400',
        border: 'border-purple-500/20',
        indicator: 'bg-purple-500',
    },
    revision: {
        label: 'Client Revision',
        icon: RotateCcw,
        bg: 'bg-rose-500/[0.08] hover:bg-rose-500/[0.12]',
        text: 'text-rose-600 dark:text-rose-400',
        border: 'border-rose-500/20',
        indicator: 'bg-rose-500',
    },
    completed: {
        label: 'Completed',
        icon: CheckCircle2,
        bg: 'bg-emerald-500/[0.08] hover:bg-emerald-500/[0.12]',
        text: 'text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-500/20',
        indicator: 'bg-emerald-500',
    },
    delivered: {
        label: 'Delivered',
        icon: Send,
        bg: 'bg-teal-500/[0.08] hover:bg-teal-500/[0.12]',
        text: 'text-teal-600 dark:text-teal-400',
        border: 'border-teal-500/20',
        indicator: 'bg-teal-500',
    },
};

export function OrderPipelineCard({ data }: OrderPipelineCardProps) {
    const totalActiveOrders = (data?.inProgress || 0) + (data?.pending || 0);
    const totalImages = data?.totalImagesThisMonth || 0;
    const urgentList = data?.urgentOrdersList || [];

    // Map counts by status
    const statusMap = React.useMemo(() => {
        const map: Record<string, number> = {
            pending: 0,
            in_progress: 0,
            quality_check: 0,
            revision: 0,
            completed: 0,
            delivered: 0,
        };
        data?.statusBreakdown?.forEach((item) => {
            if (item.status in map) {
                map[item.status] = item.count;
            }
        });
        return map;
    }, [data]);

    const totalOrdersTracked = Object.values(statusMap).reduce((a, b) => a + b, 0) || 1;

    return (
        <Card className="flex flex-col border-border/60 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            <Package className="size-4" />
                        </div>
                        <CardTitle className="text-base font-semibold">
                            Production & Order Pipeline
                        </CardTitle>
                    </div>
                    <CardDescription className="text-xs mt-1">
                        Live stages & active workload monitoring
                    </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[11px] font-mono border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/5">
                        {totalActiveOrders} Active
                    </Badge>
                    <Link href="/orders">
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                            Orders <ArrowRight className="size-3" />
                        </Button>
                    </Link>
                </div>
            </CardHeader>

            <CardContent className="pt-4 flex-1 space-y-4 flex flex-col justify-between">
                {/* 3x2 Modern Stage Grid Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {Object.entries(STAGE_CONFIGS).map(([statusKey, config]) => {
                        const count = statusMap[statusKey] || 0;
                        const percent = Math.round((count / totalOrdersTracked) * 100);
                        const Icon = config.icon;

                        return (
                            <div
                                key={statusKey}
                                className={cn(
                                    'p-3 rounded-lg border transition-all duration-200 flex flex-col justify-between space-y-2',
                                    config.bg,
                                    config.border
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-medium text-muted-foreground truncate">
                                        {config.label}
                                    </span>
                                    <Icon className={cn('size-3.5 shrink-0', config.text)} />
                                </div>

                                <div className="flex items-baseline justify-between">
                                    <span className={cn('text-xl font-bold font-mono tracking-tight', config.text)}>
                                        {count}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                        {percent}%
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Multi-segment Pipeline Distribution Meter */}
                <div className="space-y-1.5 p-3 rounded-lg bg-muted/40 border border-border/50">
                    <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground flex items-center gap-1.5">
                            <Sparkles className="size-3 text-primary" />
                            Active Month Volume
                        </span>
                        <span className="font-mono text-muted-foreground">
                            <strong className="text-foreground">{totalImages.toLocaleString()}</strong> images processed
                        </span>
                    </div>

                    <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden flex gap-0.5 p-0.5">
                        {Object.entries(STAGE_CONFIGS).map(([statusKey, config]) => {
                            const count = statusMap[statusKey] || 0;
                            if (count === 0) return null;
                            const flexGrow = count;

                            return (
                                <motion.div
                                    key={`segment-${statusKey}`}
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: 1 }}
                                    transition={{ duration: 0.5 }}
                                    className={cn('h-full rounded-xs first:rounded-l-full last:rounded-r-full', config.indicator)}
                                    style={{ flex: flexGrow }}
                                    title={`${config.label}: ${count}`}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Urgent Orders Priority Feed */}
                <div className="pt-2 border-t space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                            <Flame className="size-3.5" />
                            Urgent Dispatch Attention ({urgentList.length})
                        </span>
                        {urgentList.length > 0 ? (
                            <Badge variant="destructive" className="text-[10px] h-4.5 px-1.5 animate-pulse">
                                Requires Action
                            </Badge>
                        ) : (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                                <CheckCircle2 className="size-3" /> All on schedule
                            </span>
                        )}
                    </div>

                    {urgentList.length > 0 ? (
                        <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                            {urgentList.map((order) => (
                                <Link
                                    key={order._id}
                                    href="/orders"
                                    className="flex items-center justify-between p-2 rounded-md bg-rose-500/[0.04] border border-rose-500/15 hover:border-rose-500/40 hover:bg-rose-500/[0.08] transition-all text-xs group"
                                >
                                    <div className="truncate mr-2">
                                        <p className="font-medium text-foreground truncate group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                                            {order.orderName}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {order.clientName} • {order.imageQuantity} images
                                        </p>
                                    </div>
                                    {order.deadline && (
                                        <Badge variant="outline" className="text-[10px] font-mono border-rose-500/30 text-rose-600 dark:text-rose-400 shrink-0">
                                            {formatDistanceToNow(new Date(order.deadline), { addSuffix: true })}
                                        </Badge>
                                    )}
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground text-center py-2 italic bg-muted/20 rounded-md">
                            No critical deadline warnings at this time.
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
