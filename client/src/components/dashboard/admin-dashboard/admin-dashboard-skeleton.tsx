'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function AdminDashboardSkeleton() {
    return (
        <div className="space-y-6 pb-8">
            {/* Header Skeleton */}
            <div className="p-5 rounded-xl border border-border/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-7 w-64" />
                    <Skeleton className="h-4 w-40" />
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-20" />
                </div>
            </div>

            {/* Top 4 Core KPI Skeleton */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={`kpi-${i}`} className="p-5">
                        <div className="flex items-center justify-between pb-3">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="size-8 rounded-lg" />
                        </div>
                        <Skeleton className="h-8 w-36 mb-2" />
                        <Skeleton className="h-3 w-48" />
                    </Card>
                ))}
            </div>

            {/* Secondary 4 Mini Pills Skeleton */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={`mini-${i}`} className="p-4">
                        <div className="flex items-center justify-between pb-2">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="size-6 rounded-md" />
                        </div>
                        <Skeleton className="h-6 w-28 mb-1.5" />
                        <Skeleton className="h-3 w-36" />
                    </Card>
                ))}
            </div>

            {/* Main Visualizations Grid Skeleton */}
            <div className="grid gap-4 lg:grid-cols-12">
                <Card className="lg:col-span-7">
                    <CardHeader className="pb-3 border-b">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-3 w-64 mt-1" />
                    </CardHeader>
                    <CardContent className="pt-4">
                        <Skeleton className="h-[280px] w-full rounded-lg" />
                        <div className="grid grid-cols-3 gap-2 pt-3 border-t mt-3">
                            <Skeleton className="h-12 w-full rounded-md" />
                            <Skeleton className="h-12 w-full rounded-md" />
                            <Skeleton className="h-12 w-full rounded-md" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-5">
                    <CardHeader className="pb-3 border-b">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-3 w-52 mt-1" />
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                        {/* 3x2 Grid Skeleton */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Skeleton key={`stage-skel-${i}`} className="h-16 w-full rounded-lg" />
                            ))}
                        </div>
                        <Skeleton className="h-12 w-full rounded-lg" />
                        <Skeleton className="h-16 w-full rounded-lg" />
                    </CardContent>
                </Card>
            </div>

            {/* Secondary Attendance & Overtime Row Skeleton */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
                <Card className="lg:col-span-6">
                    <CardHeader className="pb-3 border-b">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-3 w-48 mt-1" />
                    </CardHeader>
                    <CardContent className="pt-4 flex flex-col items-center">
                        <Skeleton className="size-44 rounded-full mb-4" />
                        <div className="grid grid-cols-4 gap-2 w-full">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-6">
                    <CardHeader className="pb-3 border-b">
                        <Skeleton className="h-5 w-36" />
                        <Skeleton className="h-3 w-44 mt-1" />
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                        <Skeleton className="h-10 w-full rounded-md" />
                        <Skeleton className="h-10 w-full rounded-md" />
                        <Skeleton className="h-10 w-full rounded-md" />
                        <Skeleton className="h-14 w-full rounded-md mt-2" />
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Row Skeleton */}
            <div className="grid gap-4 lg:grid-cols-12">
                <Card className="lg:col-span-5">
                    <CardHeader className="pb-3 border-b">
                        <Skeleton className="h-5 w-44" />
                        <Skeleton className="h-3 w-56 mt-1" />
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={`dept-${i}`} className="space-y-1.5">
                                <div className="flex justify-between">
                                    <Skeleton className="h-3.5 w-28" />
                                    <Skeleton className="h-3.5 w-16" />
                                </div>
                                <Skeleton className="h-2 w-full rounded-full" />
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card className="lg:col-span-7">
                    <CardHeader className="pb-3 border-b">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-3 w-60 mt-1" />
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={`act-${i}`} className="flex items-start gap-3">
                                <Skeleton className="size-8 rounded-full" />
                                <div className="flex-1 space-y-1.5">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
