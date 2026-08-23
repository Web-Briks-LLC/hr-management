'use client';

import React, { Suspense, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useProductionAccess } from '@/hooks/use-production-access';
import {
    useGetProductionStatsQuery,
    useGetSanitizedOrdersQuery,
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
    CheckCircle2,
    Clock,
    AlertTriangle,
    Sparkles,
} from 'lucide-react';

function ProductionContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const { isAdmin, isTelemarketer, isLoading: isAccessLoading } = useProductionAccess();
    const { socket } = useSocket();

    // Queries
    const {
        data: statsData,
        isLoading: isStatsLoading,
    } = useGetProductionStatsQuery({}, { skip: !isAdmin });
    const { data: ordersData, isLoading: isOrdersLoading } = useGetSanitizedOrdersQuery();

    const orders = ordersData?.data || [];

    // Aggregates for top stats overview
    const statsSummary = useMemo(() => {
        let totalTarget = 0;
        let totalCompleted = 0;
        let totalRevisions = 0;
        let totalActive = 0;

        orders.forEach((o) => {
            totalTarget += o.imageQuantity || 0;
            const stats = o.imageStats;
            if (stats) {
                totalCompleted += stats.completedCount || 0;
                totalRevisions += stats.revisionCount || 0;
                totalActive += stats.inProgressCount || 0;
            }
        });

        return {
            totalOrders: orders.length,
            totalTarget,
            totalCompleted,
            totalRevisions,
            totalActive,
        };
    }, [orders]);

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

    if (isAccessLoading) {
        return (
            <div className="space-y-8 p-1">
                <Skeleton className="h-10 w-64 rounded-xl" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-32 rounded-2xl" />
                    ))}
                </div>
                <Skeleton className="h-96 w-full rounded-2xl" />
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
        <div className="space-y-8 p-1">
            {/* Header & Stats Overview (Matching Orders/Earnings Design System) */}
            <div className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text">
                            Production Floor
                        </h2>
                        <p className="text-muted-foreground mt-1">
                            Live editing workstation, image-level tracking matrix, and order quality assurance.
                        </p>
                    </div>
                </div>

                {/* 4 Hero Stats Cards with Gradient Glows */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Active Orders Card */}
                    <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-blue-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-500/30">
                        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-blue-500/10 blur-2xl transition-all duration-300 group-hover:bg-blue-500/20" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-500/20">
                                    <Layers className="h-5 w-5" />
                                </div>
                                <Badge variant="outline" className="text-[10px] font-medium opacity-70">
                                    Orders
                                </Badge>
                            </div>
                            <h3 className="text-3xl font-bold tracking-tight text-foreground">
                                {isOrdersLoading ? <Skeleton className="h-8 w-16" /> : statsSummary.totalOrders}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-blue-500/10 font-medium">
                                Active Production Orders
                            </p>
                        </div>
                    </div>

                    {/* Images in Pipeline */}
                    <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-purple-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/5 hover:border-purple-500/30">
                        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-purple-500/10 blur-2xl transition-all duration-300 group-hover:bg-purple-500/20" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-purple-500/20">
                                    <FileImage className="h-5 w-5" />
                                </div>
                                <Badge variant="outline" className="text-[10px] font-medium opacity-70">
                                    Pipeline
                                </Badge>
                            </div>
                            <h3 className="text-3xl font-bold tracking-tight text-foreground">
                                {isOrdersLoading ? <Skeleton className="h-8 w-16" /> : statsSummary.totalTarget.toLocaleString()}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-purple-500/10 font-medium">
                                Total Target Images
                            </p>
                        </div>
                    </div>

                    {/* Completed Images */}
                    <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-emerald-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/5 hover:border-emerald-500/30">
                        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-emerald-500/10 blur-2xl transition-all duration-300 group-hover:bg-emerald-500/20" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-emerald-500/20">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                                <Badge variant="outline" className="text-[10px] font-medium bg-emerald-500/5 text-emerald-500 border-emerald-500/20">
                                    Done
                                </Badge>
                            </div>
                            <h3 className="text-3xl font-bold tracking-tight text-foreground">
                                {isOrdersLoading ? <Skeleton className="h-8 w-16" /> : statsSummary.totalCompleted.toLocaleString()}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-emerald-500/10 font-medium">
                                Images Completed
                            </p>
                        </div>
                    </div>

                    {/* Active Revisions */}
                    <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-rose-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-rose-500/5 hover:border-rose-500/30">
                        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-rose-500/10 blur-2xl transition-all duration-300 group-hover:bg-rose-500/20" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-rose-500/20">
                                    <AlertTriangle className="h-5 w-5" />
                                </div>
                                <Badge variant="outline" className="text-[10px] font-medium bg-rose-500/5 text-rose-500 border-rose-500/20">
                                    Revisions
                                </Badge>
                            </div>
                            <h3 className="text-3xl font-bold tracking-tight text-foreground">
                                {isOrdersLoading ? <Skeleton className="h-8 w-16" /> : statsSummary.totalRevisions}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-rose-500/10 font-medium">
                                Images in Revision
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Workspace Card */}
            <Card className="border-border/60 shadow-md">
                <CardHeader className="pb-4 border-b border-border/60">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                <Layers className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-bold">
                                    Production Workspace
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Unified operations floor for photo editors, QC reviews, and tracking.
                                </CardDescription>
                            </div>
                        </div>

                        {/* Tabs Bar inside Card Header */}
                        <Tabs value={activeTab} onValueChange={handleTabChange}>
                            <TabsList className="bg-muted/60 p-1 rounded-xl">
                                <TabsTrigger
                                    value="workstation"
                                    className="text-xs font-bold gap-1.5 rounded-lg data-[state=active]:shadow-xs py-1.5 px-3"
                                >
                                    <Play className="h-3.5 w-3.5 fill-current" />
                                    Workstation
                                </TabsTrigger>

                                <TabsTrigger
                                    value="images"
                                    className="text-xs font-bold gap-1.5 rounded-lg data-[state=active]:shadow-xs py-1.5 px-3"
                                >
                                    <FileImage className="h-3.5 w-3.5" />
                                    Image Tracking
                                </TabsTrigger>

                                {isAdmin && (
                                    <>
                                        <TabsTrigger
                                            value="staff_analytics"
                                            className="text-xs font-bold gap-1.5 rounded-lg data-[state=active]:shadow-xs py-1.5 px-3"
                                        >
                                            <Award className="h-3.5 w-3.5 text-primary" />
                                            Staff Leaderboard
                                        </TabsTrigger>

                                        <TabsTrigger
                                            value="analytics"
                                            className="text-xs font-bold gap-1.5 rounded-lg data-[state=active]:shadow-xs py-1.5 px-3"
                                        >
                                            <BarChart3 className="h-3.5 w-3.5" />
                                            Overview Stats
                                        </TabsTrigger>
                                    </>
                                )}
                            </TabsList>
                        </Tabs>
                    </div>
                </CardHeader>

                <CardContent className="p-6">
                    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
                        {/* TAB 1: Live Photo Editing Workstation */}
                        <TabsContent value="workstation" className="space-y-6 focus-visible:outline-hidden mt-0">
                            <ProductionWorkstation />
                        </TabsContent>

                        {/* TAB 2: Unified Orders & Image-Level Tracking Hub */}
                        <TabsContent value="images" className="space-y-6 focus-visible:outline-hidden mt-0">
                            <ImageStatusGrid isAdmin={isAdmin} />
                        </TabsContent>

                        {/* TAB 3: Staff Performance Analytics (Admin/HR Only) */}
                        {isAdmin && (
                            <TabsContent value="staff_analytics" className="space-y-6 focus-visible:outline-hidden mt-0">
                                <StaffPerformanceAnalytics />
                            </TabsContent>
                        )}

                        {/* TAB 4: Production Overview Analytics (Admin/HR Only) */}
                        {isAdmin && (
                            <TabsContent value="analytics" className="space-y-6 focus-visible:outline-hidden mt-0">
                                <ProductionStatsView
                                    stats={statsData?.data}
                                    isLoading={isStatsLoading}
                                />
                            </TabsContent>
                        )}
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}

export default function ProductionPage() {
    return (
        <Suspense
            fallback={
                <div className="space-y-8 p-1">
                    <Skeleton className="h-10 w-64 rounded-xl" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <Skeleton key={i} className="h-32 rounded-2xl" />
                        ))}
                    </div>
                    <Skeleton className="h-96 w-full rounded-2xl" />
                </div>
            }
        >
            <ProductionContent />
        </Suspense>
    );
}
