"use client";

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    useGetClientByIdQuery,
    useGetClientStatsQuery,
} from '@/redux/features/client/clientApi';
import { useGetOrdersQuery } from '@/redux/features/order/orderApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    ArrowLeft,
    RefreshCw,
    Search,
    Filter,
    X,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from 'lucide-react';
import Link from 'next/link';
import type { OrderStatus, OrderPriority } from '@/types/order.type';
import { MONTH_OPTIONS, PER_PAGE_OPTIONS, ORDER_STATUS_LABELS, ORDER_PRIORITY_LABELS } from '@/lib/constants';
import { ClientInfoCard } from '@/components/client/ClientInfoCard';
import { ClientOrderStats } from '@/components/client/ClientOrderStats';
import { OrderHistoryTable } from '@/components/client/OrderHistoryTable';

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

    // Queries
    const { data: client, isLoading: isLoadingClient } =
        useGetClientByIdQuery(clientId);
    const { data: stats, isLoading: isLoadingStats, refetch: refetchStats } = useGetClientStatsQuery({
        clientId,
        month: selectedMonth ? parseInt(selectedMonth) : undefined,
        year: selectedYear ? parseInt(selectedYear) : undefined,
        status: selectedStatus || undefined,
        priority: selectedPriority || undefined,
        search: search || undefined,
    });

    const {
        data: ordersData,
        isLoading: isLoadingOrders,
        isFetching: isFetchingOrders,
        refetch: refetchOrders,
    } = useGetOrdersQuery({
        clientId,
        page,
        limit,
        search: search || undefined,
        status: selectedStatus || undefined,
        priority: selectedPriority || undefined,
        month: selectedMonth ? parseInt(selectedMonth) : undefined,
        year: selectedYear ? parseInt(selectedYear) : undefined,
    });

    const orders = ordersData?.data || [];
    const pagination = ordersData?.meta || { total: 0, page: 1, totalPages: 1 };

    const handleClearFilters = () => {
        setSearch('');
        setSelectedMonth('');
        setSelectedYear('');
        setSelectedStatus('');
        setSelectedPriority('');
        setPage(1);
    };

    const handleRefresh = () => {
        refetchStats();
        refetchOrders();
    };

    if (isLoadingClient) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <RefreshCw className="h-8 w-8 animate-spin text-primary/40" />
            </div>
        );
    }

    if (!client) {
        return (
            <div className="p-6 text-center">
                <h2 className="text-xl font-bold">Client not found</h2>
                <Button variant="link" asChild>
                    <Link href="/clients">Back to Clients</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        className="rounded-full h-10 w-10 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            {client.name}
                            <span className="text-sm font-mono text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded uppercase">
                                {client.clientId}
                            </span>
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Client overview and order history
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetchingOrders || isLoadingStats}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${isFetchingOrders ? 'animate-spin' : ''}`} />
                        Refresh Data
                    </Button>
                    <Button variant="default" size="sm" asChild>
                        <Link href={`/orders?clientId=${client._id}`}>
                            New Order
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Client Info Card */}
            <ClientInfoCard client={client} />

            {/* Order Stats */}
            <ClientOrderStats 
                stats={stats} 
                isLoading={isLoadingStats} 
                currency={client.currency} 
            />

            {/* Orders Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        Order History
                        <span className="text-sm font-normal text-muted-foreground ml-2">
                            ({pagination.total} total)
                        </span>
                    </h2>
                </div>

                {/* Filters */}
                <div className="bg-card p-4 rounded-xl border shadow-sm space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                        <div className="relative group lg:col-span-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="Search orders..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="pl-9 h-9 bg-muted/40 border-slate-200"
                            />
                        </div>

                        <Select
                            value={selectedMonth}
                            onValueChange={(val) => {
                                setSelectedMonth(val);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="h-9 bg-muted/40 border-slate-200">
                                <SelectValue placeholder="Month" />
                            </SelectTrigger>
                            <SelectContent>
                                {MONTH_OPTIONS.map((m) => (
                                    <SelectItem key={m.value} value={m.value}>
                                        {m.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={selectedStatus}
                            onValueChange={(val) => {
                                setSelectedStatus(val as OrderStatus);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="h-9 bg-muted/40 border-slate-200 uppercase text-[11px] font-bold">
                                <Filter className="h-3 w-3 mr-2" />
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={selectedPriority}
                            onValueChange={(val) => {
                                setSelectedPriority(val as OrderPriority);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="h-9 bg-muted/40 border-slate-200 uppercase text-[11px] font-bold">
                                <SelectValue placeholder="Priority" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(ORDER_PRIORITY_LABELS).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleClearFilters}
                            disabled={!search && !selectedMonth && !selectedStatus && !selectedPriority}
                            className="h-9 text-muted-foreground"
                        >
                            <X className="h-4 w-4 mr-2" />
                            Clear
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <OrderHistoryTable 
                    orders={orders} 
                    isLoading={isLoadingOrders} 
                    currency={client.currency} 
                />

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border rounded-xl bg-muted/20">
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-muted-foreground">
                            Showing <span className="font-medium text-foreground">{orders.length}</span> of <span className="font-medium text-foreground">{pagination.total}</span> orders
                        </div>
                        <div className="h-4 w-px bg-slate-300 hidden sm:block" />
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Per page</span>
                            <Select
                                value={limit.toString()}
                                onValueChange={(val) => {
                                    setLimit(parseInt(val));
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="h-7 w-[70px] text-xs bg-background">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PER_PAGE_OPTIONS.map((opt) => (
                                        <SelectItem key={opt} value={opt.toString()} className="text-xs">
                                            {opt}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setPage(1)}
                            disabled={page === 1 || isLoadingOrders}
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1 || isLoadingOrders}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-1.5 px-3">
                            <span className="text-sm font-medium">Page</span>
                            <span className="flex h-7 w-12 items-center justify-center rounded-md border bg-background text-sm font-bold text-primary">
                                {page}
                            </span>
                            <span className="text-sm font-medium text-muted-foreground">
                                of {pagination.totalPages}
                            </span>
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                            disabled={page === pagination.totalPages || isLoadingOrders}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setPage(pagination.totalPages)}
                            disabled={page === pagination.totalPages || isLoadingOrders}
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
