'use client';

import { useState } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    useGetProfitSummaryQuery,
    useGetShareholdersQuery,
} from '@/redux/features/profitShare/profitShareApi';
import { useGetFinanceAnalyticsQuery } from '@/redux/features/analytics/analyticsApi';
import {
    Loader,
    TrendingUp,
    TrendingDown,
    Wallet,
    PieChart,
    DollarSign,
    CreditCard,
    AlertCircle,
    Calculator,
} from 'lucide-react';
import DistributeProfitDialog from './distribute-profit-dialog';
import ShareProfitDialog from './share-profit-dialog';

const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => ({
    value: String(currentYear - i),
    label: String(currentYear - i),
}));

export default function ProfitOverview() {
    const [periodType, setPeriodType] = useState<'month' | 'year'>('month');
    const [selectedMonth, setSelectedMonth] = useState(
        String(new Date().getMonth() + 1),
    );
    const [selectedYear, setSelectedYear] = useState(String(currentYear));

    const { data: summaryData, isLoading: isLoadingSummary } =
        useGetProfitSummaryQuery({
            periodType,
            month: periodType === 'month' ? parseInt(selectedMonth) : undefined,
            year: parseInt(selectedYear),
        });

    const { data: shareholdersData } = useGetShareholdersQuery();
    const { data: analyticsData } = useGetFinanceAnalyticsQuery({ months: 12 });

    const summary = summaryData?.data;
    const shareholders = shareholdersData?.data || [];
    const activeShareholders = shareholders.filter((s) => s.isActive);
    const analytics = analyticsData?.summary;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-BD', {
            style: 'currency',
            currency: 'BDT',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className="space-y-6">
            {/* Period Selector */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2">
                        <PieChart className="h-5 w-5" />
                        Profit Summary
                    </CardTitle>
                    <CardDescription>
                        View earnings, expenses, and net profit for a selected
                        period
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="space-y-2">
                            <Label>Period Type</Label>
                            <Select
                                value={periodType}
                                onValueChange={(value: 'month' | 'year') =>
                                    setPeriodType(value)
                                }
                            >
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="month">
                                        Monthly
                                    </SelectItem>
                                    <SelectItem value="year">Yearly</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {periodType === 'month' && (
                            <div className="space-y-2">
                                <Label>Month</Label>
                                <Select
                                    value={selectedMonth}
                                    onValueChange={setSelectedMonth}
                                >
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {months.map((month) => (
                                            <SelectItem
                                                key={month.value}
                                                value={month.value}
                                            >
                                                {month.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Year</Label>
                            <Select
                                value={selectedYear}
                                onValueChange={setSelectedYear}
                            >
                                <SelectTrigger className="w-[120px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map((year) => (
                                        <SelectItem
                                            key={year.value}
                                            value={year.value}
                                        >
                                            {year.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            {isLoadingSummary ? (
                <div className="flex items-center justify-center py-12">
                    <Loader className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Total Earnings */}
                    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                                        Total Earnings
                                    </p>
                                    <p className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">
                                        {formatCurrency(
                                            summary?.totalEarnings || 0,
                                        )}
                                    </p>
                                </div>
                                <div className="rounded-full bg-green-100 dark:bg-green-900/50 p-2">
                                    <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Total Expenses */}
                    <Card className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200 dark:border-red-800">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-red-600 dark:text-red-400">
                                        Total Expenses
                                    </p>
                                    <p className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1">
                                        {formatCurrency(
                                            summary?.totalExpenses || 0,
                                        )}
                                    </p>
                                </div>
                                <div className="rounded-full bg-red-100 dark:bg-red-900/50 p-2">
                                    <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Net Profit */}
                    <Card
                        className={`bg-gradient-to-br ${
                            (summary?.netProfit || 0) >= 0
                                ? 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800'
                                : 'from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800'
                        }`}
                    >
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p
                                        className={`text-sm font-medium ${
                                            (summary?.netProfit || 0) >= 0
                                                ? 'text-blue-600 dark:text-blue-400'
                                                : 'text-amber-600 dark:text-amber-400'
                                        }`}
                                    >
                                        Net Profit
                                    </p>
                                    <p
                                        className={`text-2xl font-bold mt-1 ${
                                            (summary?.netProfit || 0) >= 0
                                                ? 'text-blue-700 dark:text-blue-300'
                                                : 'text-amber-700 dark:text-amber-300'
                                        }`}
                                    >
                                        {formatCurrency(
                                            summary?.netProfit || 0,
                                        )}
                                    </p>
                                </div>
                                <div
                                    className={`rounded-full p-2 ${
                                        (summary?.netProfit || 0) >= 0
                                            ? 'bg-blue-100 dark:bg-blue-900/50'
                                            : 'bg-amber-100 dark:bg-amber-900/50'
                                    }`}
                                >
                                    <Wallet
                                        className={`h-5 w-5 ${
                                            (summary?.netProfit || 0) >= 0
                                                ? 'text-blue-600 dark:text-blue-400'
                                                : 'text-amber-600 dark:text-amber-400'
                                        }`}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Debit (Owed to us) */}
                    <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200 dark:border-purple-800">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                                        Debit Balance
                                    </p>
                                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1">
                                        {formatCurrency(
                                            analytics?.totalDebit || 0,
                                        )}
                                    </p>
                                    <p className="text-xs text-purple-500 dark:text-purple-400 mt-0.5">
                                        Borrow - Return
                                    </p>
                                </div>
                                <div className="rounded-full bg-purple-100 dark:bg-purple-900/50 p-2">
                                    <CreditCard className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Unpaid Revenue */}
                    <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200 dark:border-orange-800">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                                        Unpaid Revenue
                                    </p>
                                    <p className="text-2xl font-bold text-orange-700 dark:text-orange-300 mt-1">
                                        {formatCurrency(
                                            analytics?.unpaidRevenue || 0,
                                        )}
                                    </p>
                                    <p className="text-xs text-orange-500 dark:text-orange-400 mt-0.5">
                                        Not yet withdrawn
                                    </p>
                                </div>
                                <div className="rounded-full bg-orange-100 dark:bg-orange-900/50 p-2">
                                    <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Final Amount */}
                    <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border-teal-200 dark:border-teal-800">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-teal-600 dark:text-teal-400">
                                        Final Amount
                                    </p>
                                    <p
                                        className={`text-2xl font-bold mt-1 ${(analytics?.finalAmount || 0) >= 0 ? 'text-teal-700 dark:text-teal-300' : 'text-red-700 dark:text-red-300'}`}
                                    >
                                        {formatCurrency(
                                            analytics?.finalAmount || 0,
                                        )}
                                    </p>
                                    <p className="text-xs text-teal-500 dark:text-teal-400 mt-0.5">
                                        Profit - Shared + Debit
                                    </p>
                                </div>
                                <div className="rounded-full bg-teal-100 dark:bg-teal-900/50 p-2">
                                    <Calculator className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Distribution Action */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="font-semibold">
                                Share & Distribute Profit
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                {activeShareholders.length === 0
                                    ? 'Add shareholders first to share or distribute profits'
                                    : `Share or distribute to ${activeShareholders.length} active shareholder${activeShareholders.length > 1 ? 's' : ''}`}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <ShareProfitDialog />
                            <DistributeProfitDialog
                                shareholders={activeShareholders}
                                netProfit={summary?.netProfit || 0}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
