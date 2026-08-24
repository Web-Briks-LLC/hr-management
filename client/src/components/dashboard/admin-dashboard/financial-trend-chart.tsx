'use client';

import * as React from 'react';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
} from 'recharts';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
    type ChartConfig,
} from '@/components/ui/chart';
import type { MonthlyTrend } from '@/types/dashboard.type';
import { TrendingUp, DollarSign, Package } from 'lucide-react';

interface FinancialTrendChartProps {
    data: MonthlyTrend[];
    hideFinancials?: boolean;
}

const financialChartConfig = {
    earnings: {
        label: 'Earnings (৳)',
        color: 'hsl(142.1 76.2% 36.3%)',
    },
    expenses: {
        label: 'Expenses (৳)',
        color: 'hsl(346.8 77.2% 49.8%)',
    },
    profit: {
        label: 'Net Profit (৳)',
        color: 'hsl(221.2 83.2% 53.3%)',
    },
} satisfies ChartConfig;

const ordersChartConfig = {
    orders: {
        label: 'Orders Volume',
        color: 'hsl(238.7 83.5% 66.7%)',
    },
} satisfies ChartConfig;

export function FinancialTrendChart({ data, hideFinancials = false }: FinancialTrendChartProps) {
    const [activeView, setActiveView] = React.useState<'financial' | 'orders'>(
        hideFinancials ? 'orders' : 'financial'
    );

    React.useEffect(() => {
        if (hideFinancials) {
            setActiveView('orders');
        }
    }, [hideFinancials]);

    const totalEarnings = React.useMemo(
        () => data.reduce((acc, curr) => acc + curr.earnings, 0),
        [data]
    );
    const totalExpenses = React.useMemo(
        () => data.reduce((acc, curr) => acc + curr.expenses, 0),
        [data]
    );
    const netProfit = totalEarnings - totalExpenses;
    const totalOrders = React.useMemo(
        () => data.reduce((acc, curr) => acc + curr.orders, 0),
        [data]
    );
    const averageMonthlyOrders = Math.round(totalOrders / Math.max(1, data.length));
    const peakOrders = Math.max(0, ...data.map((d) => d.orders || 0));

    const formatCurrencyShort = (amount: number) => {
        if (amount >= 1000000) return `৳${(amount / 1000000).toFixed(1)}M`;
        if (amount >= 1000) return `৳${(amount / 1000).toFixed(0)}k`;
        return `৳${amount}`;
    };

    return (
        <Card className="flex flex-col border-border/60 shadow-xs">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3 border-b">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                            {hideFinancials ? <Package className="size-4" /> : <TrendingUp className="size-4" />}
                        </div>
                        <CardTitle className="text-base font-semibold">
                            {hideFinancials ? 'Production & Order Flow Trends' : 'Performance & Flow Trends'}
                        </CardTitle>
                    </div>
                    <CardDescription className="text-xs mt-1">
                        {hideFinancials
                            ? '6-Month historical analysis of organization order flow & volume'
                            : '6-Month historical analysis of organization revenue, expenses & order volume'}
                    </CardDescription>
                </div>

                {!hideFinancials && (
                    <div className="flex items-center gap-2">
                        <Tabs
                            value={activeView}
                            onValueChange={(val) => setActiveView(val as 'financial' | 'orders')}
                            className="w-auto"
                        >
                            <TabsList className="h-8 p-0.5 bg-muted/60">
                                <TabsTrigger value="financial" className="text-xs px-3 h-7">
                                    <DollarSign className="size-3.5 mr-1" />
                                    Financials
                                </TabsTrigger>
                                <TabsTrigger value="orders" className="text-xs px-3 h-7">
                                    <Package className="size-3.5 mr-1" />
                                    Orders
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                )}
            </CardHeader>

            <CardContent className="pt-4 flex-1">
                <div className="h-[280px] w-full">
                    {activeView === 'financial' && !hideFinancials ? (
                        <ChartContainer config={financialChartConfig} className="h-full w-full aspect-auto">
                            <AreaChart
                                data={data}
                                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="fillEarnings" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--color-earnings)" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="var(--color-earnings)" stopOpacity={0.0} />
                                    </linearGradient>
                                    <linearGradient id="fillExpenses" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--color-expenses)" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="var(--color-expenses)" stopOpacity={0.0} />
                                    </linearGradient>
                                    <linearGradient id="fillProfit" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--color-profit)" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="var(--color-profit)" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
                                <XAxis
                                    dataKey="shortMonth"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    className="text-[11px]"
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    tickFormatter={formatCurrencyShort}
                                    className="text-[11px]"
                                />
                                <ChartTooltip
                                    cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '3 3' }}
                                    content={
                                        <ChartTooltipContent
                                            formatter={(value, name) => (
                                                <div className="flex items-center justify-between gap-3 w-full">
                                                    <span className="text-muted-foreground">{name}:</span>
                                                    <span className="font-mono font-medium text-foreground">
                                                        ৳{Number(value).toLocaleString('en-BD')}
                                                    </span>
                                                </div>
                                            )}
                                        />
                                    }
                                />
                                <ChartLegend content={<ChartLegendContent verticalAlign="top" />} />
                                <Area
                                    type="monotone"
                                    dataKey="earnings"
                                    stroke="var(--color-earnings)"
                                    strokeWidth={2.5}
                                    fill="url(#fillEarnings)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="expenses"
                                    stroke="var(--color-expenses)"
                                    strokeWidth={2}
                                    fill="url(#fillExpenses)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="profit"
                                    stroke="var(--color-profit)"
                                    strokeWidth={2}
                                    strokeDasharray="4 4"
                                    fill="url(#fillProfit)"
                                />
                            </AreaChart>
                        </ChartContainer>
                    ) : (
                        <ChartContainer config={ordersChartConfig} className="h-full w-full aspect-auto">
                            <BarChart
                                data={data}
                                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
                                <XAxis
                                    dataKey="shortMonth"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    className="text-[11px]"
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    className="text-[11px]"
                                />
                                <ChartTooltip
                                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                                    content={
                                        <ChartTooltipContent
                                            formatter={(value) => (
                                                <div className="flex items-center justify-between gap-3 w-full">
                                                    <span className="text-muted-foreground">Orders:</span>
                                                    <span className="font-mono font-medium text-foreground">
                                                        {Number(value).toLocaleString()} orders
                                                    </span>
                                                </div>
                                            )}
                                        />
                                    }
                                />
                                <ChartLegend content={<ChartLegendContent verticalAlign="top" />} />
                                <Bar
                                    dataKey="orders"
                                    fill="var(--color-orders)"
                                    radius={[6, 6, 0, 0]}
                                    maxBarSize={45}
                                />
                            </BarChart>
                        </ChartContainer>
                    )}
                </div>

                {/* KPI Pill Highlights at bottom of chart */}
                {hideFinancials ? (
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t mt-2">
                        <div className="p-2.5 rounded-lg bg-indigo-500/[0.06] border border-indigo-500/10">
                            <span className="text-[10px] text-muted-foreground uppercase font-medium">6M Total Orders</span>
                            <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                                {totalOrders} orders
                            </p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-blue-500/[0.06] border border-blue-500/10">
                            <span className="text-[10px] text-muted-foreground uppercase font-medium">Monthly Avg</span>
                            <p className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">
                                {averageMonthlyOrders} orders/mo
                            </p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/10">
                            <span className="text-[10px] text-muted-foreground uppercase font-medium">Peak Month</span>
                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                {peakOrders} orders
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t mt-2">
                        <div className="p-2.5 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/10">
                            <span className="text-[10px] text-muted-foreground uppercase font-medium">6M Earnings</span>
                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                ৳{totalEarnings.toLocaleString('en-BD')}
                            </p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-rose-500/[0.06] border border-rose-500/10">
                            <span className="text-[10px] text-muted-foreground uppercase font-medium">6M Expenses</span>
                            <p className="text-sm font-bold text-rose-600 dark:text-rose-400 font-mono">
                                ৳{totalExpenses.toLocaleString('en-BD')}
                            </p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-blue-500/[0.06] border border-blue-500/10">
                            <span className="text-[10px] text-muted-foreground uppercase font-medium">
                                {activeView === 'financial' ? '6M Net Profit' : '6M Total Orders'}
                            </span>
                            <p className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">
                                {activeView === 'financial'
                                    ? `৳${netProfit.toLocaleString('en-BD')}`
                                    : `${totalOrders} orders`}
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
