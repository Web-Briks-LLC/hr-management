'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useSession } from '@/lib/auth-client';
import { Role } from '@/constants/role';
import { useGetMeQuery } from '@/redux/features/staff/staffApi';
import {
    useGetProductionStatsQuery,
    useGetSanitizedOrdersQuery,
    useGetProductionLogsQuery,
} from '@/redux/features/production/productionApi';
import { ProductionWorkstation } from '@/components/production/production-workstation';
import { ImageStatusGrid } from '@/components/production/image-status-grid';
import { StaffPerformanceAnalytics } from '@/components/production/staff-performance-analytics';
import { ProductionStatsView } from '@/components/production/production-stats-view';
import { useSocket } from '@/contexts/SocketContext';
import {
    Layers,
    Play,
    FileImage,
    Award,
    BarChart3,
    ShieldAlert,
    RefreshCw,
    Sparkles,
} from 'lucide-react';

function ProductionContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const { data: session, isPending: isSessionLoading } = useSession();
    const { data: meData, isLoading: isMeLoading } = useGetMeQuery({});
    const { socket } = useSocket();

    const userRole = session?.user?.role as Role | undefined;
    const staff = meData?.staff;
    const isTelemarketer = staff?.designation?.toLowerCase() === 'telemarketer';

    const isAdmin = [Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER].includes(
        userRole as Role
    );

    // Queries
    const {
        data: statsData,
        isLoading: isStatsLoading,
        refetch: refetchStats,
    } = useGetProductionStatsQuery({}, { skip: !isAdmin });
    const { refetch: refetchOrders } = useGetSanitizedOrdersQuery();
    const { refetch: refetchLogs } = useGetProductionLogsQuery();

    // Read active tab from URL query params (default to 'workstation')
    const rawTab = searchParams.get('tab') || 'workstation';

    // If non-admin attempts to access admin tabs, fallback to 'workstation'
    const activeTab = !isAdmin && ['staff_analytics', 'analytics'].includes(rawTab)
        ? 'workstation'
        : rawTab;

    const handleTabChange = (newTab: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', newTab);
        router.replace(`${pathname}?${params.toString()}`);
    };

    const handleRefreshAll = () => {
        refetchOrders();
        refetchLogs();
        if (isAdmin) refetchStats();
        toast.success('Production floor synced');
    };

    if (isSessionLoading || isMeLoading) {
        return (
            <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
                <Skeleton className="h-10 w-64 rounded-xl" />
                <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
        );
    }

    if (isTelemarketer) {
        return (
            <div className="p-4 sm:p-6 max-w-3xl mx-auto">
                <Card className="border-destructive/30 bg-destructive/5 text-center p-8">
                    <CardHeader className="flex flex-col items-center gap-3">
                        <div className="p-4 rounded-full bg-destructive/10 text-destructive">
                            <ShieldAlert className="h-10 w-10" />
                        </div>
                        <CardTitle className="text-xl font-bold text-destructive">
                            Access Restricted
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground max-w-md mx-auto">
                        <p>
                            Production floor workstation is only accessible to photo editors, graphic designers, team leaders, and operations managers.
                        </p>
                        <Button
                            variant="outline"
                            onClick={() => router.push('/dashboard')}
                            className="mt-2 text-xs"
                        >
                            Return to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
                        <Sparkles className="h-7 w-7 text-primary" />
                        Production Floor Workspace
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        Live photo editing workstation, image-level tracking matrix, and order quality management.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshAll}
                        className="h-9 text-xs font-semibold gap-1.5"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Sync Floor
                    </Button>
                </div>
            </div>

            {/* Main Tabs Navigation */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
                <div className="border-b border-border/60 pb-3">
                    <TabsList className="flex flex-wrap w-full md:w-auto h-auto p-1 bg-muted/60 rounded-xl gap-1">
                        <TabsTrigger
                            value="workstation"
                            className="text-xs font-bold gap-1.5 rounded-lg data-[state=active]:shadow-xs py-2 px-3.5"
                        >
                            <Play className="h-3.5 w-3.5 fill-current" />
                            Workstation
                        </TabsTrigger>

                        <TabsTrigger
                            value="images"
                            className="text-xs font-bold gap-1.5 rounded-lg data-[state=active]:shadow-xs py-2 px-3.5"
                        >
                            <FileImage className="h-3.5 w-3.5" />
                            Image Tracking
                        </TabsTrigger>

                        {/* Admin & HR Manager Exclusive Tabs */}
                        {isAdmin && (
                            <>
                                <TabsTrigger
                                    value="staff_analytics"
                                    className="text-xs font-bold gap-1.5 rounded-lg data-[state=active]:shadow-xs py-2 px-3.5"
                                >
                                    <Award className="h-3.5 w-3.5 text-primary" />
                                    Staff Leaderboard
                                </TabsTrigger>

                                <TabsTrigger
                                    value="analytics"
                                    className="text-xs font-bold gap-1.5 rounded-lg data-[state=active]:shadow-xs py-2 px-3.5"
                                >
                                    <BarChart3 className="h-3.5 w-3.5" />
                                    Overview Stats
                                </TabsTrigger>
                            </>
                        )}
                    </TabsList>
                </div>

                {/* TAB 1: Live Photo Editing Workstation */}
                <TabsContent value="workstation" className="space-y-6 focus-visible:outline-hidden">
                    <ProductionWorkstation />
                </TabsContent>

                {/* TAB 2: Unified Orders & Image-Level Tracking Hub */}
                <TabsContent value="images" className="space-y-6 focus-visible:outline-hidden">
                    <ImageStatusGrid isAdmin={isAdmin} />
                </TabsContent>

                {/* TAB 3: Staff Performance Analytics (Admin/HR Only) */}
                {isAdmin && (
                    <TabsContent value="staff_analytics" className="space-y-6 focus-visible:outline-hidden">
                        <StaffPerformanceAnalytics />
                    </TabsContent>
                )}

                {/* TAB 4: Production Overview Analytics (Admin/HR Only) */}
                {isAdmin && (
                    <TabsContent value="analytics" className="space-y-6 focus-visible:outline-hidden">
                        <ProductionStatsView
                            stats={statsData?.data}
                            isLoading={isStatsLoading}
                        />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}

export default function ProductionPage() {
    return (
        <Suspense
            fallback={
                <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
                    <Skeleton className="h-10 w-64 rounded-xl" />
                    <Skeleton className="h-64 w-full rounded-2xl" />
                </div>
            }
        >
            <ProductionContent />
        </Suspense>
    );
}
