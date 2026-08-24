'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { UserCheck, Timer, Calendar, Package, Activity, FileText, LucideIcon } from 'lucide-react';
import type { RecentActivity } from '@/types/dashboard.type';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';

interface RecentActivitiesProps {
    activities: RecentActivity[];
}

const activityIcons: Record<string, LucideIcon> = {
    attendance: UserCheck,
    overtime: Timer,
    shift: Calendar,
    staff: Package,
    leave: FileText,
};

const activityColors: Record<string, { icon: string; badge: string }> = {
    attendance: {
        icon: 'text-blue-500 bg-blue-500/10',
        badge: 'border-blue-500/20 text-blue-600 dark:text-blue-400 bg-blue-500/5',
    },
    overtime: {
        icon: 'text-purple-500 bg-purple-500/10',
        badge: 'border-purple-500/20 text-purple-600 dark:text-purple-400 bg-purple-500/5',
    },
    shift: {
        icon: 'text-green-500 bg-green-500/10',
        badge: 'border-green-500/20 text-green-600 dark:text-green-400 bg-green-500/5',
    },
    staff: {
        icon: 'text-amber-500 bg-amber-500/10',
        badge: 'border-amber-500/20 text-amber-600 dark:text-amber-400 bg-amber-500/5',
    },
    leave: {
        icon: 'text-rose-500 bg-rose-500/10',
        badge: 'border-rose-500/20 text-rose-600 dark:text-rose-400 bg-rose-500/5',
    },
};

export function RecentActivities({ activities }: RecentActivitiesProps) {
    return (
        <Card className="border-border/60 shadow-xs">
            <CardHeader className="pb-3 border-b">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                        <Activity className="size-4" />
                    </div>
                    <div>
                        <CardTitle className="text-base font-semibold">Live Activity & Audit Feed</CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                            Real-time operations, attendance, orders & employee actions
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-4">
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {!activities || activities.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-8">
                            No recent activities recorded today
                        </p>
                    ) : (
                        activities.map((activity, index) => {
                            const IconComponent = activityIcons[activity.type] || Activity;
                            const colors = activityColors[activity.type] || {
                                icon: 'text-muted-foreground bg-muted',
                                badge: 'border-border text-muted-foreground',
                            };

                            const userName = activity.user?.name || 'System';
                            const initials = userName
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2);

                            return (
                                <motion.div
                                    key={activity._id || index}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2, delay: index * 0.03 }}
                                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors border border-transparent hover:border-border/40"
                                >
                                    <Avatar className="size-8 shrink-0 mt-0.5">
                                        <AvatarFallback className="text-[11px] font-semibold bg-muted text-muted-foreground">
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5 truncate">
                                                <span className="text-xs font-semibold text-foreground truncate">
                                                    {userName}
                                                </span>
                                                <Badge
                                                    variant="outline"
                                                    className={`text-[10px] uppercase font-medium px-1.5 py-0 h-4.5 ${colors.badge}`}
                                                >
                                                    {activity.type}
                                                </Badge>
                                            </div>
                                            <span
                                                className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0"
                                                suppressHydrationWarning
                                            >
                                                {formatDistanceToNow(new Date(activity.timestamp), {
                                                    addSuffix: true,
                                                })}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className={`p-1 rounded-sm shrink-0 ${colors.icon}`}>
                                                <IconComponent className="size-3" />
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-2">
                                                {activity.description}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
