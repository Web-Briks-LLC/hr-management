import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function ShiftCardSkeleton() {
    return (
        <Card className="relative">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-36" />
                        <Skeleton className="h-4 w-14 rounded-full" />
                    </div>

                    <Skeleton className="h-8 w-8 rounded-md" />
                </div>
            </CardHeader>

            <CardContent className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-md border p-2 space-y-2">
                        <Skeleton className="h-3 w-12" />
                        <Skeleton className="h-4 w-20" />
                    </div>

                    <div className="rounded-md border p-2 space-y-2">
                        <Skeleton className="h-3 w-12" />
                        <Skeleton className="h-4 w-20" />
                    </div>
                </div>

                <div className="rounded-md border p-2 space-y-2">
                    <Skeleton className="h-3 w-24" />

                    <div className="flex flex-wrap gap-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton
                                key={i}
                                className="h-5 w-10 rounded-full"
                            />
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div
                            key={i}
                            className="rounded-md border p-2 space-y-2 text-center"
                        >
                            <Skeleton className="h-3 w-14 mx-auto" />
                            <Skeleton className="h-4 w-10 mx-auto" />
                        </div>
                    ))}
                </div>

                <div className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-8" />
                        <Skeleton className="h-4 w-14" />
                    </div>

                    <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-6 w-10 rounded-full" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
