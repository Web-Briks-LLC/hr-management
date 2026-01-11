'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
    Plus,
    Trash2,
    DollarSign,
    TrendingUp,
    Wallet,
    Calendar,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Eye,
    Pencil,
    CalendarDays,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
    useGetEarningsQuery,
    useGetEarningStatsQuery,
    useLazyGetOrdersForWithdrawalQuery,
    useCreateEarningMutation,
    useUpdateEarningMutation,
    useDeleteEarningMutation,
} from '@/redux/features/earning/earningApi';
import { useGetClientsQuery } from '@/redux/features/client/clientApi';
import type { IEarning, EarningFilters, CreateEarningInput, UpdateEarningInput } from '@/types/earning.type';
import { CURRENCIES, CURRENCY_SYMBOLS } from '@/types/earning.type';

const MONTHS = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function EarningsPage() {
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState<EarningFilters>({
        limit: 10,
    });
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedEarning, setSelectedEarning] = useState<IEarning | null>(null);

    // Withdrawal form state
    const [selectedClientId, setSelectedClientId] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [currency, setCurrency] = useState('USD');
    const [fees, setFees] = useState('0');
    const [tax, setTax] = useState('0');
    const [conversionRate, setConversionRate] = useState('120');
    const [notes, setNotes] = useState('');

    // Edit form state
    const [editFees, setEditFees] = useState('0');
    const [editTax, setEditTax] = useState('0');
    const [editConversionRate, setEditConversionRate] = useState('120');
    const [editCurrency, setEditCurrency] = useState('USD');
    const [editNotes, setEditNotes] = useState('');

    // Queries
    const { data: earningsData, isLoading, isFetching } = useGetEarningsQuery({
        ...filters,
        page,
    });
    const { data: statsData } = useGetEarningStatsQuery();
    const { data: clientsData } = useGetClientsQuery({ limit: 100 });

    // Lazy query for orders
    const [getOrders, { data: ordersData, isLoading: isLoadingOrders }] =
        useLazyGetOrdersForWithdrawalQuery();

    // Mutations
    const [createEarning, { isLoading: isCreating }] = useCreateEarningMutation();
    const [updateEarning, { isLoading: isUpdating }] = useUpdateEarningMutation();
    const [deleteEarning, { isLoading: isDeleting }] = useDeleteEarningMutation();

    const earnings = earningsData?.data || [];
    const meta = earningsData?.meta;
    const stats = statsData?.data;
    const clients = clientsData?.clients || [];

    // Calculate amounts for create form
    const totalOrderAmount = ordersData?.totalAmount || 0;
    const feesNum = parseFloat(fees) || 0;
    const taxNum = parseFloat(tax) || 0;
    const rateNum = parseFloat(conversionRate) || 1;
    const netAmount = totalOrderAmount - feesNum - taxNum;
    const amountInBDT = netAmount * rateNum;

    // Calculate amounts for edit form
    const editFeesNum = parseFloat(editFees) || 0;
    const editTaxNum = parseFloat(editTax) || 0;
    const editRateNum = parseFloat(editConversionRate) || 1;
    const editTotalAmount = selectedEarning?.totalOrderAmount || 0;
    const editNetAmount = editTotalAmount - editFeesNum - editTaxNum;
    const editAmountInBDT = editNetAmount * editRateNum;

    const handleClientChange = (clientId: string) => {
        setSelectedClientId(clientId);
        const client = clients.find((c) => c._id === clientId);
        if (client?.currency) {
            setCurrency(client.currency);
        }
    };

    const handleFetchOrders = async () => {
        if (!selectedClientId) {
            toast.error('Please select a client');
            return;
        }
        await getOrders({
            clientId: selectedClientId,
            month: selectedMonth,
            year: selectedYear,
        });
    };

    const handleCreateEarning = async () => {
        if (!selectedClientId) {
            toast.error('Please select a client');
            return;
        }

        const data: CreateEarningInput = {
            clientId: selectedClientId,
            orderIds: ordersData?.data.map((o) => o._id) || [],
            month: selectedMonth,
            year: selectedYear,
            totalOrderAmount,
            fees: feesNum,
            tax: taxNum,
            currency,
            conversionRate: rateNum,
            notes: notes || undefined,
        };

        try {
            await createEarning(data).unwrap();
            toast.success('Earning recorded successfully');
            setIsAddDialogOpen(false);
            resetForm();
        } catch (error) {
            console.error('Error creating earning:', error);
            toast.error('Failed to create earning');
        }
    };

    const openViewDialog = (earning: IEarning) => {
        setSelectedEarning(earning);
        setIsViewDialogOpen(true);
    };

    const openEditDialog = (earning: IEarning) => {
        setSelectedEarning(earning);
        setEditFees(earning.fees.toString());
        setEditTax(earning.tax.toString());
        setEditConversionRate(earning.conversionRate.toString());
        setEditCurrency(earning.currency);
        setEditNotes(earning.notes || '');
        setIsEditDialogOpen(true);
    };

    const handleUpdateEarning = async () => {
        if (!selectedEarning) return;

        const data: UpdateEarningInput = {
            fees: editFeesNum,
            tax: editTaxNum,
            currency: editCurrency,
            conversionRate: editRateNum,
            notes: editNotes || undefined,
        };

        try {
            await updateEarning({ id: selectedEarning._id, data }).unwrap();
            toast.success('Earning updated successfully');
            setIsEditDialogOpen(false);
            setSelectedEarning(null);
        } catch (error) {
            console.error('Error updating earning:', error);
            toast.error('Failed to update earning');
        }
    };

    const handleDeleteEarning = async () => {
        if (!selectedEarning) return;
        try {
            await deleteEarning(selectedEarning._id).unwrap();
            toast.success('Earning deleted successfully');
            setIsDeleteDialogOpen(false);
            setSelectedEarning(null);
        } catch (error) {
            console.error('Error deleting earning:', error);
            toast.error('Failed to delete earning');
        }
    };

    const resetForm = () => {
        setSelectedClientId('');
        setSelectedMonth(new Date().getMonth() + 1);
        setSelectedYear(currentYear);
        setCurrency('USD');
        setFees('0');
        setTax('0');
        setConversionRate('120');
        setNotes('');
    };

    const formatCurrency = (amount: number, curr: string = 'BDT') => {
        if (curr === 'BDT') {
            return `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}`;
        }
        const symbol = CURRENCY_SYMBOLS[curr] || '$';
        return `${symbol}${amount.toFixed(2)}`;
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Earnings
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(stats?.totalEarnings || 0)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            This Month
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {formatCurrency(stats?.thisMonthEarnings || 0)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Withdrawals
                        </CardTitle>
                        <Wallet className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">
                            {stats?.totalWithdrawals || 0}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            This Month Withdrawals
                        </CardTitle>
                        <Calendar className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                            {stats?.thisMonthWithdrawals || 0}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Card */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-2xl">Earnings</CardTitle>
                        <CardDescription>
                            Track your earnings from order payments
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => router.push('/earnings/monthly-summary')}
                        >
                            <CalendarDays />
                            Monthly Summary
                        </Button>
                        <Dialog
                            open={isAddDialogOpen}
                            onOpenChange={(open) => {
                                setIsAddDialogOpen(open);
                                if (!open) resetForm();
                            }}
                        >
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus />
                                    Add Withdrawal
                                </Button>
                            </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Record Withdrawal</DialogTitle>
                                <DialogDescription>
                                    Record earnings from client order payments
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                {/* Client & Period Selection */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>Client *</Label>
                                        <Select
                                            value={selectedClientId}
                                            onValueChange={handleClientChange}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select client" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {clients.map((client) => (
                                                    <SelectItem
                                                        key={client._id}
                                                        value={client._id}
                                                    >
                                                        {client.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Month *</Label>
                                        <Select
                                            value={selectedMonth.toString()}
                                            onValueChange={(v) =>
                                                setSelectedMonth(parseInt(v))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {MONTHS.map((m) => (
                                                    <SelectItem
                                                        key={m.value}
                                                        value={m.value.toString()}
                                                    >
                                                        {m.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Year *</Label>
                                        <Select
                                            value={selectedYear.toString()}
                                            onValueChange={(v) =>
                                                setSelectedYear(parseInt(v))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {YEARS.map((y) => (
                                                    <SelectItem
                                                        key={y}
                                                        value={y.toString()}
                                                    >
                                                        {y}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleFetchOrders}
                                    disabled={!selectedClientId || isLoadingOrders}
                                >
                                    {isLoadingOrders && (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    )}
                                    Fetch Orders
                                </Button>

                                {/* Orders Summary */}
                                {ordersData && (
                                    <div className="bg-muted p-4 rounded-md space-y-2">
                                        <p className="font-medium">
                                            Found {ordersData.data.length} delivered
                                            order(s)
                                        </p>
                                        <p className="text-lg font-bold">
                                            Total: {formatCurrency(totalOrderAmount, currency)}
                                        </p>
                                        {ordersData.data.length > 0 && (
                                            <div className="text-sm text-muted-foreground max-h-32 overflow-y-auto">
                                                {ordersData.data.map((order) => (
                                                    <div
                                                        key={order._id}
                                                        className="flex justify-between"
                                                    >
                                                        <span>{order.orderName}</span>
                                                        <span>
                                                            {formatCurrency(
                                                                order.totalPrice,
                                                                currency
                                                            )}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Currency & Deductions */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Currency *</Label>
                                        <Select value={currency} onValueChange={setCurrency}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {CURRENCIES.map((c) => (
                                                    <SelectItem key={c.value} value={c.value}>
                                                        {c.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Conversion Rate (to BDT) *</Label>
                                        <Input
                                            type="number"
                                            value={conversionRate}
                                            onChange={(e) => setConversionRate(e.target.value)}
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Fees</Label>
                                        <Input
                                            type="number"
                                            value={fees}
                                            onChange={(e) => setFees(e.target.value)}
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tax</Label>
                                        <Input
                                            type="number"
                                            value={tax}
                                            onChange={(e) => setTax(e.target.value)}
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                </div>

                                {/* Calculation Summary */}
                                <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-md space-y-1">
                                    <div className="flex justify-between">
                                        <span>Total Order Amount:</span>
                                        <span>{formatCurrency(totalOrderAmount, currency)}</span>
                                    </div>
                                    <div className="flex justify-between text-red-600">
                                        <span>- Fees:</span>
                                        <span>{formatCurrency(feesNum, currency)}</span>
                                    </div>
                                    <div className="flex justify-between text-red-600">
                                        <span>- Tax:</span>
                                        <span>{formatCurrency(taxNum, currency)}</span>
                                    </div>
                                    <hr className="my-2" />
                                    <div className="flex justify-between font-medium">
                                        <span>Net Amount:</span>
                                        <span>{formatCurrency(netAmount, currency)}</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold text-green-600">
                                        <span>Amount in BDT:</span>
                                        <span>{formatCurrency(amountInBDT)}</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Notes (optional)</Label>
                                    <Textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Any additional notes..."
                                        rows={2}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setIsAddDialogOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleCreateEarning}
                                    disabled={!selectedClientId || isCreating}
                                >
                                    {isCreating && (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    )}
                                    Record Earning
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Table */}
                    <div className="border">
                        {isLoading ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="border-r">Client</TableHead>
                                        <TableHead className="border-r">Period</TableHead>
                                        <TableHead className="border-r">Amount</TableHead>
                                        <TableHead className="border-r">Net</TableHead>
                                        <TableHead className="border-r">BDT</TableHead>
                                        <TableHead className="border-r">Date</TableHead>
                                        <TableHead className="text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {[...Array(5)].map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="border-r">
                                                <Skeleton className="h-4 w-24" />
                                            </TableCell>
                                            <TableCell className="border-r">
                                                <Skeleton className="h-4 w-20" />
                                            </TableCell>
                                            <TableCell className="border-r">
                                                <Skeleton className="h-4 w-16" />
                                            </TableCell>
                                            <TableCell className="border-r">
                                                <Skeleton className="h-4 w-16" />
                                            </TableCell>
                                            <TableCell className="border-r">
                                                <Skeleton className="h-4 w-20" />
                                            </TableCell>
                                            <TableCell className="border-r">
                                                <Skeleton className="h-4 w-20" />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-1 justify-center">
                                                    <Skeleton className="h-8 w-8" />
                                                    <Skeleton className="h-8 w-8" />
                                                    <Skeleton className="h-8 w-8" />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="border-r">Client</TableHead>
                                        <TableHead className="border-r">Period</TableHead>
                                        <TableHead className="border-r">Amount</TableHead>
                                        <TableHead className="border-r">Net</TableHead>
                                        <TableHead className="border-r">BDT</TableHead>
                                        <TableHead className="border-r">Date</TableHead>
                                        <TableHead className="text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {earnings.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={7}
                                                className="text-center py-8 text-muted-foreground"
                                            >
                                                No earnings recorded yet
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        earnings.map((earning: IEarning) => (
                                            <TableRow key={earning._id}>
                                                <TableCell className="border-r font-medium max-w-[200px] truncate">
                                                    {earning.clientId?.name || '-'}
                                                </TableCell>
                                                <TableCell className="border-r">
                                                    {MONTHS.find(
                                                        (m) => m.value === earning.month
                                                    )?.label || ''}{' '}
                                                    {earning.year}
                                                </TableCell>
                                                <TableCell className="border-r">
                                                    {formatCurrency(
                                                        earning.totalOrderAmount,
                                                        earning.currency
                                                    )}
                                                </TableCell>
                                                <TableCell className="border-r">
                                                    {formatCurrency(
                                                        earning.netAmount,
                                                        earning.currency
                                                    )}
                                                </TableCell>
                                                <TableCell className="border-r font-medium text-green-600">
                                                    {formatCurrency(earning.amountInBDT)}
                                                </TableCell>
                                                <TableCell className="border-r">
                                                    {format(
                                                        new Date(earning.createdAt),
                                                        'MMM dd, yyyy'
                                                    )}
                                                </TableCell>
                                                <TableCell className="w-auto">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openViewDialog(earning)}
                                                            title="View"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openEditDialog(earning)}
                                                            title="Edit"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => {
                                                                setSelectedEarning(earning);
                                                                setIsDeleteDialogOpen(true);
                                                            }}
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </div>

                    {/* Pagination */}
                    {meta && meta.totalPages > 1 && (
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                                Page {meta.page} of {meta.totalPages} ({meta.total} total)
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1 || isFetching}
                                >
                                    <ChevronLeft />
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setPage((p) => Math.min(meta.totalPages, p + 1))
                                    }
                                    disabled={page === meta.totalPages || isFetching}
                                >
                                    Next
                                    <ChevronRight />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* View Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Earning Details</DialogTitle>
                        <DialogDescription>
                            View earning record details
                        </DialogDescription>
                    </DialogHeader>
                    {selectedEarning && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-muted-foreground">Client</Label>
                                    <p className="font-medium">{selectedEarning.clientId?.name || '-'}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Period</Label>
                                    <p className="font-medium">
                                        {MONTHS.find((m) => m.value === selectedEarning.month)?.label} {selectedEarning.year}
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-muted-foreground">Currency</Label>
                                    <p className="font-medium">{selectedEarning.currency}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Conversion Rate</Label>
                                    <p className="font-medium">{selectedEarning.conversionRate}</p>
                                </div>
                            </div>

                            <div className="bg-muted p-4 rounded-md space-y-2">
                                <div className="flex justify-between">
                                    <span>Total Order Amount:</span>
                                    <span className="font-medium">
                                        {formatCurrency(selectedEarning.totalOrderAmount, selectedEarning.currency)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-red-600">
                                    <span>Fees:</span>
                                    <span>-{formatCurrency(selectedEarning.fees, selectedEarning.currency)}</span>
                                </div>
                                <div className="flex justify-between text-red-600">
                                    <span>Tax:</span>
                                    <span>-{formatCurrency(selectedEarning.tax, selectedEarning.currency)}</span>
                                </div>
                                <hr />
                                <div className="flex justify-between font-medium">
                                    <span>Net Amount:</span>
                                    <span>{formatCurrency(selectedEarning.netAmount, selectedEarning.currency)}</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold text-green-600">
                                    <span>Amount in BDT:</span>
                                    <span>{formatCurrency(selectedEarning.amountInBDT)}</span>
                                </div>
                            </div>

                            {selectedEarning.notes && (
                                <div>
                                    <Label className="text-muted-foreground">Notes</Label>
                                    <p className="mt-1">{selectedEarning.notes}</p>
                                </div>
                            )}

                            {selectedEarning.orderIds && selectedEarning.orderIds.length > 0 && (
                                <div>
                                    <Label className="text-muted-foreground">Orders ({selectedEarning.orderIds.length})</Label>
                                    <div className="mt-1 max-h-32 overflow-y-auto text-sm">
                                        {selectedEarning.orderIds.map((order) => (
                                            <div key={order._id} className="flex justify-between py-1">
                                                <span>{order.orderName}</span>
                                                <span>{formatCurrency(order.totalPrice, selectedEarning.currency)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="text-sm text-muted-foreground">
                                Created: {format(new Date(selectedEarning.createdAt), 'PPpp')}
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Earning</DialogTitle>
                        <DialogDescription>
                            Update fees, tax, and conversion rate
                        </DialogDescription>
                    </DialogHeader>
                    {selectedEarning && (
                        <div className="space-y-4">
                            <div className="bg-muted p-3 rounded-md">
                                <p className="font-medium">{selectedEarning.clientId?.name || '-'}</p>
                                <p className="text-sm text-muted-foreground">
                                    {MONTHS.find((m) => m.value === selectedEarning.month)?.label} {selectedEarning.year}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Currency</Label>
                                    <Select value={editCurrency} onValueChange={setEditCurrency}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CURRENCIES.map((c) => (
                                                <SelectItem key={c.value} value={c.value}>
                                                    {c.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Conversion Rate</Label>
                                    <Input
                                        type="number"
                                        value={editConversionRate}
                                        onChange={(e) => setEditConversionRate(e.target.value)}
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Fees</Label>
                                    <Input
                                        type="number"
                                        value={editFees}
                                        onChange={(e) => setEditFees(e.target.value)}
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tax</Label>
                                    <Input
                                        type="number"
                                        value={editTax}
                                        onChange={(e) => setEditTax(e.target.value)}
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Notes</Label>
                                <Textarea
                                    value={editNotes}
                                    onChange={(e) => setEditNotes(e.target.value)}
                                    placeholder="Any additional notes..."
                                    rows={2}
                                />
                            </div>

                            {/* Calculation Preview */}
                            <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-md space-y-1">
                                <div className="flex justify-between">
                                    <span>Total Order Amount:</span>
                                    <span>{formatCurrency(editTotalAmount, editCurrency)}</span>
                                </div>
                                <div className="flex justify-between text-red-600">
                                    <span>- Fees:</span>
                                    <span>{formatCurrency(editFeesNum, editCurrency)}</span>
                                </div>
                                <div className="flex justify-between text-red-600">
                                    <span>- Tax:</span>
                                    <span>{formatCurrency(editTaxNum, editCurrency)}</span>
                                </div>
                                <hr className="my-2" />
                                <div className="flex justify-between font-medium">
                                    <span>Net Amount:</span>
                                    <span>{formatCurrency(editNetAmount, editCurrency)}</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold text-green-600">
                                    <span>Amount in BDT:</span>
                                    <span>{formatCurrency(editAmountInBDT)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateEarning} disabled={isUpdating}>
                            {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Update
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Earning</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this earning record? This
                            action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteEarning}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isDeleting}
                        >
                            {isDeleting && (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            )}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
