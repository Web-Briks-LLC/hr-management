'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { AnimatedCounter } from './animated-counter';
import Link from 'next/link';

interface StatCardProps {
    title: string;
    value: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
    icon: LucideIcon;
    description?: string;
    trend?: {
        value: number;
        isPositive: boolean;
        label?: string;
    };
    badge?: string;
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'indigo' | 'purple' | 'cyan';
    href?: string;
}

export function StatCard({
    title,
    value,
    prefix = '',
    suffix = '',
    decimals = 0,
    icon: Icon,
    description,
    trend,
    badge,
    variant = 'default',
    href,
}: StatCardProps) {
    const variantStyles = {
        default: {
            card: 'border-border/60 bg-card hover:border-border',
            iconBg: 'bg-muted text-muted-foreground',
            glow: 'from-muted/20 to-transparent',
        },
        primary: {
            card: 'border-primary/20 bg-gradient-to-br from-primary/[0.04] to-background hover:border-primary/40',
            iconBg: 'bg-primary/10 text-primary',
            glow: 'from-primary/10 to-transparent',
        },
        success: {
            card: 'border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.04] to-background hover:border-emerald-500/40',
            iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
            glow: 'from-emerald-500/10 to-transparent',
        },
        warning: {
            card: 'border-amber-500/20 bg-gradient-to-br from-amber-500/[0.04] to-background hover:border-amber-500/40',
            iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
            glow: 'from-amber-500/10 to-transparent',
        },
        danger: {
            card: 'border-rose-500/20 bg-gradient-to-br from-rose-500/[0.04] to-background hover:border-rose-500/40',
            iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
            glow: 'from-rose-500/10 to-transparent',
        },
        indigo: {
            card: 'border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.04] to-background hover:border-indigo-500/40',
            iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
            glow: 'from-indigo-500/10 to-transparent',
        },
        purple: {
            card: 'border-purple-500/20 bg-gradient-to-br from-purple-500/[0.04] to-background hover:border-purple-500/40',
            iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
            glow: 'from-purple-500/10 to-transparent',
        },
        cyan: {
            card: 'border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.04] to-background hover:border-cyan-500/40',
            iconBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
            glow: 'from-cyan-500/10 to-transparent',
        },
    };

    const style = variantStyles[variant] || variantStyles.default;

    const cardContent = (
        <Card className={cn(
            'relative overflow-hidden transition-all duration-300 shadow-xs hover:shadow-md group',
            style.card
        )}>
            {/* Ambient Corner Glow */}
            <div className={cn(
                'absolute -top-10 -right-10 w-28 h-28 bg-gradient-to-br rounded-full blur-2xl pointer-events-none opacity-50 group-hover:opacity-80 transition-opacity',
                style.glow
            )} />

            <CardContent className="p-5">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
                        {title}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                        {badge && (
                            <Badge variant="secondary" className="text-[10px] font-medium px-1.5 py-0 h-5">
                                {badge}
                            </Badge>
                        )}
                        <div className={cn('p-2 rounded-lg transition-transform duration-200 group-hover:scale-110', style.iconBg)}>
                            <Icon className="size-4.5 stroke-[2.2]" />
                        </div>
                    </div>
                </div>

                <div className="mt-3">
                    <div className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground font-mono">
                        <AnimatedCounter
                            value={value}
                            prefix={prefix}
                            suffix={suffix}
                            decimals={decimals}
                        />
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs">
                        {description && (
                            <p className="text-muted-foreground truncate font-normal">
                                {description}
                            </p>
                        )}
                        {trend && (
                            <span
                                className={cn(
                                    'inline-flex items-center gap-0.5 font-medium ml-auto shrink-0',
                                    trend.isPositive
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-rose-600 dark:text-rose-400'
                                )}
                            >
                                <span>{trend.isPositive ? '↑' : '↓'}</span>
                                <span>{Math.abs(trend.value)}%</span>
                                {trend.label && (
                                    <span className="text-muted-foreground font-normal ml-1">
                                        {trend.label}
                                    </span>
                                )}
                            </span>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    if (href) {
        return (
            <motion.div
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
            >
                <Link href={href} className="block cursor-pointer focus:outline-hidden">
                    {cardContent}
                </Link>
            </motion.div>
        );
    }

    return (
        <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
        >
            {cardContent}
        </motion.div>
    );
}
