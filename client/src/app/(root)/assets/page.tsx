'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Tabs,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
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
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Plus,
    Search,
    Download,
    RefreshCcw,
    DollarSign,
    Package,
    CheckCircle2,
    Clock,
    Wrench,
    AlertTriangle,
    Eye,
    Edit2,
    Trash2,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Laptop,
    Armchair,
    Coffee,
    Tv,
    FileText,
    Key,
    Car,
    Box,
    Filter,
    MapPin,
    RotateCcw,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    useGetAssetsQuery,
    useGetAssetStatsQuery,
    useDeleteAssetMutation,
} from '@/redux/features/asset/assetApi';
import { useGetAllBranchesQuery } from '@/redux/features/branch/branchApi';
import type {
    IAsset,
    AssetCategory,
    AssetStatus,
    AssetCondition,
    AssetFilters,
} from '@/types/asset.type';
import {
    ASSET_CATEGORIES,
    ASSET_STATUS_CONFIG,
    ASSET_CONDITION_CONFIG,
} from '@/types/asset.type';
import { AssetFormDialog } from '@/components/asset/AssetFormDialog';
import { AssetDetailsDialog } from '@/components/asset/AssetDetailsDialog';
import { ExportAssetDialog } from '@/components/asset/ExportAssetDialog';

const CATEGORY_ICONS: Record<AssetCategory, any> = {
    electronics_it: Laptop,
    furniture_fixture: Armchair,
    office_supplies_pantry: Coffee,
    appliances_facilities: Tv,
    documents_legal: FileText,
    software_licenses: Key,
    vehicles_machinery: Car,
    other: Box,
};

