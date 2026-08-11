'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Clock,
    CalendarDays,
    MapPin,
    Mail,
    Phone,
    UserIcon,
} from 'lucide-react';
import { useSession } from '@/lib/auth-client';
import { format } from 'date-fns';
import { useGetMeQuery } from '@/redux/features/staff/staffApi';
import { Skeleton } from '@/components/ui/skeleton';
import StaffHeaderSkeleton from './staff-header-skeleton';
import { useGetMyShiftQuery } from '@/redux/features/shift/shiftApi';

export default function StaffHeader() {
    const { data: session, isPending } = useSession();
    const {
        data: staffData,
        isLoading: isStaffLoading,
        isFetching,
    } = useGetMeQuery({}, { skip: !session });
    const {
        data: myShiftData,
        isLoading: isMyShiftLoading,
        isFetching: isMyShiftFetching,
    } = useGetMyShiftQuery({}, { skip: !session });

    const [currentTime, setCurrentTime] = useState(new Date());

    const isLoading =
        isPending ||
        isStaffLoading ||
        isFetching ||
        isMyShiftLoading ||
        isMyShiftFetching;

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const hour = currentTime.getHours();
    const greeting =
        hour < 12
            ? 'Good Morning'
            : hour < 17
            ? 'Good Afternoon'
            : hour < 21
            ? 'Good Evening'
            : 'Good Night';

    if (isLoading) {
        return <StaffHeaderSkeleton />;
    }

    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex gap-4">
                        <Avatar className="h-20 w-20">
                            <AvatarImage
                                src={session?.user?.image as string}
                                alt={session?.user?.name}
                            />
                            <AvatarFallback className="text-lg">
                                {isLoading ? (
                                    <Skeleton className="h-full w-full" />
                                ) : (
                                    session?.user?.name?.charAt(0) ?? (
                                        <UserIcon className="size-5" />
                                    )
                                )}
                            </AvatarFallback>
                        </Avatar>

                        <div className="space-y-2">
                            <h2 className="text-sm font-medium text-muted-foreground">
                                {greeting} 👋
                            </h2>

                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold">
                                    {session?.user?.name || 'Employee Name'}
                                </h1>

                                <Badge
                                    variant={
                                        staffData?.staff?.status === 'active'
                                            ? 'default'
                                            : 'destructive'
                                    }
                                    className="capitalize"
                                >
                                    {staffData?.staff?.status ?? 'active'}
                                </Badge>
                            </div>

                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4" />
                                    <span>{session?.user?.email}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4" />
                                    <span>{staffData?.staff?.phone}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    <span>{staffData?.staff?.address}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4" />
                                    <span>
                                        Joined:{' '}
                                        {staffData?.staff?.joinDate &&
                                            format(
                                                staffData?.staff?.joinDate,
                                                'PPP'
                                            )}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="text-left xl:text-right">
                        <div className="text-sm text-muted-foreground mb-1 tracking-wide">
                            Current Time
                        </div>

                        <div className="flex items-center xl:justify-end gap-3">
                            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-md">
                                <Clock className="h-6 w-6" />
                            </div>

                            <div className="flex flex-col">
                                <span className="text-3xl font-bold text-white leading-none">
                                    {format(currentTime, 'hh:mm')}
                                </span>
                                <span className="text-sm uppercase tracking-widest text-muted-foreground">
                                    {format(currentTime, 'a')}
                                </span>
                            </div>
                        </div>

                        <div className="text-sm text-muted-foreground mt-2">
                            Shift:{' '}
                            {myShiftData?.shift
                                ? myShiftData.shift.shift.name
                                : 'No shift assigned'}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
