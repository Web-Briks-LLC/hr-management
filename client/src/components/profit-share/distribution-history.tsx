'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useGetDistributionsQuery } from '@/redux/features/profitShare/profitShareApi';
import { Loader2, History, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const monthNames = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

export default function DistributionHistory() {
    const { data, isLoading, isFetching } = useGetDistributionsQuery();

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-BD', {
            style: 'currency',
            currency: 'BDT',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const getPeriodLabel = (distribution: any) => {
        if (distribution.periodType === 'year') {
            return `Full Year ${distribution.year}`;
        }
        return `${monthNames[distribution.month]} ${distribution.year}`;
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-16">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Loading history...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const distributions = data?.data || [];

    return (
        <Card>
            <CardHeader className="pb-4">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Distribution History
                    </CardTitle>
                    <CardDescription className="mt-1">
                        View past profit distributions to shareholders
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="font-semibold">Shareholder</TableHead>
                                <TableHead className="font-semibold">Period</TableHead>
                                <TableHead className="font-semibold">Share</TableHead>
                                <TableHead className="font-semibold">Amount</TableHead>
                                <TableHead className="font-semibold">Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {distributions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center">
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            <Calendar className="h-8 w-8 opacity-50" />
                                            <p>No distributions yet</p>
                                            <p className="text-sm">
                                                Distributions will appear here after you distribute profits
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                distributions.map((distribution) => (
                                    <TableRow key={distribution._id} className="hover:bg-muted/30">
                                        <TableCell>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-medium">
                                                    {distribution.shareholderId?.name || 'Unknown'}
                                                </span>
                                                <span className="text-sm text-muted-foreground">
                                                    {distribution.shareholderId?.email || ''}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {getPeriodLabel(distribution)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="font-mono">
                                                {distribution.sharePercentage.toFixed(2)}%
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium text-green-600 dark:text-green-400">
                                                {formatCurrency(distribution.shareAmount)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {distribution.distributedAt
                                                ? format(new Date(distribution.distributedAt), 'MMM dd, yyyy')
                                                : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {isFetching && !isLoading && (
                    <div className="text-sm text-muted-foreground text-center mt-4">Refreshing...</div>
                )}
            </CardContent>
        </Card>
    );
}
