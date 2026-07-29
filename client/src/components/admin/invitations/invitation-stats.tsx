'use client';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, Clock, CheckCircle2, XCircle } from 'lucide-react';
import type { InvitationStatsData } from './types';

interface InvitationStatsProps {
    stats: InvitationStatsData;
    isLoading?: boolean;
}

export function InvitationStats({ stats, isLoading }: InvitationStatsProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Card */}
            <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-slate-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-slate-500/5 hover:border-slate-500/30">
                <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-slate-500/10 blur-2xl transition-all duration-300 group-hover:bg-slate-500/20" />
                <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/10 text-slate-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-slate-500/20">
                            <Mail className="h-5 w-5" />
                        </div>
                        {!isLoading && (
                            <Badge
                                variant="outline"
                                className="text-[10px] font-medium opacity-70 group-hover:opacity-100"
                            >
                                Total
                            </Badge>
                        )}
                    </div>
                    {isLoading ? (
                        <Skeleton className="h-8 w-20" />
                    ) : (
                        <div>
                            <h3 className="text-3xl font-bold tracking-tight text-foreground">
                                {stats.total}
                            </h3>
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-slate-500/10 font-medium">
                        Total Invitations
                    </p>
                </div>
            </div>

            {/* Pending Card */}
            <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-orange-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/5 hover:border-orange-500/30">
                <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-orange-500/10 blur-2xl transition-all duration-300 group-hover:bg-orange-500/20" />
                <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-orange-500/20">
                            <Clock className="h-5 w-5" />
                        </div>
                        {!isLoading && (
                            <Badge
                                variant="outline"
                                className="text-[10px] font-medium bg-orange-500/5 text-orange-500 border-orange-500/20 px-1.5 py-0 h-5"
                            >
                                Pending
                            </Badge>
                        )}
                    </div>
                    {isLoading ? (
                        <Skeleton className="h-8 w-20" />
                    ) : (
                        <div>
                            <h3 className="text-3xl font-bold tracking-tight text-orange-600 dark:text-orange-400">
                                {stats.pending}
                            </h3>
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-orange-500/10 font-medium">
                        Awaiting Registration
                    </p>
                </div>
            </div>

            {/* Accepted Card */}
            <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-green-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/5 hover:border-green-500/30">
                <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-green-500/10 blur-2xl transition-all duration-300 group-hover:bg-green-500/20" />
                <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-green-500/20">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                        {!isLoading && (
                            <Badge
                                variant="outline"
                                className="text-[10px] font-medium bg-green-500/5 text-green-500 border-green-500/20 px-1.5 py-0 h-5"
                            >
                                Success
                            </Badge>
                        )}
                    </div>
                    {isLoading ? (
                        <Skeleton className="h-8 w-20" />
                    ) : (
                        <div>
                            <h3 className="text-3xl font-bold tracking-tight text-green-600 dark:text-green-400">
                                {stats.accepted}
                            </h3>
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-green-500/10 font-medium">
                        Successfully Onboarded
                    </p>
                </div>
            </div>

            {/* Expired Card */}
            <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-red-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-red-500/5 hover:border-red-500/30">
                <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-red-500/10 blur-2xl transition-all duration-300 group-hover:bg-red-500/20" />
                <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-red-500/20">
                            <XCircle className="h-5 w-5" />
                        </div>
                        {!isLoading && (
                            <Badge
                                variant="outline"
                                className="text-[10px] font-medium bg-red-500/5 text-red-500 border-red-500/20 px-1.5 py-0 h-5"
                            >
                                Expired
                            </Badge>
                        )}
                    </div>
                    {isLoading ? (
                        <Skeleton className="h-8 w-20" />
                    ) : (
                        <div>
                            <h3 className="text-3xl font-bold tracking-tight text-red-600 dark:text-red-400">
                                {stats.expired}
                            </h3>
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-red-500/10 font-medium">
                        Expired Links
                    </p>
                </div>
            </div>
        </div>
    );
}