export default function AssetsPage() {
    // Pagination state
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const perPageOptions = [10, 20, 50, 100];

    // Filter states
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<AssetCategory | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<AssetStatus | 'all'>('all');
    const [conditionFilter, setConditionFilter] = useState<AssetCondition | 'all'>('all');
    const [branchFilter, setBranchFilter] = useState<string>('all');

    // Dialog states
    const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<IAsset | null>(null);
    const [assetToEdit, setAssetToEdit] = useState<IAsset | null>(null);

    // Queries
    const filters = useMemo<AssetFilters>(() => {
        const f: AssetFilters = {
            page,
            limit,
            search: search.trim() || undefined,
            category: selectedCategory !== 'all' ? selectedCategory : undefined,
            status: statusFilter !== 'all' ? statusFilter : undefined,
            condition: conditionFilter !== 'all' ? conditionFilter : undefined,
            branchId: branchFilter !== 'all' ? branchFilter : undefined,
        };
        return f;
    }, [page, limit, search, selectedCategory, statusFilter, conditionFilter, branchFilter]);

    const {
        data: assetsData,
        isLoading,
        isFetching,
        refetch,
    } = useGetAssetsQuery(filters);

    const { data: statsData, isLoading: isLoadingStats } = useGetAssetStatsQuery();
    const { data: branchesData } = useGetAllBranchesQuery({});

    const [deleteAsset, { isLoading: isDeleting }] = useDeleteAssetMutation();

    const assets = assetsData?.data || [];
    const meta = assetsData?.meta;
    const stats = statsData?.data;
    const branches = branchesData?.branches || branchesData?.data || [];

    // Currency Formatter
    const formatCurrency = (amount: number = 0, curr: string = 'BDT') => {
        const symbol = curr === 'BDT' ? '৳' : curr === 'USD' ? '$' : curr === 'EUR' ? '€' : '£';
        return `${symbol} ${Number(amount || 0).toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        })}`;
    };

    // Action Handlers
    const handleOpenAdd = () => {
        setAssetToEdit(null);
        setIsAddEditDialogOpen(true);
    };

    const handleOpenEdit = (asset: IAsset) => {
        setAssetToEdit(asset);
        setIsAddEditDialogOpen(true);
    };

    const handleOpenView = (asset: IAsset) => {
        setSelectedAsset(asset);
        setIsViewDialogOpen(true);
    };

    const handleOpenDelete = (asset: IAsset) => {
        setSelectedAsset(asset);
        setIsDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedAsset) return;
        try {
            await deleteAsset(selectedAsset._id).unwrap();
            toast.success(`Asset "${selectedAsset.name}" deleted successfully.`);
            setIsDeleteDialogOpen(false);
            setSelectedAsset(null);
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to delete asset');
        }
    };

    const handleResetFilters = () => {
        setSearch('');
        setSelectedCategory('all');
        setStatusFilter('all');
        setConditionFilter('all');
        setBranchFilter('all');
        setPage(1);
    };

    const isFiltered =
        search !== '' ||
        selectedCategory !== 'all' ||
        statusFilter !== 'all' ||
        conditionFilter !== 'all' ||
        branchFilter !== 'all';

    // Calculate Category Count Map from stats
    const categoryCountMap = useMemo(() => {
        const map: Record<string, { count: number; qty: number }> = {};
        stats?.categoryCounts?.forEach((c) => {
            map[c.category] = { count: c.count, qty: c.totalQuantity };
        });
        return map;
    }, [stats]);

    return (
        <div className="space-y-6 p-1">
            {/* Header Section */}
            <div className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text">
                            Company Assets
                        </h2>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Audit, track, and manage all company equipment, electronics, furnishings, supplies, and legal documents.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="h-9 px-3 text-xs gap-1.5 border-border/70 shadow-xs"
                        >
                            <RefreshCcw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Refresh</span>
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsExportDialogOpen(true)}
                            className="h-9 px-3 text-xs gap-1.5 border-border/70 shadow-xs"
                        >
                            <Download className="h-3.5 w-3.5" />
                            <span>Export</span>
                        </Button>

                        <Button
                            onClick={handleOpenAdd}
                            size="sm"
                            className="h-9 px-4 text-xs font-semibold gap-1.5 shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Add Asset</span>
                        </Button>
                    </div>
                </div>

                {/* Top Stats Overview Cards (Earnings Aesthetic) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: Total Asset Value */}
                    <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-indigo-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-500/30">
                        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-indigo-500/10 blur-2xl transition-all duration-300 group-hover:bg-indigo-500/20" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-indigo-500/20">
                                    <DollarSign className="h-5 w-5" />
                                </div>
                                {!isLoadingStats && (
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] font-medium opacity-70 group-hover:opacity-100 border-indigo-500/20 text-indigo-500"
                                    >
                                        Valuation
                                    </Badge>
                                )}
                            </div>
                            {isLoadingStats ? (
                                <Skeleton className="h-8 w-28" />
                            ) : (
                                <div>
                                    <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400 truncate">
                                        {formatCurrency(stats?.totalValuationBDT || 0, 'BDT')}
                                    </h3>
                                    <div className="mt-2 space-y-1">
                                        {stats?.totalValuation?.map((curr) => (
                                            <div
                                                key={curr.currency}
                                                className="flex items-center justify-between text-[11px]"
                                            >
                                                <span className="text-muted-foreground font-medium">
                                                    {curr.currency}:
                                                </span>
                                                <span className="font-semibold">
                                                    {formatCurrency(curr.amount, curr.currency)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-indigo-500/10 font-medium">
                                Total Asset Value (Cost)
                            </p>
                        </div>
                    </div>

                    {/* Card 2: Total Distinct Assets & Units */}
                    <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-blue-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-500/30">
                        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-blue-500/10 blur-2xl transition-all duration-300 group-hover:bg-blue-500/20" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-500/20">
                                    <Package className="h-5 w-5" />
                                </div>
                                {!isLoadingStats && (
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] font-medium opacity-70 group-hover:opacity-100 border-blue-500/20 text-blue-500"
                                    >
                                        Inventory
                                    </Badge>
                                )}
                            </div>
                            {isLoadingStats ? (
                                <Skeleton className="h-8 w-24" />
                            ) : (
                                <div>
                                    <h3 className="text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                                        {stats?.totalDistinctAssets || 0}
                                    </h3>
                                    <div className="mt-2 space-y-1">
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-muted-foreground font-medium">
                                                Total Units / Pieces:
                                            </span>
                                            <span className="font-semibold text-foreground">
                                                {stats?.totalQuantity || 0} units
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-muted-foreground font-medium">
                                                Added Last 30 Days:
                                            </span>
                                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                                +{stats?.recentAssetsCount || 0} new
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-blue-500/10 font-medium">
                                Cataloged Asset Types
                            </p>
                        </div>
                    </div>

                    {/* Card 3: In Use / Assigned */}
                    <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-emerald-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/5 hover:border-emerald-500/30">
                        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-emerald-500/10 blur-2xl transition-all duration-300 group-hover:bg-emerald-500/20" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-emerald-500/20">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                                {!isLoadingStats && (
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] font-medium bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 px-1.5 py-0 h-5"
                                    >
                                        Active
                                    </Badge>
                                )}
                            </div>
                            {isLoadingStats ? (
                                <Skeleton className="h-8 w-20" />
                            ) : (
                                <div>
                                    <h3 className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                                        {stats?.statusCounts?.inUse || 0}
                                    </h3>
                                    <div className="mt-2 space-y-1">
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-muted-foreground font-medium">
                                                Available In Stock:
                                            </span>
                                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                                                {stats?.statusCounts?.inStock || 0} items
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-muted-foreground font-medium">
                                                Deployment Rate:
                                            </span>
                                            <span className="font-semibold">
                                                {stats?.totalDistinctAssets
                                                    ? Math.round(
                                                          ((stats.statusCounts?.inUse || 0) /
                                                              stats.totalDistinctAssets) *
                                                              100,
                                                      )
                                                    : 0}
                                                %
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-emerald-500/10 font-medium">
                                Currently Deployed / In Use
                            </p>
                        </div>
                    </div>

                    {/* Card 4: Maintenance, Alerts & Expiring */}
                    <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-amber-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/5 hover:border-amber-500/30">
                        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-amber-500/10 blur-2xl transition-all duration-300 group-hover:bg-amber-500/20" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-amber-500/20">
                                    <Wrench className="h-5 w-5" />
                                </div>
                                {!isLoadingStats && (
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] font-medium bg-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20 px-1.5 py-0 h-5"
                                    >
                                        Alerts
                                    </Badge>
                                )}
                            </div>
                            {isLoadingStats ? (
                                <Skeleton className="h-8 w-20" />
                            ) : (
                                <div>
                                    <h3 className="text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                                        {(stats?.statusCounts?.maintenance || 0) +
                                            (stats?.statusCounts?.damaged || 0)}
                                    </h3>
                                    <div className="mt-2 space-y-1">
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-muted-foreground font-medium">
                                                Under Maintenance:
                                            </span>
                                            <span className="font-semibold text-amber-600 dark:text-amber-400">
                                                {stats?.statusCounts?.maintenance || 0}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-muted-foreground font-medium">
                                                Expiring (Warranty/Docs):
                                            </span>
                                            <span className="font-semibold text-rose-500">
                                                {(stats?.expiringWarrantyCount || 0) +
                                                    (stats?.expiringDocumentsCount || 0)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-amber-500/10 font-medium">
                                Maintenance & Critical Alerts
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Shadcn UI Tabs for Categories with ScrollArea */}
            <div className="w-full">
                <Tabs
                    value={selectedCategory}
                    onValueChange={(val) => {
                        setSelectedCategory(val as AssetCategory | 'all');
                        setPage(1);
                    }}
                    className="w-full"
                >
                    <ScrollArea className="w-full whitespace-nowrap pb-2">
                        <TabsList className="bg-muted/40 p-1 rounded-xl h-11 inline-flex w-auto justify-start gap-1 border border-border/50">
                            <TabsTrigger
                                value="all"
                                className="rounded-lg text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs transition-all shrink-0"
                            >
                                All Categories
                                <Badge
                                    variant="secondary"
                                    className="ml-1.5 px-1.5 py-0 text-[10px] bg-primary/10 text-primary font-bold"
                                >
                                    {stats?.totalDistinctAssets || 0}
                                </Badge>
                            </TabsTrigger>

                            {ASSET_CATEGORIES.map((cat) => {
                                const CatIcon = CATEGORY_ICONS[cat.id];
                                const countInfo = categoryCountMap[cat.id] || { count: 0, qty: 0 };

                                return (
                                    <TabsTrigger
                                        key={cat.id}
                                        value={cat.id}
                                        className="rounded-lg text-xs font-medium px-3 py-1.5 gap-1.5 data-[state=active]:bg-background data-[state=active]:font-semibold data-[state=active]:shadow-xs transition-all shrink-0"
                                    >
                                        <CatIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                                        <span>{cat.label}</span>
                                        {countInfo.count > 0 && (
                                            <Badge
                                                variant="secondary"
                                                className="ml-0.5 px-1.5 py-0 text-[10px] bg-muted text-muted-foreground"
                                            >
                                                {countInfo.count}
                                            </Badge>
                                        )}
                                    </TabsTrigger>
                                );
                            })}
                        </TabsList>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </Tabs>
            </div>

            {/* Search & Filters (Search Left, Filters Right) */}
            <div className="rounded-xl border border-border/60 shadow-xs bg-card px-3 py-2 sm:px-4 sm:py-2">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                    {/* Left: Search Bar */}
                    <div className="relative w-full sm:w-72 md:w-80 shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search assets by name, tag, serial..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="pl-9 pr-8 h-9 text-xs bg-background/60"
                        />
                        {search && (
                            <button
                                onClick={() => {
                                    setSearch('');
                                    setPage(1);
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                type="button"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Right: Select Filters */}
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-start sm:justify-end">
                        {/* Status Filter */}
                        <Select
                            value={statusFilter}
                            onValueChange={(v) => {
                                setStatusFilter(v as any);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-[125px] h-9 text-xs bg-background/60 font-medium">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                {Object.entries(ASSET_STATUS_CONFIG).map(([k, v]) => (
                                    <SelectItem key={k} value={k}>
                                        {v.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Condition Filter */}
                        <Select
                            value={conditionFilter}
                            onValueChange={(v) => {
                                setConditionFilter(v as any);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-[125px] h-9 text-xs bg-background/60 font-medium">
                                <SelectValue placeholder="All Condition" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Condition</SelectItem>
                                {Object.entries(ASSET_CONDITION_CONFIG).map(([k, v]) => (
                                    <SelectItem key={k} value={k}>
                                        {v.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Branch Filter */}
                        <Select
                            value={branchFilter}
                            onValueChange={(v) => {
                                setBranchFilter(v);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-[135px] h-9 text-xs bg-background/60 font-medium">
                                <SelectValue placeholder="All Branches" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Branches</SelectItem>
                                {branches.map((b: any) => (
                                    <SelectItem key={b._id} value={b._id}>
                                        {b.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Reset Button */}
                        {isFiltered && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleResetFilters}
                                className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/80 shrink-0 gap-1"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span>Reset</span>
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Table Container (Clean Standalone Table Section) */}
            <div className="rounded-xl border border-border/60 bg-card shadow-xs overflow-hidden">
                <div className="relative overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b">
                                <TableHead className="w-[140px] text-xs font-bold text-muted-foreground">
                                    Asset Tag & Code
                                </TableHead>
                                <TableHead className="min-w-[220px] text-xs font-bold text-muted-foreground">
                                    Name & Specifications
                                </TableHead>
                                <TableHead className="w-[140px] text-xs font-bold text-muted-foreground">
                                    Category
                                </TableHead>
                                <TableHead className="w-[100px] text-xs font-bold text-muted-foreground text-center">
                                    Qty & Unit
                                </TableHead>
                                <TableHead className="w-[140px] text-xs font-bold text-muted-foreground text-right">
                                    Cost / Value
                                </TableHead>
                                <TableHead className="min-w-[160px] text-xs font-bold text-muted-foreground">
                                    Assigned To & Location
                                </TableHead>
                                <TableHead className="w-[110px] text-xs font-bold text-muted-foreground text-center">
                                    Status
                                </TableHead>
                                <TableHead className="w-[110px] text-xs font-bold text-muted-foreground text-center">
                                    Condition
                                </TableHead>
                                <TableHead className="w-[110px] text-xs font-bold text-muted-foreground text-right pr-6">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {isLoading || isFetching ? (
                                [...Array(6)].map((_, i) => (
                                    <TableRow key={i} className="animate-pulse">
                                        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-48" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-16 mx-auto" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-20 ml-auto" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-16 mx-auto" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-16 mx-auto" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-16 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : assets.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto text-muted-foreground">
                                            <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground/60 mb-1">
                                                <Package className="h-6 w-6" />
                                            </div>
                                            <p className="text-sm font-semibold text-foreground">No assets found</p>
                                            <p className="text-xs text-muted-foreground text-center">
                                                {isFiltered
                                                    ? 'No assets match your search or filters. Try clearing your search.'
                                                    : 'Get started by adding your first company asset.'}
                                            </p>
                                            <Button
                                                size="sm"
                                                onClick={handleOpenAdd}
                                                className="mt-2 text-xs font-semibold h-8"
                                            >
                                                <Plus className="h-3.5 w-3.5 mr-1" /> Add Asset
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                assets.map((asset) => {
                                    const CatIcon = CATEGORY_ICONS[asset.category] || Box;
                                    const statusConf = ASSET_STATUS_CONFIG[asset.status] || ASSET_STATUS_CONFIG.in_use;
                                    const conditionConf = ASSET_CONDITION_CONFIG[asset.condition] || ASSET_CONDITION_CONFIG.new;

                                    const specsList = asset.specifications
                                        ? Object.entries(asset.specifications).slice(0, 3)
                                        : [];

                                    return (
                                        <TableRow
                                            key={asset._id}
                                            className="group hover:bg-muted/30 transition-colors"
                                        >
                                            {/* Asset Tag */}
                                            <TableCell className="font-mono text-xs font-bold">
                                                <span
                                                    onClick={() => handleOpenView(asset)}
                                                    className="cursor-pointer text-primary hover:underline px-2 py-1 rounded-md bg-primary/5 border border-primary/10 inline-block"
                                                >
                                                    {asset.assetTag}
                                                </span>
                                            </TableCell>

                                            {/* Asset Name & Specs Snippet */}
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <span
                                                        onClick={() => handleOpenView(asset)}
                                                        className="font-bold text-xs text-foreground hover:text-primary cursor-pointer transition-colors line-clamp-1"
                                                    >
                                                        {asset.name}
                                                    </span>
                                                    {specsList.length > 0 ? (
                                                        <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-muted-foreground">
                                                            {specsList.map(([k, v]) => (
                                                                <span
                                                                    key={k}
                                                                    className="bg-muted px-1.5 py-0.2 rounded text-[10px] font-medium border border-border/40"
                                                                >
                                                                    {k}: {String(v)}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : asset.serialNumber ? (
                                                        <span className="text-[10px] text-muted-foreground font-mono">
                                                            S/N: {asset.serialNumber}
                                                        </span>
                                                    ) : asset.vendor ? (
                                                        <span className="text-[10px] text-muted-foreground">
                                                            Vendor: {asset.vendor}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </TableCell>

                                            {/* Category */}
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <CatIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                                                    <span className="text-xs font-medium text-foreground">
                                                        {ASSET_CATEGORIES.find((c) => c.id === asset.category)?.label || asset.category}
                                                    </span>
                                                </div>
                                            </TableCell>

                                            {/* Quantity & Unit */}
                                            <TableCell className="text-center font-semibold text-xs text-foreground">
                                                {asset.quantity} {asset.unit}
                                            </TableCell>

                                            {/* Cost / Valuation */}
                                            <TableCell className="text-right">
                                                <div className="space-y-0.5">
                                                    <p className="text-xs font-bold text-foreground">
                                                        {formatCurrency(asset.totalCost, asset.currency)}
                                                    </p>
                                                    {asset.quantity > 1 && (
                                                        <p className="text-[10px] text-muted-foreground">
                                                            {formatCurrency(asset.purchasePrice, asset.currency)} / {asset.unit}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Assigned To & Location */}
                                            <TableCell>
                                                <div className="space-y-1 text-xs">
                                                    {asset.assignedTo && (asset.assignedTo.name || asset.assignedTo.designation) ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <Avatar className="h-5 w-5 border">
                                                                <AvatarImage src={asset.assignedTo.avatar} />
                                                                <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">
                                                                    {((asset.assignedTo.name || asset.assignedTo.designation || 'ST').slice(0, 2)).toUpperCase()}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className="font-medium text-foreground truncate max-w-[130px]">
                                                                {asset.assignedTo.name || asset.assignedTo.designation}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground text-[11px] italic">
                                                            Office Custody
                                                        </span>
                                                    )}

                                                    {asset.location && (
                                                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate max-w-[140px]">
                                                            <MapPin className="h-3 w-3 shrink-0" />
                                                            {asset.location}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Status */}
                                            <TableCell className="text-center">
                                                <Badge
                                                    variant="outline"
                                                    className={`text-[10px] font-semibold ${statusConf.bg} ${statusConf.text} ${statusConf.border}`}
                                                >
                                                    {statusConf.label}
                                                </Badge>
                                            </TableCell>

                                            {/* Condition */}
                                            <TableCell className="text-center">
                                                <span
                                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${conditionConf.bg} ${conditionConf.text}`}
                                                >
                                                    {conditionConf.label}
                                                </span>
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="text-right pr-6">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleOpenView(asset)}
                                                        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                                        title="View Details"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleOpenEdit(asset)}
                                                        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                                        title="Edit Asset"
                                                    >
                                                        <Edit2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleOpenDelete(asset)}
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                        title="Delete Asset"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>

                        {assets.length > 0 && (
                            <TableFooter className="bg-muted/20 border-t">
                                <TableRow>
                                    <TableCell colSpan={3} className="text-xs font-bold text-foreground">
                                        Current Page Totals ({assets.length} items)
                                    </TableCell>
                                    <TableCell className="text-center text-xs font-bold text-foreground">
                                        {assets.reduce((sum, a) => sum + (a.quantity || 0), 0)} units
                                    </TableCell>
                                    <TableCell className="text-right text-xs font-bold text-primary">
                                        {formatCurrency(
                                            assets.reduce((sum, a) => sum + (a.totalCost || 0), 0),
                                            assets[0]?.currency || 'BDT',
                                        )}
                                    </TableCell>
                                    <TableCell colSpan={4} />
                                </TableRow>
                            </TableFooter>
                        )}
                    </Table>
                </div>

                {/* Pagination Footer */}
                {meta && meta.totalPages > 1 && (
                    <div className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Show</span>
                            <Select
                                value={String(limit)}
                                onValueChange={(v) => {
                                    setLimit(Number(v));
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="h-8 w-16 text-xs bg-background">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {perPageOptions.map((opt) => (
                                        <SelectItem key={opt} value={String(opt)}>
                                            {opt}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <span>items per page</span>
                            <span className="mx-2">•</span>
                            <span>
                                Page {meta.page} of {meta.totalPages} ({meta.total} total assets)
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setPage(1)}
                                disabled={page === 1}
                                className="h-8 w-8"
                            >
                                <ChevronsLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="h-8 w-8"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>

                            <span className="text-xs font-semibold px-3 py-1 bg-muted rounded-md">
                                {page} / {meta.totalPages}
                            </span>

                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                                disabled={page === meta.totalPages}
                                className="h-8 w-8"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setPage(meta.totalPages)}
                                disabled={page === meta.totalPages}
                                className="h-8 w-8"
                            >
                                <ChevronsRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Form Dialog (Add / Edit) */}
            <AssetFormDialog
                open={isAddEditDialogOpen}
                onOpenChange={setIsAddEditDialogOpen}
                assetToEdit={assetToEdit}
                onSuccess={() => refetch()}
            />

            {/* Details Dialog */}
            <AssetDetailsDialog
                open={isViewDialogOpen}
                onOpenChange={setIsViewDialogOpen}
                asset={selectedAsset}
                onEdit={(asset) => handleOpenEdit(asset)}
                onDelete={(asset) => handleOpenDelete(asset)}
            />

            {/* Export Dialog */}
            <ExportAssetDialog
                open={isExportDialogOpen}
                onOpenChange={setIsExportDialogOpen}
            />

            {/* Delete Confirmation Alert Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Delete Asset
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
                            Are you sure you want to delete asset{' '}
                            <span className="font-bold text-foreground">
                                {selectedAsset?.name} ({selectedAsset?.assetTag})
                            </span>
                            ? This action cannot be undone and will permanently remove this item from the inventory records.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting} className="text-xs">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-semibold"
                        >
                            {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
