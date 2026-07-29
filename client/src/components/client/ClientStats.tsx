import { Users, UserCheck, UserX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface ClientStatsProps {
    total: number;
    active: number;
    inactive: number;
    isLoading: boolean;
}

export function ClientStats({ total, active, inactive, isLoading }: ClientStatsProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Total Clients */}
            <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-slate-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-slate-500/5 hover:border-slate-500/30">
                <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-slate-500/10 blur-2xl transition-all duration-300 group-hover:bg-slate-500/20" />
                <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/10 text-slate-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-slate-500/20">
                            <Users className="h-5 w-5" />
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
                                {total}
                            </h3>
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-slate-500/10 font-medium">
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
                        {!isLoading && (
                            <Badge
                                variant="outline"
                                className="text-[10px] font-medium bg-green-500/5 text-green-500 border-green-500/20 px-1.5 py-0 h-5"
                            >
                                Active
                            </Badge>
                        )}
                    </div>
                    {isLoading ? (
                        <Skeleton className="h-8 w-20" />
                    ) : (
                        <div>
                            <h3 className="text-3xl font-bold tracking-tight text-green-600 dark:text-green-400">
                                {active}
                            </h3>
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-green-500/10 font-medium">
                        Active Clients (current page)
                    </p>
                </div>
            </div>

            {/* Inactive Clients */}
            <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-red-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-red-500/5 hover:border-red-500/30">
                <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-red-500/10 blur-2xl transition-all duration-300 group-hover:bg-red-500/20" />
                <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-red-500/20">
                            <UserX className="h-5 w-5" />
                        </div>
                        {!isLoading && (
                            <Badge
                                variant="outline"
                                className="text-[10px] font-medium bg-red-500/5 text-red-500 border-red-500/20 px-1.5 py-0 h-5"
                            >
                                Inactive
                            </Badge>
                        )}
                    </div>
                    {isLoading ? (
                        <Skeleton className="h-8 w-20" />
                    ) : (
                        <div>
                            <h3 className="text-3xl font-bold tracking-tight text-red-600 dark:text-red-400">
                                {inactive}
                            </h3>
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-red-500/10 font-medium">
                        Inactive Clients (current page)
                    </p>
                </div>
            </div>
        </div>
    );
}
