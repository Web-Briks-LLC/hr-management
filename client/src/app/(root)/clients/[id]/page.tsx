'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    useGetClientByIdQuery,
    useGetClientStatsQuery,
} from '@/redux/features/client/clientApi';
import {
    useGetOrdersQuery,
    useGetOrderYearsQuery,
} from '@/redux/features/order/orderApi';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    ArrowLeft,
    Package,
    DollarSign,
    Image as ImageIcon,
    Banknote,
    AlertCircle,
    ExternalLink,
    Mail,
    Phone,
    MapPin,
    Building2,
    Search,
    Filter,
    X,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from 'lucide-react';
import { format } from 'date-fns';
import type { IOrder, OrderStatus, OrderPriority } from '@/types/order.type';
import { ORDER_STATUS_LABELS, ORDER_PRIORITY_LABELS } from '@/types/order.type';
import Link from 'next/link';

const statusColors: Record<OrderStatus, string> = {
    pending: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
    in_progress: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
    quality_check: 'bg-purple-500/20 text-purple-700 dark:text-purple-400',
    revision: 'bg-orange-500/20 text-orange-700 dark:text-orange-400',
    completed: 'bg-green-500/20 text-green-700 dark:text-green-400',
    delivered: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
    cancelled: 'bg-red-500/20 text-red-700 dark:text-red-400',
};

const priorityColors: Record<OrderPriority, string> = {
    low: 'bg-muted text-muted-foreground',
    normal: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
    high: 'bg-orange-500/20 text-orange-700 dark:text-orange-400',
    urgent: 'bg-red-500/20 text-red-700 dark:text-red-400',
};

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

