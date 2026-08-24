'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { OvertimeSummary } from '@/types/dashboard.type';
import { Timer, ArrowRight, Clock, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';

interface OvertimeSummaryTableProps {
    data: OvertimeSummary;
}

export function OvertimeSummaryTable({ data }: OvertimeSummaryTableProps) {
    return (
        <Card className="flex flex-col border-border/60 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <Timer className="size-4" />
                        </div>
                        <CardTitle className="text-base font-semibold">Overtime Tracker</CardTitle>
                    </div>
                    <CardDescription className="text-xs mt-1">
                        Requests & accumulated extra hours
                    </CardDescription>
                </div>

                <Link href="/overtime">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                        Review <ArrowRight className="size-3" />
                    </Button>
                </Link>
            </CardHeader>

            <CardContent className="pt-4 flex-1 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                    <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/40 text-xs">
                        <span className="flex items-center gap-2 font-medium text-foreground">
                            <Clock className="size-3.5 text-amber-500" />
                            Pending Requests
                        </span>
                        <Badge
                            variant={data.pending > 0 ? 'destructive' : 'secondary'}
                            className="font-mono text-xs"
                        >
                            {data.pending}
                        </Badge>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/40 text-xs">
                        <span className="flex items-center gap-2 font-medium text-foreground">
                            <CheckCircle2 className="size-3.5 text-emerald-500" />
                            Approved
                        </span>
                        <Badge variant="outline" className="font-mono text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                            {data.approved}
                        </Badge>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/40 text-xs">
                        <span className="flex items-center gap-2 font-medium text-foreground">
                            <XCircle className="size-3.5 text-rose-500" />
                            Rejected
                        </span>
                        <Badge variant="outline" className="font-mono text-xs text-muted-foreground">
                            {data.rejected}
                        </Badge>
                    </div>
                </div>

                <div className="p-3 rounded-md bg-primary/[0.04] border border-primary/10 flex items-center justify-between">
                    <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-medium block">
                            Total Approved Hours
                        </span>
                        <span className="text-xl font-bold font-mono text-primary">
                            {data.totalHours.toFixed(1)} hrs
                        </span>
                    </div>
                    <Link href="/overtime">
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                            Manage
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}
