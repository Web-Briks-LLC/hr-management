'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
    IconArrowRight,
    IconCalendar,
    IconTrash,
    IconBuilding,
} from '@tabler/icons-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    useGetTransfersQuery,
    useGetTransferStatsQuery,
    useGetBusinessesQuery,
    useDeleteTransferMutation,
    type IProfitTransfer,
} from '@/redux/features/externalBusiness/externalBusinessApi';

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
const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

export function TransferHistory() {
    const [filters, setFilters] = useState<{
        businessId?: string;
        year?: number;
        month?: number;
    }>({
        year: currentYear,
    });

    const [deletingTransfer, setDeletingTransfer] =
        useState<IProfitTransfer | null>(null);

    const { data: businessesData } = useGetBusinessesQuery();
    const { data: transfersData, isLoading } = useGetTransfersQuery(
        filters.businessId || filters.year || filters.month ? filters : undefined
    );
    const { data: statsData } = useGetTransferStatsQuery(
        filters.year || filters.month
            ? { year: filters.year, month: filters.month }
            : undefined
    );
    const [deleteTransfer, { isLoading: isDeleting }] =
        useDeleteTransferMutation();

    const handleDelete = async () => {
        if (!deletingTransfer) return;
        try {
            const response = await deleteTransfer(deletingTransfer._id).unwrap();
            toast.success(response.message);
            setDeletingTransfer(null);
        } catch (error: unknown) {
            if (error && typeof error === 'object' && 'data' in error) {
                const err = error as { data?: { message?: string } };
                toast.error(err.data?.message || 'Failed to delete transfer');
            } else {
                toast.error('Failed to delete transfer');
            }
        }
    };

    const businesses = businessesData?.data || [];
    const transfers = transfersData?.data || [];
    const stats = statsData?.data;

    const getMonthName = (month: number) => {
        return months.find((m) => m.value === month.toString())?.label || '';
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            {stats && (
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Total Transferred
                            </CardTitle>
                            <IconArrowRight className="size-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                ৳{stats.totalTransferred.toLocaleString()}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Transfer Count
                            </CardTitle>
                            <IconCalendar className="size-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stats.transferCount}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Businesses
                            </CardTitle>
                            <IconBuilding className="size-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stats.byBusiness.length}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <Select
                    value={filters.businessId || 'all'}
                    onValueChange={(v) =>
                        setFilters((f) => ({
                            ...f,
                            businessId: v === 'all' ? undefined : v,
                        }))
                    }
                >
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="All Businesses" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Businesses</SelectItem>
                        {businesses.map((business) => (
                            <SelectItem key={business._id} value={business._id}>
                                {business.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={filters.year?.toString() || 'all'}
                    onValueChange={(v) =>
                        setFilters((f) => ({
                            ...f,
                            year: v === 'all' ? undefined : Number(v),
                        }))
                    }
                >
                    <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        {years.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                                {year}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={filters.month?.toString() || 'all'}
                    onValueChange={(v) =>
                        setFilters((f) => ({
                            ...f,
                            month: v === 'all' ? undefined : Number(v),
                        }))
                    }
                >
                    <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
                        {months.map((month) => (
                            <SelectItem key={month.value} value={month.value}>
                                {month.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {(filters.businessId || filters.year || filters.month) && (
                    <Button
                        variant="ghost"
                        onClick={() =>
                            setFilters({ year: currentYear })
                        }
                    >
                        Clear Filters
                    </Button>
                )}
            </div>

            {/* Transfers Table */}
            {isLoading ? (
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-14 w-full" />
                    ))}
                </div>
            ) : transfers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <IconArrowRight className="size-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">No transfers yet</h3>
                    <p className="text-muted-foreground">
                        Transfer profit to external businesses to see history here.
                    </p>
                </div>
            ) : (
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Business</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Period</TableHead>
                                <TableHead>Transfer Date</TableHead>
                                <TableHead>Transferred By</TableHead>
                                <TableHead className="text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transfers.map((transfer) => (
                                <TableRow key={transfer._id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <IconBuilding className="size-4 text-muted-foreground" />
                                            <span className="font-medium">
                                                {transfer.businessId.name}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-semibold text-primary">
                                        ৳{transfer.amount.toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">
                                            {transfer.periodType === 'month'
                                                ? `${getMonthName(transfer.month!)} ${transfer.year}`
                                                : transfer.year}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {format(
                                            new Date(transfer.transferDate),
                                            'MMM dd, yyyy'
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {transfer.transferredBy.name}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                                setDeletingTransfer(transfer)
                                            }
                                        >
                                            <IconTrash className="size-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Delete Confirmation */}
            <AlertDialog
                open={!!deletingTransfer}
                onOpenChange={(open) => !open && setDeletingTransfer(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Transfer</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this transfer of ৳
                            {deletingTransfer?.amount.toLocaleString()} to{' '}
                            {deletingTransfer?.businessId.name}? This action
                            cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
