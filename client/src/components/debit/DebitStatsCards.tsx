'use client';

import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import {
    ArrowDownCircle,
    ArrowUpCircle,
    Wallet,
    TrendingUp,
    TrendingDown
} from 'lucide-react';

export function DebitStatsCards() {
    const { stats, loading } = useSelector((state: RootState) => state.debit);

    // Calculate overall totals
    const totalBorrowed = stats.reduce((sum, s) => sum + s.totalBorrowed, 0);
    const totalReturned = stats.reduce((sum, s) => sum + s.totalReturned, 0);
    const currentBalance = stats.reduce((sum, s) => sum + s.netBalance, 0);

    const formatCurrency = (amount: number) => {
        return amount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    if (loading) {
        return (
            <div className="grid gap-4 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="relative overflow-hidden rounded-2xl border bg-card p-6 animate-pulse"
                    >
                        <div className="h-4 w-24 bg-muted rounded mb-3"></div>
                        <div className="h-8 w-32 bg-muted rounded mb-2"></div>
                        <div className="h-3 w-20 bg-muted rounded"></div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-3">
            {/* Total Borrowed Card */}
            <div className="group relative overflow-hidden rounded-2xl border bg-gradient-to-br from-rose-500/10 via-card to-card p-6 transition-all duration-300 hover:shadow-xl hover:shadow-rose-500/5 hover:border-rose-500/30">
                {/* Decorative background elements */}
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-rose-500/10 blur-2xl transition-all duration-300 group-hover:bg-rose-500/20" />
                <div className="absolute -right-2 -bottom-2 h-16 w-16 rounded-full bg-rose-400/5 blur-xl" />

                <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-rose-500/20">
                                <ArrowDownCircle className="h-5 w-5" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">
                                Total Borrowed
                            </span>
                        </div>
                        <TrendingUp className="h-4 w-4 text-rose-500/60" />
                    </div>

                    <div className="space-y-1">
                        <h3 className="text-3xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
                            ৳{formatCurrency(totalBorrowed)}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            Total amount given out
                        </p>
                    </div>

                    {/* Progress bar style indicator */}
                    <div className="mt-4 h-1.5 w-full rounded-full bg-rose-500/10 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-400 transition-all duration-500"
                            style={{
                                width: totalBorrowed > 0
                                    ? `${Math.min((totalBorrowed / (totalBorrowed + totalReturned + 1)) * 100, 100)}%`
                                    : '0%'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Total Returned Card */}
            <div className="group relative overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-500/10 via-card to-card p-6 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/5 hover:border-emerald-500/30">
                {/* Decorative background elements */}
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl transition-all duration-300 group-hover:bg-emerald-500/20" />
                <div className="absolute -right-2 -bottom-2 h-16 w-16 rounded-full bg-emerald-400/5 blur-xl" />

                <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-emerald-500/20">
                                <ArrowUpCircle className="h-5 w-5" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">
                                Total Returned
                            </span>
                        </div>
                        <TrendingDown className="h-4 w-4 text-emerald-500/60" />
                    </div>

                    <div className="space-y-1">
                        <h3 className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                            ৳{formatCurrency(totalReturned)}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            Total amount received back
                        </p>
                    </div>

                    {/* Progress bar style indicator */}
                    <div className="mt-4 h-1.5 w-full rounded-full bg-emerald-500/10 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                            style={{
                                width: totalReturned > 0 && totalBorrowed > 0
                                    ? `${Math.min((totalReturned / totalBorrowed) * 100, 100)}%`
                                    : '0%'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Current Balance Card */}
            <div className={`group relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 hover:shadow-xl ${currentBalance > 0
                    ? 'bg-gradient-to-br from-amber-500/10 via-card to-card hover:shadow-amber-500/5 hover:border-amber-500/30'
                    : currentBalance < 0
                        ? 'bg-gradient-to-br from-blue-500/10 via-card to-card hover:shadow-blue-500/5 hover:border-blue-500/30'
                        : 'bg-gradient-to-br from-slate-500/10 via-card to-card hover:shadow-slate-500/5 hover:border-slate-500/30'
                }`}>
                {/* Decorative background elements */}
                <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full blur-2xl transition-all duration-300 ${currentBalance > 0
                        ? 'bg-amber-500/10 group-hover:bg-amber-500/20'
                        : currentBalance < 0
                            ? 'bg-blue-500/10 group-hover:bg-blue-500/20'
                            : 'bg-slate-500/10 group-hover:bg-slate-500/20'
                    }`} />
                <div className={`absolute -right-2 -bottom-2 h-16 w-16 rounded-full blur-xl ${currentBalance > 0
                        ? 'bg-amber-400/5'
                        : currentBalance < 0
                            ? 'bg-blue-400/5'
                            : 'bg-slate-400/5'
                    }`} />

                <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 ${currentBalance > 0
                                    ? 'bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20'
                                    : currentBalance < 0
                                        ? 'bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20'
                                        : 'bg-slate-500/10 text-slate-500 group-hover:bg-slate-500/20'
                                }`}>
                                <Wallet className="h-5 w-5" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">
                                Current Balance
                            </span>
                        </div>
                        {currentBalance !== 0 && (
                            <div className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${currentBalance > 0
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                }`}>
                                {currentBalance > 0 ? 'Receivable' : 'Settled'}
                            </div>
                        )}
                    </div>

                    <div className="space-y-1">
                        <h3 className={`text-3xl font-bold tracking-tight ${currentBalance > 0
                                ? 'text-amber-600 dark:text-amber-400'
                                : currentBalance < 0
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-slate-600 dark:text-slate-400'
                            }`}>
                            ৳{formatCurrency(Math.abs(currentBalance))}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            {currentBalance > 0
                                ? 'Amount yet to be returned'
                                : currentBalance < 0
                                    ? 'Extra amount returned'
                                    : 'All debts settled'
                            }
                        </p>
                    </div>

                    {/* Recovery percentage indicator */}
                    <div className="mt-4 flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-muted/50 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${currentBalance > 0
                                        ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                                        : 'bg-gradient-to-r from-blue-500 to-blue-400'
                                    }`}
                                style={{
                                    width: totalBorrowed > 0
                                        ? `${Math.min((totalReturned / totalBorrowed) * 100, 100)}%`
                                        : '100%'
                                }}
                            />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">
                            {totalBorrowed > 0
                                ? `${Math.min(Math.round((totalReturned / totalBorrowed) * 100), 100)}%`
                                : '100%'
                            }
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
