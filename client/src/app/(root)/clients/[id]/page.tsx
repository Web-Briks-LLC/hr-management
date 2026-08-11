"use client";

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    useGetClientByIdQuery,
    useGetClientStatsQuery,
    useGetAssignedServicesQuery,
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
import { Badge } from '@/components/ui/badge';
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
    Layers,
} from 'lucide-react';
import Link from 'next/link';
import type { OrderStatus, OrderPriority } from '@/types/order.type';
import {
    MONTH_OPTIONS,
    PER_PAGE_OPTIONS,
    ORDER_STATUS_LABELS,
    ORDER_PRIORITY_LABELS,
} from '@/lib/constants';
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
    const { data: assignedServices } = useGetAssignedServicesQuery(clientId);
    const {
        data: stats,
        isLoading: isLoadingStats,
        refetch: refetchStats,
    } = useGetClientStatsQuery({
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
            <div className="p-8 text-center space-y-4">
                <h2 className="text-xl font-bold text-foreground">Client not found</h2>
                <Button variant="outline" onClick={() => router.push('/clients')}>
                    <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Clients
                </Button>
            </div>
        );
    }

    const isFiltered =
        search !== '' ||
        selectedMonth !== '' ||
        selectedYear !== '' ||
        selectedStatus !== '' ||
        selectedPriority !== '';

    return (
        <div className="space-y-6 pb-8">
            {/* Top Navigation & Action Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => router.back()}
                        className="h-9 w-9 rounded-lg border-border/60 hover:bg-muted"
                        title="Go back"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                {client.name}
                            </h1>
                            <Badge variant="secondary" className="font-mono text-xs">
                                {client.clientId}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Client profile overview, revenue analytics, and order history
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 text-xs font-medium"
                        onClick={handleRefresh}
                        disabled={isFetchingOrders || isLoadingStats}
                    >
                        <RefreshCcw
                            className={`h-3.5 w-3.5 mr-1.5 ${
                                isFetchingOrders || isLoadingStats ? 'animate-spin' : ''
                            }`}
                        />
                        Refresh
                    </Button>
                    <Button size="sm" className="h-9 text-xs font-medium" asChild>
                        <Link href={`/orders?clientId=${client._id}`}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" /> New Order
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

            {/* Tabs Section */}
            <Tabs defaultValue="orders" className="w-full space-y-4">
                <TabsList className="grid w-full sm:w-[360px] grid-cols-2">
                    <TabsTrigger value="orders" className="flex items-center gap-2 text-xs font-semibold">
                        <ShoppingBag className="h-3.5 w-3.5" />
                        Order History
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] font-bold">
                            {pagination.total}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="services" className="flex items-center gap-2 text-xs font-semibold">
                        <Layers className="h-3.5 w-3.5" />
                        Assigned Services
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] font-bold">
                            {assignedServices?.length || 0}
                        </Badge>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="orders" className="mt-0">
                    <Card className="border-border/60 shadow-xs">
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <ShoppingBag className="h-4 w-4 text-primary" />
                                    Client Orders
                                </CardTitle>
                                <span className="text-xs text-muted-foreground">
                                    Total {pagination.total} orders found
                                </span>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            {/* Filters Toolbar */}
                            <div className="flex flex-wrap items-center gap-2.5 p-3 bg-muted/40 rounded-lg border border-border/50">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mr-1">
                                    <Filter className="h-3.5 w-3.5 text-primary" />
                                    <span>Filter:</span>
                                </div>

                                {/* Search Input */}
                                <div className="relative flex-1 min-w-[200px]">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        placeholder="Search order name..."
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setPage(1);
                                        }}
                                        className="pl-8 pr-8 h-8 bg-background text-xs"
                                    />
                                    {search && (
                                        <button
                                            onClick={() => {
                                                setSearch('');
                                                setPage(1);
                                            }}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                                    <SelectTrigger className="w-[120px] h-8 bg-background text-xs font-medium">
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
                                    <SelectTrigger className="w-[125px] h-8 bg-background text-xs font-medium">
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
                                    <SelectTrigger className="w-[125px] h-8 bg-background text-xs font-medium">
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
                                        size="sm"
                                        onClick={handleClearFilters}
                                        className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="h-3.5 w-3.5 mr-1" />
                                        Clear
                                    </Button>
                                )}
                            </div>

                            {/* Table Container */}
                            <div className="rounded-md border border-border/60 overflow-hidden bg-card">
                                <OrderHistoryTable
                                    orders={orders}
                                    isLoading={isLoadingOrders}
                                    currency={client.currency}
                                />
                            </div>

                            {/* Pagination Footer */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                                <div className="text-xs text-muted-foreground font-medium">
                                    Showing <span className="font-semibold text-foreground">{orders.length}</span> of{" "}
                                    <span className="font-semibold text-foreground">{pagination.total}</span> orders
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">Rows:</span>
                                        <Select
                                            value={limit.toString()}
                                            onValueChange={(val) => {
                                                setLimit(Number(val));
                                                setPage(1);
                                            }}
                                        >
                                            <SelectTrigger className="h-8 w-[68px] text-xs font-medium bg-background">
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
                                            <ChevronsLeft className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                                            disabled={page === 1 || isLoadingOrders}
                                        >
                                            <ChevronLeft className="h-3.5 w-3.5" />
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
                                            <ChevronRight className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setPage(pagination.totalPages)}
                                            disabled={page >= pagination.totalPages || isLoadingOrders}
                                        >
                                            <ChevronsRight className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="services" className="mt-0">
                    <Card className="border-border/60 shadow-xs p-6 bg-card">
                        <AssignedServicesTab client={client} />
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
