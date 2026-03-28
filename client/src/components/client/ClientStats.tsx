import { Users, UserCheck, UserX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ClientStatsProps {
    total: number;
    active: number;
    inactive: number;
    isLoading: boolean;
}

export function ClientStats({ total, active, inactive, isLoading }: ClientStatsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Clients */}
            <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-slate-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-slate-500/5 hover:border-slate-500/30">
                <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-slate-500/10 blur-2xl transition-all duration-300 group-hover:bg-slate-500/20" />
                <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/10 text-slate-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-slate-500/20">
                            <Users className="h-5 w-5" />
                        </div>
                    </div>
                    {isLoading ? (
                        <Skeleton className="h-9 w-20" />
                    ) : (
                        <h3 className="text-3xl font-bold tracking-tight text-slate-600 dark:text-slate-300">
                            {total}
                        </h3>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                        Total Clients
                    </p>
                </div>
            </div>

            {/* Active Clients */}
            <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-green-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/5 hover:border-green-500/30">
                <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-green-500/10 blur-2xl transition-all duration-300 group-hover:bg-green-500/20" />
                <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-green-500/20">
                            <UserCheck className="h-5 w-5" />
                        </div>
                    </div>
                    {isLoading ? (
                        <Skeleton className="h-9 w-20" />
                    ) : (
                        <h3 className="text-3xl font-bold tracking-tight text-green-600 dark:text-green-400">
                            {active}
                        </h3>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                        Active (this page)
                    </p>
                </div>
            </div>

            {/* Inactive Clients */}
            <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-gray-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-gray-500/5 hover:border-gray-500/30">
                <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gray-500/10 blur-2xl transition-all duration-300 group-hover:bg-gray-500/20" />
                <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-500/10 text-gray-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-gray-500/20">
                            <UserX className="h-5 w-5" />
                        </div>
                    </div>
                    {isLoading ? (
                        <Skeleton className="h-9 w-20" />
                    ) : (
                        <h3 className="text-3xl font-bold tracking-tight text-gray-600 dark:text-gray-400">
                            {inactive}
                        </h3>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                        Inactive (this page)
                    </p>
                </div>
            </div>
        </div>
    );
}