export default function ClientDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const clientId = params.id as string;

    // Filter states
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<OrderStatus | ''>('');
    const [selectedPriority, setSelectedPriority] = useState<
        OrderPriority | ''
    >('');
    const [limit, setLimit] = useState(10);
    const perPageOptions = [10, 20, 50, 100];

    // Queries
    const { data: client, isLoading: isLoadingClient } =
        useGetClientByIdQuery(clientId);
    const { data: stats, isLoading: isLoadingStats } =
        useGetClientStatsQuery(clientId);
    const { data: yearsData } = useGetOrderYearsQuery();
    const {
        data: ordersData,
        isLoading: isLoadingOrders,
        isFetching,
    } = useGetOrdersQuery({
        clientId,
        page,
        limit,
        search: search || undefined,
        month: selectedMonth ? parseInt(selectedMonth) : undefined,
        year: selectedYear ? parseInt(selectedYear) : undefined,
        status: selectedStatus || undefined,
        priority: selectedPriority || undefined,
    });

    const orders = ordersData?.data || [];
    const meta = ordersData?.meta;
    const totalPages = meta?.totalPages || 1;

    const sortedYears = useMemo(() => {
        if (!yearsData?.data) {
            const currentYear = new Date().getFullYear();
            return Array.from(
                { length: currentYear - 2020 + 2 },
                (_, i) => 2020 + i,
            );
        }
        return yearsData.data.sort((a, b) => b - a);
    }, [yearsData]);

    const formatCurrency = (amount: number, currency: string = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(amount);
    };

    const formatBDT = (amount: number) => {
        return new Intl.NumberFormat('bn-BD', {
            style: 'currency',
            currency: 'BDT',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const clearFilters = () => {
        setSearch('');
        setSelectedMonth('');
        setSelectedYear('');
        setSelectedStatus('');
        setSelectedPriority('');
        setLimit(10);
        setPage(1);
    };

    // Generate pagination numbers
    const getPaginationNumbers = () => {
        const pages: (number | string)[] = [];

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);

            if (page > 3) pages.push('...');

            const start = Math.max(2, page - 1);
            const end = Math.min(totalPages - 1, page + 1);

            for (let i = start; i <= end; i++) {
                if (!pages.includes(i)) pages.push(i);
            }

            if (page < totalPages - 2) pages.push('...');

            if (!pages.includes(totalPages)) pages.push(totalPages);
        }

        return pages;
    };

    if (isLoadingClient) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-32 rounded-2xl" />
                    ))}
                </div>
                <Skeleton className="h-48 rounded-2xl" />
                <Skeleton className="h-96 rounded-2xl" />
            </div>
        );
    }

    if (!client) {
        return (
            <div className="p-6">
                <Card>
                    <CardContent className="py-12 text-center">
                        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h2 className="text-xl font-semibold mb-2">
                            Client Not Found
                        </h2>
                        <p className="text-muted-foreground mb-4">
                            The client you&apos;re looking for doesn&apos;t
                            exist.
                        </p>
                        <Button onClick={() => router.push('/clients')}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Clients
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => router.push('/clients')}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{client.name}</h1>
                        <p className="text-muted-foreground">
                            {client.clientId} • {client.email}
                        </p>
                    </div>
                </div>
                <Badge
                    variant={
                        client.status === 'active' ? 'default' : 'secondary'
                    }
                    className="text-sm px-3 py-1"
                >
                    {client.status}
                </Badge>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Total Orders */}
                <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-slate-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-slate-500/5 hover:border-slate-500/30">
                    <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-slate-500/10 blur-2xl transition-all duration-300 group-hover:bg-slate-500/20" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/10 text-slate-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-slate-500/20">
                                <Package className="h-5 w-5" />
                            </div>
                        </div>
                        {isLoadingStats ? (
                            <Skeleton className="h-8 w-16" />
                        ) : (
                            <h3 className="text-3xl font-bold tracking-tight text-slate-600 dark:text-slate-300">
                                {stats?.totalOrders || 0}
                            </h3>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                            Total Orders
                        </p>
                    </div>
                </div>

                {/* Total USD */}
                <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-blue-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-500/30">
                    <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-blue-500/10 blur-2xl transition-all duration-300 group-hover:bg-blue-500/20" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-500/20">
                                <DollarSign className="h-5 w-5" />
                            </div>
                        </div>
                        {isLoadingStats ? (
                            <Skeleton className="h-8 w-24" />
                        ) : (
                            <h3 className="text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                                {formatCurrency(
                                    stats?.totalAmount || 0,
                                    client.currency || 'USD',
                                )}
                            </h3>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                            Total {client.currency || 'USD'}
                        </p>
                    </div>
                </div>

                {/* Total Images */}
                <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-purple-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/5 hover:border-purple-500/30">
                    <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-purple-500/10 blur-2xl transition-all duration-300 group-hover:bg-purple-500/20" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-purple-500/20">
                                <ImageIcon className="h-5 w-5" />
                            </div>
                        </div>
                        {isLoadingStats ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <h3 className="text-3xl font-bold tracking-tight text-purple-600 dark:text-purple-400">
                                {(stats?.totalImages || 0).toLocaleString()}
                            </h3>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                            Total Images
                        </p>
                    </div>
                </div>

                {/* Total BDT */}
                <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-green-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/5 hover:border-green-500/30">
                    <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-green-500/10 blur-2xl transition-all duration-300 group-hover:bg-green-500/20" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-green-500/20">
                                <Banknote className="h-5 w-5" />
                            </div>
                        </div>
                        {isLoadingStats ? (
                            <Skeleton className="h-8 w-28" />
                        ) : (
                            <h3 className="text-3xl font-bold tracking-tight text-green-600 dark:text-green-400">
                                {formatBDT(stats?.totalBDT || 0)}
                            </h3>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                            Total BDT
                        </p>
                    </div>
                </div>
            </div>

            {/* Client Information Card */}
            <Card className="border-0 bg-gradient-to-br from-primary/5 via-card to-card shadow-lg">
                <CardHeader className="pb-4">
                    <CardTitle className="text-xl">
                        Client Information
                    </CardTitle>
                    <CardDescription>
                        Contact and business details
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                <Mail className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Email
                                </p>
                                <p className="font-medium">{client.email}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                <Phone className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Phone
                                </p>
                                <p className="font-medium">
                                    {client.phone || 'N/A'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                <MapPin className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Address
                                </p>
                                <p className="font-medium">
                                    {client.address || 'N/A'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Office Address
                                </p>
                                <p className="font-medium">
                                    {client.officeAddress || 'N/A'}
                                </p>
                            </div>
                        </div>
                        {client.description && (
                            <div className="md:col-span-2 lg:col-span-4 flex items-start gap-3 pt-2 border-t">
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        Description
                                    </p>
                                    <p className="font-medium">
                                        {client.description}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Orders Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">Orders</CardTitle>
                    <CardDescription>
                        All orders from this client
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Filters */}
                    <div className="rounded-xl border bg-muted/30 p-4">
                        <div className="flex items-center gap-2 mb-4">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Filters</span>
                        </div>
                        <TooltipProvider>
                            <div className="flex flex-wrap gap-4 items-center">
                                {/* Search */}
                                <div className="relative flex-1 min-w-[200px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search orders..."
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setPage(1);
                                        }}
                                        className="pl-9 bg-background"
                                    />
                                </div>

                                {/* Month Filter */}
                                <Select
                                    value={selectedMonth}
                                    onValueChange={(v) => {
                                        setSelectedMonth(v);
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger className="bg-background w-[140px]">
                                        <SelectValue placeholder="All Months" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {months.map((m) => (
                                            <SelectItem
                                                key={m.value}
                                                value={m.value}
                                            >
                                                {m.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Year Filter */}
                                <Select
                                    value={selectedYear}
                                    onValueChange={(v) => {
                                        setSelectedYear(v);
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger className="bg-background w-[120px]">
                                        <SelectValue placeholder="All Years" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sortedYears.map((y) => (
                                            <SelectItem
                                                key={y}
                                                value={y.toString()}
                                            >
                                                {y}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Status Filter */}
                                <Select
                                    value={selectedStatus}
                                    onValueChange={(v) => {
                                        setSelectedStatus(v as OrderStatus);
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger className="bg-background w-[140px]">
                                        <SelectValue placeholder="All Statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(
                                            ORDER_STATUS_LABELS,
                                        ).map(([val, label]) => (
                                            <SelectItem key={val} value={val}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Priority Filter */}
                                <Select
                                    value={selectedPriority}
                                    onValueChange={(v) => {
                                        setSelectedPriority(v as OrderPriority);
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger className="bg-background w-[140px]">
                                        <SelectValue placeholder="All Priorities" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(
                                            ORDER_PRIORITY_LABELS,
                                        ).map(([val, label]) => (
                                            <SelectItem key={val} value={val}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Per Page Select */}
                                <Select
                                    value={limit.toString()}
                                    onValueChange={(v) => {
                                        setLimit(parseInt(v));
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger className="bg-background w-[120px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {perPageOptions.map((opt) => (
                                            <SelectItem
                                                key={opt}
                                                value={opt.toString()}
                                            >
                                                {opt}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Clear Filters */}
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={clearFilters}
                                            className="bg-background"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Clear Filters
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        </TooltipProvider>
                    </div>

                    {/* Table */}
                    <div className="border rounded-lg">
                        {isLoadingOrders ? (
                            <div className="p-8 space-y-2">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <Skeleton key={i} className="h-12 w-full" />
                                ))}
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="p-12 text-center text-muted-foreground">
                                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No orders found for this client</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="border-r">
                                            Order Name
                                        </TableHead>
                                        <TableHead className="border-r">
                                            Order Date
                                        </TableHead>
                                        <TableHead className="border-r">
                                            Deadline
                                        </TableHead>
                                        <TableHead className="border-r text-center">
                                            Images
                                        </TableHead>
                                        <TableHead className="border-r">
                                            Total Price
                                        </TableHead>
                                        <TableHead className="border-r text-center">
                                            Status
                                        </TableHead>
                                        <TableHead className="border-r text-center">
                                            Priority
                                        </TableHead>
                                        <TableHead className="text-center">
                                            Action
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {orders.map((order: IOrder) => (
                                        <TableRow key={order._id}>
                                            <TableCell className="font-medium border-r">
                                                {order.orderName}
                                            </TableCell>
                                            <TableCell className="border-r">
                                                {format(
                                                    new Date(order.orderDate),
                                                    'MMM dd, yyyy',
                                                )}
                                            </TableCell>
                                            <TableCell className="border-r">
                                                {format(
                                                    new Date(order.deadline),
                                                    'MMM dd, yyyy HH:mm',
                                                )}
                                            </TableCell>
                                            <TableCell className="border-r text-center">
                                                {order.imageQuantity}
                                            </TableCell>
                                            <TableCell className="font-medium border-r">
                                                {formatCurrency(
                                                    order.totalPrice,
                                                    client.currency || 'USD',
                                                )}
                                            </TableCell>
                                            <TableCell className="border-r text-center">
                                                <Badge
                                                    className={
                                                        statusColors[
                                                            order.status
                                                        ]
                                                    }
                                                >
                                                    {
                                                        ORDER_STATUS_LABELS[
                                                            order.status
                                                        ]
                                                    }
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="border-r text-center">
                                                <Badge
                                                    className={
                                                        priorityColors[
                                                            order.priority
                                                        ]
                                                    }
                                                >
                                                    {
                                                        ORDER_PRIORITY_LABELS[
                                                            order.priority
                                                        ]
                                                    }
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    asChild
                                                >
                                                    <Link
                                                        href={`/orders?id=${order._id}`}
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>

                    {/* Pagination */}
                    {meta && totalPages > 1 && (
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                                Showing {(page - 1) * limit + 1} to{' '}
                                {Math.min(page * limit, meta.total)} of{' '}
                                {meta.total} orders
                            </div>
                            <div className="flex items-center gap-1">
                                {/* First Page */}
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setPage(1)}
                                    disabled={page === 1 || isFetching}
                                >
                                    <ChevronsLeft className="h-4 w-4" />
                                </Button>

                                {/* Previous */}
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() =>
                                        setPage((p) => Math.max(1, p - 1))
                                    }
                                    disabled={page === 1 || isFetching}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>

                                {/* Page Numbers */}
                                {getPaginationNumbers().map((pageNum, idx) =>
                                    pageNum === '...' ? (
                                        <span
                                            key={`ellipsis-${idx}`}
                                            className="px-2 text-muted-foreground"
                                        >
                                            ...
                                        </span>
                                    ) : (
                                        <Button
                                            key={pageNum}
                                            variant={
                                                page === pageNum
                                                    ? 'default'
                                                    : 'outline'
                                            }
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() =>
                                                setPage(pageNum as number)
                                            }
                                            disabled={isFetching}
                                        >
                                            {pageNum}
                                        </Button>
                                    ),
                                )}

                                {/* Next */}
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() =>
                                        setPage((p) =>
                                            Math.min(totalPages, p + 1),
                                        )
                                    }
                                    disabled={page === totalPages || isFetching}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>

                                {/* Last Page */}
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setPage(totalPages)}
                                    disabled={page === totalPages || isFetching}
                                >
                                    <ChevronsRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
