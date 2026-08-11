"use client";

import { ShoppingBag, Image as ImageIcon, DollarSign, CreditCard, Wallet, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface ClientOrderStatsProps {
    stats: {
        totalOrders: number;
        totalAmount: number;
        totalImages: number;
        paidAmount: number;
        totalBDT: number;
        dueAmount: number;
    } | undefined;
    isLoading: boolean;
    currency?: string;
}

export function ClientOrderStats({ stats, isLoading, currency = "USD" }: ClientOrderStatsProps) {
    const formatCurrency = (amount: number) => {
        const safeCurrency = currency || 'USD';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: safeCurrency,
        }).format(amount);
    };

    const statCards = [
        {
            label: "Total Orders",
            value: stats?.totalOrders !== undefined ? stats.totalOrders.toLocaleString() : undefined,
            icon: ShoppingBag,
            iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
            badge: "Orders",
        },
        {
            label: "Total Images",
            value: stats?.totalImages !== undefined ? stats.totalImages.toLocaleString() : undefined,
            icon: ImageIcon,
            iconBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
            badge: "Images",
        },
        {
            label: "Total Amount",
            value: stats?.totalAmount !== undefined ? formatCurrency(stats.totalAmount) : undefined,
            icon: DollarSign,
            iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            badge: "Revenue",
        },
        {
            label: "Paid Amount",
            value: stats?.paidAmount !== undefined ? formatCurrency(stats.paidAmount) : undefined,
            icon: CreditCard,
            iconBg: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
            badge: "Paid",
        },
        {
            label: "Due Amount",
            value: stats?.dueAmount !== undefined ? formatCurrency(stats.dueAmount) : undefined,
            icon: Wallet,
            iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
            badge: "Due",
        },
        {
            label: "Total BDT",
            value: stats?.totalBDT !== undefined ? `৳${stats.totalBDT.toLocaleString()}` : undefined,
            icon: TrendingUp,
            iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
            badge: "BDT",
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {statCards.map((card, index) => (
                <Card
                    key={index}
                    className="border-border/60 shadow-xs hover:shadow-md transition-all duration-200"
                >
                    <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className={`p-2 rounded-lg ${card.iconBg}`}>
                                <card.icon className="h-4 w-4" />
                            </div>
                            <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0 h-4 border-border/60">
                                {card.badge}
                            </Badge>
                        </div>
                        <div>
                            {isLoading ? (
                                <Skeleton className="h-7 w-20" />
                            ) : (
                                <h3 className="text-xl font-bold tracking-tight text-foreground truncate">
                                    {card.value ?? "0"}
                                </h3>
                            )}
                            <p className="text-xs font-medium text-muted-foreground mt-0.5 truncate">
                                {card.label}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
