import { ShoppingBag, Image, DollarSign, CreditCard, Wallet, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

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
            bgColor: "bg-blue-500/10",
        },
        {
            label: "Total Images",
            value: stats?.totalImages,
            icon: Image,
            color: "text-purple-500",
            bgColor: "bg-purple-500/10",
        },
        {
            label: "Total Amount",
            value: stats?.totalAmount !== undefined ? formatCurrency(stats.totalAmount) : undefined,
            icon: DollarSign,
            color: "text-green-500",
            bgColor: "bg-green-500/10",
        },
        {
            label: "Paid Amount",
            value: stats?.paidAmount !== undefined ? formatCurrency(stats.paidAmount) : undefined,
            icon: CreditCard,
            color: "text-teal-500",
            bgColor: "bg-teal-500/10",
        },
        {
            label: "Due Amount",
            value: stats?.dueAmount !== undefined ? formatCurrency(stats.dueAmount) : undefined,
            icon: Wallet,
            color: "text-red-500",
            bgColor: "bg-red-500/10",
        },
        {
            label: "Total BDT",
            value: stats?.totalBDT !== undefined ? `${stats.totalBDT.toLocaleString()} ৳` : undefined,
            icon: TrendingUp,
            color: "text-orange-500",
            bgColor: "bg-orange-500/10",
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {statCards.map((card, index) => (
                <Card key={index} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className={`p-2 rounded-lg ${card.bgColor}`}>
                                <card.icon className={`h-4 w-4 ${card.color}`} />
                            </div>
                        </div>
                        {isLoading ? (
                            <Skeleton className="h-7 w-full" />
                        ) : (
                            <div className="text-xl font-bold truncate">
                                {card.value ?? 0}
                            </div>
                        )}
                        <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mt-1">
                            {card.label}
                        </p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
