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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ArrowLeft,
    Search,
    Filter,
    X,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    RefreshCcw,
    Plus,
    ShoppingBag,
} from 'lucide-react';
import Link from 'next/link';
import type { OrderStatus, OrderPriority } from '@/types/order.type';
import { MONTH_OPTIONS, PER_PAGE_OPTIONS, ORDER_STATUS_LABELS, ORDER_PRIORITY_LABELS } from '@/lib/constants';
import { ClientInfoCard } from '@/components/client/ClientInfoCard';
import { ClientOrderStats } from '@/components/client/ClientOrderStats';
import { OrderHistoryTable } from '@/components/client/OrderHistoryTable';
import { AssignedServicesTab } from '@/components/client/AssignedServicesTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCcw className="h-8 w-8 animate-spin text-primary/40" />
            </div>
        );
    }

    if (!client) {
        return (
            <div className="p-6 text-center space-y-4">
                <h2 className="text-xl font-bold">Client not found</h2>
                <Button variant="outline" onClick={() => router.push('/clients')}>
                    <ArrowLeft className="h-4 w-4" /> Back to Clients
                </Button>
            </div>
        );
    }

    const isFiltered = search !== '' || selectedMonth !== '' || selectedStatus !== '' || selectedPriority !== '';

    return (
        <div className="space-y-8 p-1">
            {/* Header & Stats Overview (Matching Clients/Earnings Layout) */}
            <div className="flex flex-col gap-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => router.back()}
                            className="h-9 w-9 rounded-full border-border/60 hover:bg-accent"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text flex items-center gap-2">
                                {client.name}
                                <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-md uppercase font-normal">
                                    {client.clientId}
                                </span>
                            </h2>
                            <p className="text-muted-foreground text-sm mt-0.5">
                                Client profile details and complete order history.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            className="border-primary text-primary hover:bg-accent hover:text-accent-foreground shadow-xs"
                            onClick={handleRefresh}
                            disabled={isFetchingOrders || isLoadingStats}
                        >
                            <RefreshCcw className={`h-4 w-4 ${isFetchingOrders ? 'animate-spin' : ''}`} />
                            Refresh Data
                        </Button>
                        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs" asChild>
                            <Link href={`/orders?clientId=${client._id}`}>
                                <Plus className="h-4 w-4" /> New Order
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Client Info Overview Card */}
                <ClientInfoCard client={client} />

                {/* Order Stats Row */}
                <ClientOrderStats 
                    stats={stats} 
                    isLoading={isLoadingStats} 
                    currency={client.currency} 
                />
            </div>

            {/* Tabs Section */}
            <Tabs defaultValue="orders" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="orders">Order History</TabsTrigger>
                    <TabsTrigger value="services">Assigned Services</TabsTrigger>
                </TabsList>
                
                <TabsContent value="orders" className="mt-0">
                    {/* Orders Section Card */}
                    <Card className="border-border/60 shadow-md">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <ShoppingBag className="h-5 w-5 text-primary" />
                                Order History
                                <span className="text-xs font-normal text-muted-foreground">
                                    ({pagination.total} total orders)
                                </span>
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            {/* Filters Toolbar */}
                            <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="bg-primary/10 p-2 rounded-full">
                                        <Filter className="h-4 w-4 text-primary" />
                                    </div>
                                    <span className="text-sm font-medium">Filters:</span>
                                </div>

                                {/* Search Input */}
                                <div className="relative flex-1 min-w-[200px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search orders..."
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setPage(1);
                                        }}
                                        className="pl-9 pr-8 h-9 bg-background/60 border-input text-sm"
                                    />
                                    {search && (
                                        <button
                                            onClick={() => setSearch('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                                            type="button"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>

                                {/* Month Filter */}
                                <Select
                                    value={selectedMonth}
                                    onValueChange={(val) => {
                                        setSelectedMonth(val);
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger className="w-[130px] h-9 bg-background/60 text-xs font-medium">
                                        <SelectValue placeholder="Month" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MONTH_OPTIONS.map((m) => (
                                            <SelectItem key={m.value} value={m.value} className="text-xs">
                                                {m.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Status Filter */}
                                <Select
                                    value={selectedStatus}
                                    onValueChange={(val) => {
                                        setSelectedStatus(val as OrderStatus);
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger className="w-[130px] h-9 bg-background/60 text-xs font-medium">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
                                            <SelectItem key={value} value={value} className="text-xs">
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Priority Filter */}
                                <Select
                                    value={selectedPriority}
                                    onValueChange={(val) => {
                                        setSelectedPriority(val as OrderPriority);
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger className="w-[130px] h-9 bg-background/60 text-xs font-medium">
                                        <SelectValue placeholder="Priority" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(ORDER_PRIORITY_LABELS).map(([value, label]) => (
                                            <SelectItem key={value} value={value} className="text-xs">
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {isFiltered && (
                                    <Button
                                        variant="ghost"
                                        onClick={handleClearFilters}
                                        className="h-9 px-3 text-xs gap-1.5 hover:bg-muted/85 font-medium shrink-0"
                                    >
                                        Clear Filters
                                        <X className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>

                            {/* Table Container */}
                            <div className="rounded-md border border-border/60 overflow-hidden">
                                <OrderHistoryTable 
                                    orders={orders} 
                                    isLoading={isLoadingOrders} 
                                    currency={client.currency} 
                                />
                            </div>

                            {/* Pagination Footer */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/60">
                                <div className="text-sm text-muted-foreground font-medium select-none">
                                    Showing <span className="font-semibold text-foreground">{orders.length}</span> of{" "}
                                    <span className="font-semibold text-foreground">{pagination.total}</span> orders
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">Rows per page</span>
                                        <Select
                                            value={limit.toString()}
                                            onValueChange={(val) => {
                                                setLimit(Number(val));
                                                setPage(1);
                                            }}
                                        >
                                            <SelectTrigger className="h-8 w-[70px] text-xs font-semibold">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {PER_PAGE_OPTIONS.map((option) => (
                                                    <SelectItem key={option} value={option.toString()} className="text-xs">
                                                        {option}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex items-center gap-1">
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
                                        <span className="text-xs font-medium px-2 whitespace-nowrap select-none">
                                            Page {pagination.page} of {pagination.totalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                                            disabled={page >= pagination.totalPages || isLoadingOrders}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setPage(pagination.totalPages)}
                                            disabled={page >= pagination.totalPages || isLoadingOrders}
                                        >
                                            <ChevronsRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="services" className="mt-0">
                    <Card className="border-border/60 shadow-md p-6">
                        <AssignedServicesTab client={client} />
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
