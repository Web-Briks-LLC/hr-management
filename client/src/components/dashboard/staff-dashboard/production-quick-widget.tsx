'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    useGetActiveSessionQuery,
    useGetStaffPerformanceAnalyticsQuery,
} from '@/redux/features/production/productionApi';
import {
    Play,
    Clock,
    ArrowRight,
    UploadCloud,
} from 'lucide-react';
import type IStaff from '@/types/staff.type';

interface ProductionQuickWidgetProps {
    staff?: IStaff;
}

export function ProductionQuickWidget({ staff }: ProductionQuickWidgetProps) {
    const { data: activeSessionData } = useGetActiveSessionQuery();
    const { data: analyticsData } = useGetStaffPerformanceAnalyticsQuery({ filterType: 'today' });

    const activeSession = activeSessionData?.data;
    const todaySummary = analyticsData?.data?.summary;

    // If telemarketer, do not render
    if (staff?.designation?.toLowerCase()?.includes('telemarketer')) {
        return null;
    }

    if (activeSession) {
        const orderName =
            typeof activeSession.orderId === 'object' && activeSession.orderId !== null
                ? (activeSession.orderId as { orderName?: string }).orderName || 'Active Order'
                : 'Active Order';

        return (
            <Card className="border-2 border-emerald-500/40 bg-linear-to-r from-emerald-500/10 via-emerald-500/5 to-card shadow-lg shadow-emerald-500/5">
                <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                            <Clock className="h-6 w-6 animate-spin duration-3000" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                </span>
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                    Active Editing Session
                                </span>
                            </div>
                            <h4 className="text-base font-bold text-foreground mt-0.5">
                                Order: {orderName}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                                {activeSession.imageCount} image(s) locked in this batch
                            </p>
                        </div>
                    </div>

                    <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md">
                        <Link href="/production">
                            Open Workstation
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    // Default widget banner for production staff
    return (
        <Card className="border-border/60 bg-linear-to-r from-primary/10 via-primary/5 to-card shadow-xs">
            <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-primary/15 text-primary">
                        <UploadCloud className="h-6 w-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
                                PHOTO EDITING WORKSTATION
                            </Badge>
                            {todaySummary?.totalImages ? (
                                <span className="text-xs text-muted-foreground font-mono">
                                    Today&apos;s Done: <strong className="text-foreground">{todaySummary.totalImages} imgs</strong>
                                </span>
                            ) : null}
                        </div>
                        <h4 className="text-base font-bold text-foreground mt-1">
                            Production Workstation
                        </h4>
                        <p className="text-xs text-muted-foreground">
                            Select an order, drag &amp; drop images, and start your live work session timer.
                        </p>
                    </div>
                </div>

                <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md shrink-0">
                    <Link href="/production">
                        <Play className="h-4 w-4 fill-current" />
                        Launch Workstation
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}
