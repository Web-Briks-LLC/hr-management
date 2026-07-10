import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function StaffHeaderSkeleton() {
    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex gap-4">
                        <Skeleton className="h-20 w-20 rounded-full" />

                        <div className="space-y-3">
                            <Skeleton className="h-4 w-32" />

                            <div className="flex items-center gap-3">
                                <Skeleton className="h-6 w-40" />
                                <Skeleton className="h-5 w-16 rounded-full" />
                            </div>

                            <div className="flex flex-wrap gap-4">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-2"
                                    >
                                        <Skeleton className="h-4 w-4 rounded-full" />
                                        <Skeleton className="h-4 w-28" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="text-left xl:text-right space-y-3">
                        <Skeleton className="h-4 w-24 xl:ml-auto" />

                        <div className="flex items-center xl:justify-end gap-3">
                            <Skeleton className="h-12 w-12 rounded-full" />

                            <div className="space-y-1">
                                <Skeleton className="h-7 w-24" />
                                <Skeleton className="h-4 w-12" />
                            </div>
                        </div>

                        <Skeleton className="h-4 w-32 xl:ml-auto" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
