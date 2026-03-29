'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Clock, UserCheck, Timer, Calendar, Users } from 'lucide-react';
import type { RecentActivity } from '@/types/dashboard.type';
import { formatDistanceToNow } from 'date-fns';

interface RecentActivitiesProps {
    activities: RecentActivity[];
}

const activityIcons = {
    attendance: UserCheck,
    overtime: Timer,
    shift: Calendar,
    staff: Users,
    leave: Clock,
};

const activityColors = {
    attendance: 'text-blue-500',
    overtime: 'text-purple-500',
    shift: 'text-green-500',
    staff: 'text-orange-500',
    leave: 'text-pink-500',
};

export function RecentActivities({ activities }: RecentActivitiesProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Activities</CardTitle>
                <CardDescription>Latest updates from your team</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {activities.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            No recent activities
                        </p>
                    ) : (
                        activities.map((activity) => {
                            const Icon = activityIcons[activity.type];
                            const iconColor = activityColors[activity.type];

                            // Safe handling of user name
                            const userName = activity.user?.name || 'Unknown User';
                            const initials = userName
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2);

                            return (
                                <div
                                    key={activity._id}
                                    className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0"
                                >
                                    <Avatar className="size-9">
                                        <AvatarFallback className="text-xs">
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Icon className={`size-4 ${iconColor}`} />
                                            <Badge variant="outline" className="text-xs">
                                                {activity.type}
                                            </Badge>
                                        </div>
                                        <p className="text-sm font-medium">
                                            {activity.description}
                                        </p>
                                        <p 
                                            className="text-xs text-muted-foreground"
                                            suppressHydrationWarning
                                        >
                                            {formatDistanceToNow(new Date(activity.timestamp), {
                                                addSuffix: true,
                                            })}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

