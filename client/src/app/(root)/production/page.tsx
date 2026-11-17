'use client';
import { Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useProductionAccess } from '@/hooks/use-production-access';
import {
    useGetProductionStatsQuery,
    useGetSanitizedOrdersQuery,
} from '@/redux/features/production/productionApi';
import { ProductionWorkstation } from '@/components/production/production-workstation';
import { ImageStatusGrid } from '@/components/production/image-status-grid';
import { FloorMonitor } from '@/components/production/floor-monitor';
import { StaffPerformanceAnalytics } from '@/components/production/staff-performance-analytics';
import { ProductionStatsView } from '@/components/production/production-stats-view';
import {
    Play,
    Layers,
    Users,
    ChartNoAxesCombined,
    Award,
    Image,
    ClipboardCheck,
    RotateCcw,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/admin-dashboard/stat-card';
function ProductionContent() {
    const access = useProductionAccess();
    const router = useRouter();
    const pathname = usePathname();
    const params = useSearchParams();
    const { data } = useGetSanitizedOrdersQuery(undefined, {
        skip: access.isLoading || access.isTelemarketer,
        pollingInterval: 20000,
    });
    const stats = useGetProductionStatsQuery({}, { skip: !access.isAdmin });
    const tabs = [
        { id: 'workstation', name: 'My work', icon: Play },
        { id: 'images', name: 'Orders & quality check', icon: Layers },
        ...(access.canDoQC
            ? [{ id: 'live_sessions', name: 'Team activity', icon: Users }]
            : []),
        ...(access.isAdmin
            ? [
                  { id: 'staff_analytics', name: 'People', icon: Award },
                  {
                      id: 'analytics',
                      name: 'Reports',
                      icon: ChartNoAxesCombined,
                  },
              ]
            : []),
    ];
    const selected = tabs.some((t) => t.id === params.get('tab'))
        ? params.get('tab')!
        : 'workstation';
    const orders = data?.data || [];
    if (access.isLoading) return <Skeleton className="h-96" />;
    if (access.isTelemarketer)
        return (
            <Card>
                <CardContent className="p-6">
                    Production access is available to the editing team and
                    supervisors.
                </CardContent>
            </Card>
        );
    return (
        <div className="mx-auto w-full min-w-0 max-w-7xl space-y-6 pb-10">
            <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                    <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                        <span className="size-2 rounded-full bg-emerald-500" />{' '}
                        Production
                    </div>
                    <h1 className="text-3xl font-semibold tracking-tight">
                        Good work, one image at a time.
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Take work, keep progress clear, and hand over with
                        confidence.
                    </p>
                </div>
                <Badge variant="outline" className="w-fit">
                    {orders.length} active orders
                </Badge>
            </header>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <StatCard
                    title="Being edited"
                    value={orders.reduce(
                        (total, order) =>
                            total + order.imageStats.inProgressCount,
                        0,
                    )}
                    icon={Image}
                    description="Images currently reserved by editors"
                    variant="primary"
                />
                <StatCard
                    title="Awaiting review"
                    value={orders.reduce(
                        (total, order) =>
                            total + order.imageStats.pendingQcCount,
                        0,
                    )}
                    icon={ClipboardCheck}
                    description="Submitted images ready for quality check"
                    variant="indigo"
                />
                <StatCard
                    title="Need revision"
                    value={orders.reduce(
                        (total, order) =>
                            total + order.imageStats.revisionCount,
                        0,
                    )}
                    icon={RotateCcw}
                    description="Images returned for corrections"
                    variant="warning"
                />
            </div>
            <Tabs
                value={selected}
                onValueChange={(value) => {
                    const next = new URLSearchParams(params);
                    next.set('tab', value);
                    router.replace(`${pathname}?${next}`);
                }}
            >
                <div className="mb-6 overflow-x-auto pb-1">
                    <TabsList className="h-auto w-max gap-1 p-1">
                        {tabs.map((tab) => (
                            <TabsTrigger
                                key={tab.id}
                                value={tab.id}
                                className="gap-2 px-4 py-2.5"
                            >
                                <tab.icon className="size-4" />
                                {tab.name}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>
                <TabsContent value="workstation">
                    <ProductionWorkstation />
                </TabsContent>
                <TabsContent value="images">
                    <ImageStatusGrid isAdmin={access.isAdmin} />
                </TabsContent>
                {access.canDoQC && (
                    <TabsContent value="live_sessions">
                        <FloorMonitor />
                    </TabsContent>
                )}
                {access.isAdmin && (
                    <>
                        <TabsContent value="staff_analytics">
                            <StaffPerformanceAnalytics />
                        </TabsContent>
                        <TabsContent value="analytics">
                            <ProductionStatsView
                                stats={stats.data?.data}
                                isLoading={stats.isLoading}
                            />
                        </TabsContent>
                    </>
                )}
            </Tabs>
        </div>
    );
}
export default function ProductionPage() {
    return (
        <Suspense fallback={<Skeleton className="h-96" />}>
            <ProductionContent />
        </Suspense>
    );
}
