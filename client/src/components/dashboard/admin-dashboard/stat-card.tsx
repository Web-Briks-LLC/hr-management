'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    description?: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

export function StatCard({
    title,
    value,
    icon: Icon,
    description,
    trend,
    variant = 'default',
}: StatCardProps) {
    const variantStyles = {
        default: 'border-border',
        primary: 'border-primary/20 bg-primary/5',
        success: 'border-green-500/20 bg-green-500/5',
        warning: 'border-yellow-500/20 bg-yellow-500/5',
        danger: 'border-red-500/20 bg-red-500/5',
    };

    const iconStyles = {
        default: 'text-muted-foreground',
        primary: 'text-primary',
        success: 'text-green-500',
        warning: 'text-yellow-500',
        danger: 'text-red-500',
    };

    return (
        <Card className={cn('transition-all hover:shadow-md', variantStyles[variant])}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className={cn('size-4', iconStyles[variant])} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {description && (
                    <p className="text-xs text-muted-foreground mt-1">
                        {description}
                    </p>
                )}
                {trend && (
                    <p
                        className={cn(
                            'text-xs mt-1 flex items-center gap-1',
                            trend.isPositive
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                        )}
                    >
                        <span>{trend.isPositive ? '↑' : '↓'}</span>
                        <span>{Math.abs(trend.value)}%</span>
                        <span className="text-muted-foreground">from last month</span>
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
