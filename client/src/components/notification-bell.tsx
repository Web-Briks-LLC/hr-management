"use client"

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    useGetNotificationsQuery,
    useGetUnreadCountQuery,
    useMarkAsReadMutation,
    useMarkAllAsReadMutation,
    useDeleteNotificationMutation,
} from '@/redux/features/notification/notificationApi';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Notification {
    _id: string;
    title: string;
    message: string;
    type: 'overtime' | 'leave' | 'attendance' | 'shift' | 'announcement';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    isRead: boolean;
    createdAt: string;
    actionUrl?: string;
    actionLabel?: string;
}

const NotificationItem = ({ notification }: { notification: Notification }) => {
    const [markAsRead] = useMarkAsReadMutation();
    const [deleteNotification] = useDeleteNotificationMutation();

    const handleMarkAsRead = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!notification.isRead) {
            await markAsRead(notification._id);
        }
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await deleteNotification(notification._id);
    };

    const handleClick = async () => {
        if (!notification.isRead) {
            await markAsRead(notification._id);
        }
        if (notification.actionUrl) {
            window.location.href = notification.actionUrl;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'overtime': return 'text-orange-600';
            case 'shift': return 'text-blue-600';
            case 'leave': return 'text-green-600';
            case 'attendance': return 'text-purple-600';
            case 'announcement': return 'text-gray-600';
            default: return 'text-gray-600';
        }
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'urgent': return <Badge variant="destructive" className="text-xs">Urgent</Badge>;
            case 'high': return <Badge variant="secondary" className="text-xs">High</Badge>;
            default: return null;
        }
    };

    return (
        <div
            onClick={handleClick}
            className={cn(
                "p-3 hover:bg-accent cursor-pointer transition-colors border-b last:border-0",
                !notification.isRead && "bg-blue-50 dark:bg-blue-950/20"
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className={cn(
                            "text-sm font-semibold truncate",
                            getTypeColor(notification.type)
                        )}>
                            {notification.title}
                        </h4>
                        {getPriorityBadge(notification.priority)}
                        {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full" />
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">
                            {format(new Date(notification.createdAt), 'MMM dd, hh:mm aa')}
                        </span>
                        {notification.actionLabel && (
                            <span className="text-xs text-blue-600 font-medium">
                                {notification.actionLabel} →
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {!notification.isRead && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={handleMarkAsRead}
                        >
                            <Check className="h-4 w-4" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={handleDelete}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    const { data: countData } = useGetUnreadCountQuery(undefined, {
        pollingInterval: 30000, // Poll every 30 seconds
    });

    const { data: notifications, isLoading, isFetching } = useGetNotificationsQuery(
        { limit: 20, skip: (page - 1) * 20 },
        { skip: !open, refetchOnMountOrArgChange: true }
    );

    const [markAllAsRead] = useMarkAllAsReadMutation();

    // Update notifications when new data arrives
    useEffect(() => {
        if (notifications) {
            if (page === 1) {
                setAllNotifications(notifications);
            } else {
                setAllNotifications(prev => {
                    const newNotifs = notifications.filter(
                        (n: Notification) => !prev.find(p => p._id === n._id)
                    );
                    return [...prev, ...newNotifs];
                });
            }
            setHasMore(notifications.length === 20);
        }
    }, [notifications, page]);

    // Reset when popover opens
    useEffect(() => {
        if (open) {
            setPage(1);
            setHasMore(true);
        }
    }, [open]);

    // Infinite scroll observer
    const loadMore = useCallback(() => {
        if (!isFetching && hasMore) {
            setPage(prev => prev + 1);
        }
    }, [isFetching, hasMore]);

    useEffect(() => {
        if (observerRef.current) {
            observerRef.current.disconnect();
        }

        observerRef.current = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    loadMore();
                }
            },
            { threshold: 0.1 }
        );

        if (loadMoreRef.current) {
            observerRef.current.observe(loadMoreRef.current);
        }

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [loadMore]);

    const handleMarkAllAsRead = async () => {
        await markAllAsRead({});
    };

    const unreadCount = countData?.count || 0;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                        >
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0" align="end">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-semibold text-lg">Notifications</h3>
                    <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleMarkAllAsRead}
                                className="text-xs"
                            >
                                Mark all read
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setOpen(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <ScrollArea className="h-[500px]" ref={scrollRef}>
                    {isLoading && page === 1 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            Loading notifications...
                        </div>
                    ) : allNotifications.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No notifications yet</p>
                        </div>
                    ) : (
                        <>
                            {allNotifications.map((notification) => (
                                <NotificationItem
                                    key={notification._id}
                                    notification={notification}
                                />
                            ))}
                            {hasMore && (
                                <div ref={loadMoreRef} className="p-4 text-center">
                                    {isFetching ? (
                                        <span className="text-sm text-muted-foreground">
                                            Loading more...
                                        </span>
                                    ) : (
                                        <span className="text-sm text-muted-foreground">
                                            Scroll for more
                                        </span>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
