'use client';

import { useState } from 'react';
import {
    useGetAnalyticsYearsQuery,
    useGetFinanceAnalyticsQuery,
} from '@/redux/features/analytics/analyticsApi';
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
    Download,
    FileSpreadsheet,
    FileText,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
    exportAnalyticsToExcel,
    exportAnalyticsToPDF,
} from '@/utils/export-analytics';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

const formatCurrency = (amount: number, currency: string = 'BDT') => {
    try {
        if (currency === 'BDT') {
            return `৳${amount.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            })}`;
        }
        return amount.toLocaleString('en-US', {
            style: 'currency',
            currency: currency,
        });
    } catch {
        // Fallback for invalid currency codes
        console.error('Invalid currency code:', currency);
        return `${currency} ${amount.toFixed(2)}`;
    }
};

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

export default function FinanceAnalyticsPage() {
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState<string>(
        currentYear.toString(),
    );
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const [filterMode, setFilterMode] = useState<'year-month' | 'single-date' | 'custom-range'>('year-month');
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
        from: undefined,
        to: undefined,
    });

    // Fetch available years
    const { data: availableYears = [] } = useGetAnalyticsYearsQuery();

    // Combine fetched years with current year and unique them
    const years = Array.from(new Set([currentYear, ...availableYears])).sort(
        (a, b) => b - a,
    );

    const queryParams = {
        year: filterMode === 'year-month' ? parseInt(selectedYear) : undefined,
        month: filterMode === 'year-month' && selectedMonth !== 'all' ? parseInt(selectedMonth) : undefined,
        startDate: filterMode === 'single-date' && selectedDate 
            ? format(selectedDate, "yyyy-MM-dd") 
            : (filterMode === 'custom-range' && dateRange.from 
                ? format(dateRange.from, "yyyy-MM-dd") 
                : undefined),
        endDate: filterMode === 'single-date' && selectedDate 
            ? format(selectedDate, "yyyy-MM-dd") 
            : (filterMode === 'custom-range' && dateRange.from
                ? format(dateRange.to || dateRange.from, "yyyy-MM-dd") 
                : undefined),
    };

    const { data, isLoading } = useGetFinanceAnalyticsQuery(queryParams);

    const periodLabel = filterMode === 'year-month'
        ? (selectedMonth === 'all' ? selectedYear.toString() : `${format(new Date(0, parseInt(selectedMonth) - 1), 'MMMM')}, ${selectedYear}`)
        : (filterMode === 'single-date' && selectedDate
            ? format(selectedDate, 'PPP')
            : (filterMode === 'custom-range' && dateRange.from
                ? `${format(dateRange.from, 'LLL dd, y')} - ${format(dateRange.to || dateRange.from, 'LLL dd, y')}`
                : 'Selected Period'));

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

    const { summary, monthlyTrends, clientBreakdown, expensesByCategory } =
        data;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Finance Analytics</h1>
                    <p className="text-muted-foreground">
                        Track your earnings, expenses, and profit trends
                    </p>
                </div>                <div className="flex flex-wrap items-center gap-2">
                    {/* Filter Mode Selector */}
                    <Select
                        value={filterMode}
                        onValueChange={(val: any) => setFilterMode(val)}
                    >
                        <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="Filter Mode" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="year-month">Yearly/Monthly</SelectItem>
                            <SelectItem value="single-date">Single Date</SelectItem>
                            <SelectItem value="custom-range">Custom Range</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Dynamic Filters depending on Filter Mode */}
                    {filterMode === 'year-month' && (
                        <>
                            <Select
                                value={selectedMonth}
                                onValueChange={setSelectedMonth}
                            >
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Month" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Months</SelectItem>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(
                                        (m) => (
                                            <SelectItem key={m} value={m.toString()}>
                                                {new Date(0, m - 1).toLocaleString(
                                                    'default',
                                                    { month: 'long' },
                                                )}
                                            </SelectItem>
                                        ),
                                    )}
                                </SelectContent>
                            </Select>

                            <Select
                                value={selectedYear}
                                onValueChange={setSelectedYear}
                            >
                                <SelectTrigger className="w-[100px]">
                                    <SelectValue placeholder="Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map((y) => (
                                        <SelectItem key={y} value={y.toString()}>
                                            {y}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </>
                    )}

                    {filterMode === 'single-date' && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="flex gap-2">
                                    <CalendarIcon className="h-4 w-4" />
                                    {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={setSelectedDate}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    )}

                    {filterMode === 'custom-range' && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="flex gap-2">
                                    <CalendarIcon className="h-4 w-4" />
                                    {dateRange.from ? (
                                        dateRange.to ? (
                                            <>
                                                {format(dateRange.from, 'LLL dd, y')} -{' '}
                                                {format(dateRange.to, 'LLL dd, y')}
                                            </>
                                        ) : (
                                            format(dateRange.from, 'PPP')
                                        )
                                    ) : (
                                        'Pick a date range'
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    selected={{
                                        from: dateRange.from,
                                        to: dateRange.to,
                                    }}
                                    onSelect={(range) =>
                                        setDateRange({
                                            from: range?.from,
                                            to: range?.to,
                                        })
                                    }
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                    )}

                    <div className="w-px h-6 bg-border mx-1 hidden md:block" />

                    {/* Download dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="flex gap-2">
                                <Download className="h-4 w-4" />
                                Download Report
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onClick={() =>
                                    exportAnalyticsToExcel(
                                        data,
                                        filterMode === 'year-month'
                                            ? { year: selectedYear, month: selectedMonth }
                                            : {
                                                startDate: queryParams.startDate,
                                                endDate: queryParams.endDate,
                                              }
                                    )
                                }
                                className="flex gap-2 cursor-pointer"
                            >
                                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                                Excel Format
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() =>
                                    exportAnalyticsToPDF(
                                        data,
                                        filterMode === 'year-month'
                                            ? { year: selectedYear, month: selectedMonth }
                                            : {
                                                startDate: queryParams.startDate,
                                                endDate: queryParams.endDate,
                                              }
                                    )
                                }
                                className="flex gap-2 cursor-pointer"
                            >
                                <FileText className="h-4 w-4 text-red-600" />
                                PDF Format
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
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
                            className={`text-2xl font-bold ${
                                summary.totalProfit >= 0
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
                        <div className="text-2xl font-bold text-orange-600 space-y-1">
                            {summary.unpaidByCurrency &&
                            summary.unpaidByCurrency.length > 0 ? (
                                summary.unpaidByCurrency.map((item, index) => (
                                    <div key={index}>
                                        {formatCurrency(
                                            item.amount,
                                            item.currency,
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div>{formatCurrency(0)}</div>
                            )}
                        </div>

                        <p className="text-xs text-muted-foreground mt-1">
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

                <Card className="bg-linear-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Final Amount
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div
                            className={`text-2xl font-bold ${(summary.finalAmount || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                        >
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
                            Monthly comparison for {periodLabel}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer
                            config={barChartConfig}
                            className="h-[300px] w-full"
                        >
                            <BarChart data={monthlyTrends}>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    className="stroke-muted"
                                />
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
                            Monthly profit for {periodLabel}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer
                            config={barChartConfig}
                            className="h-[300px] w-full"
                        >
                            <LineChart data={monthlyTrends}>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    className="stroke-muted"
                                />
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
                                const chartData =
                                    othersTotal > 0
                                        ? [
                                              ...top5,
                                              {
                                                  categoryId: 'others',
                                                  categoryName: 'Others',
                                                  total: othersTotal,
                                              },
                                          ]
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
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                className="stroke-muted"
                                            />
                                            <XAxis
                                                type="number"
                                                tickFormatter={(v) =>
                                                    formatCurrency(v)
                                                }
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
                                                            formatCurrency(
                                                                Number(value),
                                                            )
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
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        className="stroke-muted"
                                    />
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
                                                    formatCurrency(
                                                        Number(value),
                                                    )
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
                            <CartesianGrid
                                strokeDasharray="3 3"
                                className="stroke-muted"
                            />
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
                            <ChartTooltip content={<ChartTooltipContent />} />
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
