'use client';

import { useState } from 'react';
import { useGetFinanceAnalyticsQuery } from '@/redux/features/analytics/analyticsApi';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Bar,
    BarChart,
    XAxis,
    YAxis,
    CartesianGrid,
    ResponsiveContainer,
    Pie,
    PieChart,
    Cell,
    Legend,
    Line,
    LineChart,
} from 'recharts';
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    Receipt,
    Package,
    Wallet,
    Users,
} from 'lucide-react';

const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
        return `৳${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
        return `৳${(amount / 1000).toFixed(1)}K`;
    }
    return `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
];

const barChartConfig = {
    earnings: {
        label: 'Earnings',
        color: 'hsl(142, 76%, 36%)',
    },
    expenses: {
        label: 'Expenses',
        color: 'hsl(0, 84%, 60%)',
    },
    profit: {
        label: 'Profit',
        color: 'hsl(217, 91%, 60%)',
    },
} satisfies ChartConfig;

const pieChartConfig = {
    category: {
        label: 'Category',
    },
} satisfies ChartConfig;

export default function FinanceAnalyticsPage() {
    const [months, setMonths] = useState<number>(12);
    const { data, isLoading } = useGetFinanceAnalyticsQuery({ months });

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="pb-2">
                                <Skeleton className="h-4 w-24" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-32" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-6 w-40" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-[300px] w-full" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-6 w-40" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-[300px] w-full" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    if (!data) {
        return <div>No analytics data available</div>;
    }

    const { summary, monthlyTrends, clientBreakdown, expensesByCategory } = data;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Finance Analytics</h1>
                    <p className="text-muted-foreground">
                        Track your earnings, expenses, and profit trends
                    </p>
                </div>
                <Select
                    value={months.toString()}
                    onValueChange={(v) => setMonths(parseInt(v))}
                >
                    <SelectTrigger className="w-36">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="6">Last 6 months</SelectItem>
                        <SelectItem value="12">Last 12 months</SelectItem>
                        <SelectItem value="24">Last 24 months</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Summary Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Earnings
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(summary.totalEarnings)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            From {summary.deliveredOrders} orders
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Expenses
                        </CardTitle>
                        <Receipt className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {formatCurrency(summary.totalExpenses)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            All categories
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Net Profit
                        </CardTitle>
                        {summary.totalProfit >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-blue-600" />
                        ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                    </CardHeader>
                    <CardContent>
                        <div
                            className={`text-2xl font-bold ${summary.totalProfit >= 0
                                ? 'text-blue-600'
                                : 'text-red-600'
                                }`}
                        >
                            {formatCurrency(summary.totalProfit)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Earnings - Expenses
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Unpaid Revenue
                        </CardTitle>
                        <Wallet className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                            {formatCurrency(summary.unpaidRevenue)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Not yet withdrawn
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Shared Amount
                        </CardTitle>
                        <Package className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">
                            {formatCurrency(summary.totalShared || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Transferred to external
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Final Amount
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${(summary.finalAmount || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatCurrency(summary.finalAmount || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Profit - Shared + Debit
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 1 - Monthly Trends */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Earnings vs Expenses Bar Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Earnings vs Expenses</CardTitle>
                        <CardDescription>
                            Monthly comparison over the last {months} months
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer
                            config={barChartConfig}
                            className="h-[300px] w-full"
                        >
                            <BarChart data={monthlyTrends}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis
                                    dataKey="monthName"
                                    tickLine={false}
                                    axisLine={false}
                                    className="text-xs"
                                />
                                <YAxis
                                    tickFormatter={(v) => formatCurrency(v)}
                                    tickLine={false}
                                    axisLine={false}
                                    className="text-xs"
                                />
                                <ChartTooltip
                                    content={
                                        <ChartTooltipContent
                                            formatter={(value) =>
                                                formatCurrency(Number(value))
                                            }
                                        />
                                    }
                                />
                                <Bar
                                    dataKey="earnings"
                                    fill="hsl(142, 76%, 36%)"
                                    radius={[4, 4, 0, 0]}
                                    name="Earnings"
                                />
                                <Bar
                                    dataKey="expenses"
                                    fill="hsl(0, 84%, 60%)"
                                    radius={[4, 4, 0, 0]}
                                    name="Expenses"
                                />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                {/* Profit Trend Line Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Profit Trend</CardTitle>
                        <CardDescription>
                            Monthly profit over the last {months} months
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer
                            config={barChartConfig}
                            className="h-[300px] w-full"
                        >
                            <LineChart data={monthlyTrends}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis
                                    dataKey="monthName"
                                    tickLine={false}
                                    axisLine={false}
                                    className="text-xs"
                                />
                                <YAxis
                                    tickFormatter={(v) => formatCurrency(v)}
                                    tickLine={false}
                                    axisLine={false}
                                    className="text-xs"
                                />
                                <ChartTooltip
                                    content={
                                        <ChartTooltipContent
                                            formatter={(value) =>
                                                formatCurrency(Number(value))
                                            }
                                        />
                                    }
                                />
                                <Line
                                    type="monotone"
                                    dataKey="profit"
                                    stroke="hsl(217, 91%, 60%)"
                                    strokeWidth={2}
                                    dot={{ fill: 'hsl(217, 91%, 60%)' }}
                                    name="Profit"
                                />
                            </LineChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 2 - Breakdown */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Expenses by Category - Clean Bar Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Expenses by Category</CardTitle>
                        <CardDescription>
                            Top expense categories
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {expensesByCategory.length === 0 ? (
                            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                                No expense data available
                            </div>
                        ) : (
                            (() => {
                                // Group into top 5 + Others
                                const top5 = expensesByCategory.slice(0, 5);
                                const othersTotal = expensesByCategory
                                    .slice(5)
                                    .reduce((sum, cat) => sum + cat.total, 0);
                                const chartData = othersTotal > 0
                                    ? [...top5, { categoryId: 'others', categoryName: 'Others', total: othersTotal }]
                                    : top5;

                                return (
                                    <ChartContainer
                                        config={barChartConfig}
                                        className="h-[300px] w-full"
                                    >
                                        <BarChart
                                            data={chartData}
                                            layout="vertical"
                                        >
                                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                            <XAxis
                                                type="number"
                                                tickFormatter={(v) => formatCurrency(v)}
                                                tickLine={false}
                                                axisLine={false}
                                                className="text-xs"
                                            />
                                            <YAxis
                                                type="category"
                                                dataKey="categoryName"
                                                tickLine={false}
                                                axisLine={false}
                                                className="text-xs"
                                                width={100}
                                            />
                                            <ChartTooltip
                                                content={
                                                    <ChartTooltipContent
                                                        formatter={(value) =>
                                                            formatCurrency(Number(value))
                                                        }
                                                    />
                                                }
                                            />
                                            <Bar
                                                dataKey="total"
                                                fill="hsl(0, 84%, 60%)"
                                                radius={[0, 4, 4, 0]}
                                                name="Amount"
                                            />
                                        </BarChart>
                                    </ChartContainer>
                                );
                            })()
                        )}
                    </CardContent>
                </Card>

                {/* Top Clients Bar Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Top Clients by Earnings</CardTitle>
                        <CardDescription>
                            Your highest earning clients
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {clientBreakdown.length === 0 ? (
                            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                                No client data available
                            </div>
                        ) : (
                            <ChartContainer
                                config={barChartConfig}
                                className="h-[300px] w-full"
                            >
                                <BarChart
                                    data={clientBreakdown.slice(0, 5)}
                                    layout="vertical"
                                >
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis
                                        type="number"
                                        tickFormatter={(v) => formatCurrency(v)}
                                        tickLine={false}
                                        axisLine={false}
                                        className="text-xs"
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="clientName"
                                        tickLine={false}
                                        axisLine={false}
                                        className="text-xs"
                                        width={80}
                                    />
                                    <ChartTooltip
                                        content={
                                            <ChartTooltipContent
                                                formatter={(value) =>
                                                    formatCurrency(Number(value))
                                                }
                                            />
                                        }
                                    />
                                    <Bar
                                        dataKey="totalEarnings"
                                        fill="hsl(142, 76%, 36%)"
                                        radius={[0, 4, 4, 0]}
                                        name="Earnings"
                                    />
                                </BarChart>
                            </ChartContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Orders Stats */}
            <Card>
                <CardHeader>
                    <CardTitle>Order Revenue Trend</CardTitle>
                    <CardDescription>
                        Monthly order count and revenue
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer
                        config={barChartConfig}
                        className="h-[250px] w-full"
                    >
                        <BarChart data={monthlyTrends}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                                dataKey="monthName"
                                tickLine={false}
                                axisLine={false}
                                className="text-xs"
                            />
                            <YAxis
                                yAxisId="left"
                                tickFormatter={(v) => formatCurrency(v)}
                                tickLine={false}
                                axisLine={false}
                                className="text-xs"
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                tickLine={false}
                                axisLine={false}
                                className="text-xs"
                            />
                            <ChartTooltip
                                content={<ChartTooltipContent />}
                            />
                            <Bar
                                yAxisId="left"
                                dataKey="orderRevenue"
                                fill="hsl(var(--chart-4))"
                                radius={[4, 4, 0, 0]}
                                name="Revenue (BDT)"
                            />
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="orderCount"
                                stroke="hsl(var(--chart-5))"
                                strokeWidth={2}
                                dot={{ fill: 'hsl(var(--chart-5))' }}
                                name="Orders"
                            />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
    );
}
