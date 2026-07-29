import { ShoppingBag, Image, DollarSign, CreditCard, Wallet, TrendingUp } from "lucide-react";
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
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(amount);
    };

    const statCards = [
        {
            label: "Total Orders",
            value: stats?.totalOrders,
            icon: ShoppingBag,
            color: "text-blue-500",
            glowColor: "bg-blue-500/10",
            borderColor: "hover:border-blue-500/30",
            badge: "Orders",
        },
        {
            label: "Total Images",
            value: stats?.totalImages,
            icon: Image,
            color: "text-purple-500",
            glowColor: "bg-purple-500/10",
            borderColor: "hover:border-purple-500/30",
            badge: "Images",
        },
        {
            label: "Total Amount",
            value: stats?.totalAmount !== undefined ? formatCurrency(stats.totalAmount) : undefined,
            icon: DollarSign,
            color: "text-emerald-500",
            glowColor: "bg-emerald-500/10",
            borderColor: "hover:border-emerald-500/30",
            badge: "Revenue",
        },
        {
            label: "Paid Amount",
            value: stats?.paidAmount !== undefined ? formatCurrency(stats.paidAmount) : undefined,
            icon: CreditCard,
            color: "text-teal-500",
            glowColor: "bg-teal-500/10",
            borderColor: "hover:border-teal-500/30",
            badge: "Paid",
        },
        {
            label: "Due Amount",
            value: stats?.dueAmount !== undefined ? formatCurrency(stats.dueAmount) : undefined,
            icon: Wallet,
            color: "text-rose-500",
            glowColor: "bg-rose-500/10",
            borderColor: "hover:border-rose-500/30",
            badge: "Due",
        },
        {
            label: "Total BDT",
            value: stats?.totalBDT !== undefined ? `৳${stats.totalBDT.toLocaleString()}` : undefined,
            icon: TrendingUp,
            color: "text-amber-500",
            glowColor: "bg-amber-500/10",
            borderColor: "hover:border-amber-500/30",
            badge: "BDT",
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {statCards.map((card, index) => (
                <div
                    key={index}
                    className={`group relative overflow-hidden rounded-2xl border bg-linear-to-br from-card via-card to-muted/20 p-4 transition-all duration-300 hover:shadow-xl ${card.borderColor}`}
                >
                    <div className={`absolute -right-4 -top-4 h-16 w-16 rounded-full ${card.glowColor} blur-xl transition-all duration-300 group-hover:scale-125`} />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-2">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.glowColor} ${card.color} transition-all duration-300 group-hover:scale-110`}>
                                <card.icon className="h-4 w-4" />
                            </div>
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-medium opacity-80">
                                {card.badge}
                            </Badge>
                        </div>
                        {isLoading ? (
                            <Skeleton className="h-7 w-20" />
                        ) : (
                            <h3 className="text-xl font-bold tracking-tight text-foreground truncate">
                                {card.value ?? 0}
                            </h3>
                        )}
                        <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mt-2 pt-2 border-t border-border/40 truncate">
                            {card.label}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}
