"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Trash2,
    DollarSign,
    TrendingUp,
    Wallet,
    Loader,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Eye,
    Clock,
    CheckCircle2,
    XCircle,
    Filter,
    Download,
    Search,
    FileText,
    CreditCard,
    Settings2,
    Info,
    Receipt,
    ArrowRight,
    History as HistoryIcon,
    RefreshCcw,
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
    useGetEarningsQuery,
    useGetEarningStatsQuery,
    useWithdrawEarningMutation,
    useToggleEarningStatusMutation,
    useLazyGetClientOrdersForWithdrawQuery,
    useLazyGetClientsWithEarningsQuery,
    useUpdateEarningMutation,
    useDeleteEarningMutation,
    useSyncEarningMutation,
} from "@/redux/features/earning/earningApi";
import { useGetInvoicesQuery } from "@/redux/features/invoice/invoiceApi";
import { useGetClientsQuery } from "@/redux/features/client/clientApi";
import type {
    IEarning,
    EarningFilters,
    EarningStatus,
} from "@/types/earning.type";
import { CURRENCY_SYMBOLS, MONTHS } from "@/types/earning.type";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type FilterType = "all" | "today" | "week" | "month" | "year";

// MONTHS moved to types file

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function EarningsPage() {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const perPageOptions = [10, 20, 50, 100];
    const [filterType, setFilterType] = useState<FilterType>("all");
    const [statusFilter, setStatusFilter] = useState<EarningStatus | "all">(
        "all",
    );
    const [clientFilter, setClientFilter] = useState<string>("all");
    const [selectedMonth, setSelectedMonth] = useState(
        new Date().getMonth() + 1,
    );
    const [selectedYear, setSelectedYear] = useState(currentYear);

    // Dialog states
    const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [isBulkWithdrawDialogOpen, setIsBulkWithdrawDialogOpen] =
        useState(false);
    const [selectedEarning, setSelectedEarning] = useState<IEarning | null>(
        null,
    );
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    // Edit Client Dialog state
    const [isEditClientDialogOpen, setIsEditClientDialogOpen] = useState(false);
    const [editClientId, setEditClientId] = useState("");

    const [updateEarning, { isLoading: isUpdating }] =
        useUpdateEarningMutation();

    // Withdraw form state

    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [withdrawMethod, setWithdrawMethod] = useState("Cash");
    const [withdrawFees, setWithdrawFees] = useState("0");
    const [withdrawTax, setWithdrawTax] = useState("0");
    const [withdrawRate, setWithdrawRate] = useState("");
    const [withdrawNotes, setWithdrawNotes] = useState("");

    // Bulk withdraw state
    const [bulkClientId, setBulkClientId] = useState("");
    const [bulkMonth, setBulkMonth] = useState(new Date().getMonth() + 1);
    const [bulkYear, setBulkYear] = useState(currentYear);
    const [bulkFees, setBulkFees] = useState("0");
    const [bulkTax, setBulkTax] = useState("0");
    const [bulkRate, setBulkRate] = useState("");
    const [bulkNotes, setBulkNotes] = useState("");

    // Build filters
    const filters = useMemo<EarningFilters>(() => {
        const f: EarningFilters = { page, limit };

        if (statusFilter !== "all") f.status = statusFilter;

        switch (filterType) {
            case "today":
                f.filterType = "today";
                break;
            case "week":
                f.filterType = "week";
                break;
            case "month":
                f.filterType = "month";
                f.month = selectedMonth;
                f.year = selectedYear;
                break;
            case "year":
                f.filterType = "year";
                f.year = selectedYear;
                break;
        }

        if (clientFilter !== "all") f.clientId = clientFilter;
        return f;
    }, [
        page,
        limit,
        filterType,
        statusFilter,
        clientFilter,
        selectedMonth,
        selectedYear,
    ]);

    // Queries
    const {
        data: earningsData,
        isLoading,
        isFetching,
    } = useGetEarningsQuery(filters);
    const { data: statsData, isLoading: isLoadingStats } =
        useGetEarningStatsQuery(filters);
    const { data: clientsData } = useGetClientsQuery({ limit: 100 });

    // Lazy query for bulk withdraw
    const [
        getClientOrders,
        { data: clientOrdersData, isLoading: isLoadingClientOrders },
    ] = useLazyGetClientOrdersForWithdrawQuery();
    const [
        getClients,
        { data: clientsWithEarningsData, isFetching: isFetchingClients },
    ] = useLazyGetClientsWithEarningsQuery();
    const clientsWithEarnings = clientsWithEarningsData?.data || [];

    useEffect(() => {
        if (isBulkWithdrawDialogOpen) {
            getClients({ month: bulkMonth, year: bulkYear });
        }
    }, [bulkMonth, bulkYear, isBulkWithdrawDialogOpen, getClients]);

    // Auto-fetch orders when client is selected for bulk withdraw
    useEffect(() => {
        if (bulkClientId && isBulkWithdrawDialogOpen) {
            getClientOrders({
                clientId: bulkClientId,
                month: bulkMonth,
                year: bulkYear,
            });
        }
    }, [
        bulkClientId,
        bulkMonth,
        bulkYear,
        isBulkWithdrawDialogOpen,
        getClientOrders,
    ]);

    const [withdrawInvoiceNumber, setWithdrawInvoiceNumber] = useState("");
    const [withdrawTransactionId, setWithdrawTransactionId] = useState("");
    const [isConversionMode, setIsConversionMode] = useState(false);
    const [withdrawTab, setWithdrawTab] = useState<string>("payment");
    const [selectedPaymentId, setSelectedPaymentId] = useState<string>("manual");

    // Fetch invoices for selection in withdraw dialog
    const { data: invoicesData } = useGetInvoicesQuery(
        {
            clientId: selectedEarning?.clientId?._id,
            month: selectedEarning?.month,
            year: selectedEarning?.year,
            status: "pending",
        },
        { skip: !isWithdrawDialogOpen || !selectedEarning },
    );
    const pendingInvoices = invoicesData?.invoices || [];

    // Mutations
    const [withdrawEarning, { isLoading: isWithdrawing }] =
        useWithdrawEarningMutation();
    const [toggleStatus, { isLoading: isToggling }] =
        useToggleEarningStatusMutation();
    const [deleteEarning, { isLoading: isDeleting }] =
        useDeleteEarningMutation();
    const [syncEarning, { isLoading: isSyncing }] = useSyncEarningMutation();

    const earnings = earningsData?.data || [];
    const meta = earningsData?.meta;
    const stats = statsData?.data;
    const clients = clientsData?.clients || [];

    // Withdraw calculations
    const rawAmount = parseFloat(withdrawAmount);
    const withdrawAmountNum = isNaN(rawAmount)
        ? Math.max(0, (selectedEarning?.totalAmount || 0) - (selectedEarning?.paidAmount || 0))
        : rawAmount;

    const withdrawFeesNum = parseFloat(withdrawFees) || 0;
    const withdrawTaxNum = parseFloat(withdrawTax) || 0;
    const withdrawRateNum = parseFloat(withdrawRate) || 0;

    const withdrawNetAmount = Math.max(0, withdrawAmountNum - withdrawFeesNum - withdrawTaxNum);
    const withdrawBDT = Math.round(withdrawNetAmount * withdrawRateNum);

    // Bulk withdraw calculations
    const bulkOrdersData = clientOrdersData?.data;
    const bulkFeesNum = parseFloat(bulkFees) || 0;
    const bulkTaxNum = parseFloat(bulkTax) || 0;
    const bulkRateNum = parseFloat(bulkRate) || 1;
    const bulkNetAmount =
        (bulkOrdersData?.totalAmount || 0) - bulkFeesNum - bulkTaxNum;
    const bulkBDT = bulkNetAmount * bulkRateNum;

    const formatCurrency = (amount: number = 0, curr: string = "BDT") => {
        const safeAmount = Number(amount) || 0;
        if (curr === "BDT") {
            return new Intl.NumberFormat("bn-BD", {
                style: "currency",
                currency: "BDT",
                maximumFractionDigits: 0,
            }).format(safeAmount);
        }
        const symbol = CURRENCY_SYMBOLS[curr] || "$";
        return `${symbol}${safeAmount.toFixed(2)}`;
    };

    // Handlers
    const handleEditClient = (earning: IEarning) => {
        setSelectedEarning(earning);
        setEditClientId(earning.clientId?._id || "");
        setIsEditClientDialogOpen(true);
    };

    const handleConfirmEditClient = async () => {
        if (!selectedEarning || !editClientId) return;

        try {
            await updateEarning({
                id: selectedEarning._id,
                data: { clientId: editClientId },
            }).unwrap();

            toast.success("Client updated successfully");
            setIsEditClientDialogOpen(false);
            setSelectedEarning(null);
        } catch (error: unknown) {
            console.error("Error updating client:", error);
            const message =
                (error as { data?: { message?: string } })?.data?.message ||
                "Failed to update client";
            toast.error(message);
        }
    };

    const handleDelete = async () => {
        if (!selectedEarning) return;

        try {
            await deleteEarning(selectedEarning._id).unwrap();
            toast.success("Earning record deleted successfully");
            setIsDeleteDialogOpen(false);
            setSelectedEarning(null);
        } catch (error) {
            console.error("Error deleting earning:", error);
            toast.error("Failed to delete earning record");
        }
    };

    const handleWithdraw = (earning: IEarning) => {
        const remaining = Math.max(0, earning.totalAmount - earning.paidAmount);
        const paymentsTotal = earning.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
        const gapAmount = earning.paidAmount - paymentsTotal;

        const unconvertedPayments = earning.payments?.filter(p => !p.amountInBDT || p.amountInBDT <= p.amount + 0.01 || p.conversionRate <= 1.1) || [];

        setSelectedEarning(earning);

        // Default Tab: if there's no remaining USD but there are unconverted payments (or a gap), go to conversion
        if (remaining <= 0.01 && (unconvertedPayments.length > 0 || gapAmount > 0.01)) {
            setWithdrawTab("conversion");
        } else {
            setWithdrawTab("payment");
        }

        setWithdrawAmount(remaining.toFixed(2));
        setWithdrawMethod("Cash");
        setWithdrawFees("0");
        setWithdrawTax("0");
        setWithdrawRate(earning.conversionRate > 0 ? earning.conversionRate.toString() : "");
        setWithdrawNotes("");
        setWithdrawInvoiceNumber("manual");
        setWithdrawTransactionId("");
        setSelectedPaymentId("manual");

        // If we have unconverted payments, auto-select the first one if we might convert
        if (unconvertedPayments.length > 0) {
            const firstP = unconvertedPayments[0];
            setSelectedPaymentId((firstP as any)._id || "manual");
            if (remaining <= 0.01) {
                setWithdrawAmount(firstP.amount.toString());
                setWithdrawInvoiceNumber(firstP.invoiceNumber || "manual");
                setWithdrawTransactionId(firstP.transactionId || "");
                setWithdrawMethod(firstP.method || "Cash");
            }
        } else if (gapAmount > 0.01) {
            // If there's a gap, default to selecting the gap for conversion
            setSelectedPaymentId("manual-gap");
            setWithdrawAmount(gapAmount.toFixed(2));
            setWithdrawInvoiceNumber("manual");
            setWithdrawTransactionId("");
            setWithdrawMethod("Cash");
        }

        setIsWithdrawDialogOpen(true);
    };

    const handleConfirmWithdraw = async () => {
        if (!selectedEarning || !withdrawRateNum) return;

        try {
            await withdrawEarning({
                id: selectedEarning._id,
                data: {
                    amount: withdrawAmountNum,
                    method: withdrawMethod,
                    invoiceNumber: withdrawInvoiceNumber !== "manual" ? withdrawInvoiceNumber : undefined,
                    transactionId: withdrawTransactionId || undefined,
                    fees: withdrawFeesNum,
                    tax: withdrawTaxNum,
                    conversionRate: withdrawRateNum,
                    notes: withdrawNotes || undefined,
                    isConversion: withdrawTab === "conversion",
                    paymentId: withdrawTab === "conversion" && selectedPaymentId !== "manual" && selectedPaymentId !== "manual-gap" ? selectedPaymentId : undefined,
                    isGapConversion: withdrawTab === "conversion" && selectedPaymentId === "manual-gap" ? true : undefined,
                },
            }).unwrap();

            toast.success("Payment recorded successfully");
            setIsWithdrawDialogOpen(false);
            setWithdrawAmount("");
            setWithdrawFees("0");
            setWithdrawTax("0");
            setWithdrawNotes("");
            setWithdrawInvoiceNumber("");
            setWithdrawTransactionId("");
        } catch (error: any) {
            toast.error(error.data?.message || "Failed to record payment");
        }
    };

    const handleStatusChange = async (
        earning: IEarning,
        newStatus: EarningStatus,
    ) => {
        if (newStatus === "paid" && earning.status === "unpaid") {
            try {
                await toggleStatus({
                    id: earning._id,
                    data: { status: "paid" },
                }).unwrap();
                toast.success("Earning marked as paid");
            } catch (error) {
                console.error("Error toggling status:", error);
                toast.error("Failed to mark as paid");
            }
        } else if (newStatus === "unpaid" && earning.status === "paid") {
            try {
                await toggleStatus({
                    id: earning._id,
                    data: { status: "unpaid" },
                }).unwrap();
                toast.success("Earning marked as unpaid");
            } catch (error) {
                console.error("Error toggling status:", error);
                toast.error("Failed to update status");
            }
        }
    };

    const handleSync = async (id: string) => {
        try {
            await syncEarning(id).unwrap();
            toast.success("Earning synchronized with orders");
        } catch (error: any) {
            toast.error(error.data?.message || "Failed to synchronize");
        }
    };

    const handleBulkClientChange = (clientId: string) => {
        setBulkClientId(clientId);
        const client =
            clients.find((c) => c._id === clientId) ||
            clientsWithEarnings.find((c) => c._id === clientId);
        if (client?.currency) {
            setBulkRate("");
        }
    };

    const handleConfirmBulkWithdraw = async () => {
        if (!bulkOrdersData) {
            toast.error("No earning to withdraw");
            return;
        }

        try {
            await withdrawEarning({
                id: bulkOrdersData.earningId,
                data: {
                    fees: bulkFeesNum,
                    tax: bulkTaxNum,
                    conversionRate: bulkRateNum,
                    notes: bulkNotes || undefined,
                },
            }).unwrap();

            toast.success("Monthly earning withdrawn successfully");
            setIsBulkWithdrawDialogOpen(false);
            setBulkClientId("");
        } catch (error) {
            console.error("Error withdrawing:", error);
            toast.error("Failed to withdraw");
        }
    };

    return (
        <div className="space-y-8 p-1">
            {/* Header & Stats Overview */}
            <div className="flex flex-col gap-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text">
                        Earnings Overview
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Track payments, manage withdrawals, and view financial
                        stats.
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Total Earnings Card */}
                    <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-slate-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-slate-500/5 hover:border-slate-500/30">
                        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-slate-500/10 blur-2xl transition-all duration-300 group-hover:bg-slate-500/20" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/10 text-slate-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-slate-500/20">
                                    <DollarSign className="h-5 w-5" />
                                </div>
                            </div>
                            {isLoadingStats ? (
                                <Skeleton className="h-8 w-20" />
                            ) : (
                                <h3 className="text-3xl font-bold tracking-tight text-slate-600 dark:text-slate-300">
                                    {(stats?.filteredPaidCount || 0) +
                                        (stats?.filteredUnpaidCount || 0)}
                                </h3>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                                Total Earnings
                            </p>
                        </div>
                    </div>

                    {/* Unpaid Card */}
                    <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-orange-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/5 hover:border-orange-500/30">
                        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-orange-500/10 blur-2xl transition-all duration-300 group-hover:bg-orange-500/20" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-orange-500/20">
                                    <Clock className="h-5 w-5" />
                                </div>
                            </div>
                            {isLoadingStats ? (
                                <Skeleton className="h-8 w-24" />
                            ) : (
                                <>
                                    <h3 className="text-3xl font-bold tracking-tight text-orange-600 dark:text-orange-400">
                                        {stats?.filteredUnpaidCount || 0}
                                    </h3>
                                    <p className="text-sm font-medium text-orange-600/80 dark:text-orange-400/80 mt-0.5">
                                        {formatCurrency(
                                            stats?.filteredUnpaidAmount || 0,
                                            "USD",
                                        )}
                                    </p>
                                </>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                                Unpaid
                            </p>
                        </div>
                    </div>

                    {/* Paid Card */}
                    <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-green-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/5 hover:border-green-500/30">
                        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-green-500/10 blur-2xl transition-all duration-300 group-hover:bg-green-500/20" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-green-500/20">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                            </div>
                            {isLoadingStats ? (
                                <Skeleton className="h-8 w-24" />
                            ) : (
                                <>
                                    <h3 className="text-3xl font-bold tracking-tight text-green-600 dark:text-green-400">
                                        {stats?.filteredPaidCount || 0}
                                    </h3>
                                    <p className="text-sm font-medium text-green-600/80 dark:text-green-400/80 mt-0.5">
                                        {formatCurrency(
                                            stats?.filteredPaidAmount || 0,
                                            "USD",
                                        )}
                                    </p>
                                </>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                                Paid
                            </p>
                        </div>
                    </div>

                    {/* Paid BDT Card */}
                    <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-blue-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-500/30">
                        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-blue-500/10 blur-2xl transition-all duration-300 group-hover:bg-blue-500/20" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-500/20">
                                    <TrendingUp className="h-5 w-5" />
                                </div>
                            </div>
                            {isLoadingStats ? (
                                <Skeleton className="h-8 w-28" />
                            ) : (
                                <h3 className="text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                                    {formatCurrency(
                                        stats?.filteredPaidBDT || 0,
                                    )}
                                </h3>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                                Paid BDT
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <Card className="border-border/60 shadow-md">
                <CardHeader className="pb-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <DollarSign className="h-5 w-5 text-primary" />
                            Recent Earnings
                        </CardTitle>
                        <Button
                            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                            onClick={() => setIsBulkWithdrawDialogOpen(true)}
                        >
                            <Download className=" h-4 w-4" />
                            Monthly Withdraw
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Filters Toolbar */}
                    <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
                        <div className="flex items-center gap-2 ">
                            <div className="bg-primary/10 p-2 rounded-full">
                                <Filter className="h-4 w-4 text-primary" />
                            </div>
                            <span className="text-sm font-medium">
                                Filters:
                            </span>
                        </div>

                        {/* Date Filter Type */}
                        <Select
                            value={filterType}
                            onValueChange={(v) => {
                                setFilterType(v as FilterType);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-[140px] h-9 bg-background/60">
                                <SelectValue placeholder="Date Range" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Time</SelectItem>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="week">This Week</SelectItem>
                                <SelectItem value="month">Monthly</SelectItem>
                                <SelectItem value="year">Yearly</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Contextual Date Filters */}
                        {filterType === "month" && (
                            <div className="flex gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                                <Select
                                    value={selectedMonth.toString()}
                                    onValueChange={(v) =>
                                        setSelectedMonth(parseInt(v))
                                    }
                                >
                                    <SelectTrigger className="w-[120px] h-9 bg-background/60">
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
                                <Select
                                    value={selectedYear.toString()}
                                    onValueChange={(v) =>
                                        setSelectedYear(parseInt(v))
                                    }
                                >
                                    <SelectTrigger className="w-[90px] h-9 bg-background/60">
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
                        )}

                        {filterType === "year" && (
                            <Select
                                value={selectedYear.toString()}
                                onValueChange={(v) =>
                                    setSelectedYear(parseInt(v))
                                }
                            >
                                <SelectTrigger className="w-[100px] h-9 bg-background/60 animate-in fade-in slide-in-from-left-2">
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
                        )}

                        {/* Status Filter */}
                        <Select
                            value={statusFilter}
                            onValueChange={(v) => {
                                setStatusFilter(v as EarningStatus | "all");
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-[130px] h-9 bg-background/60">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="unpaid">Unpaid</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Client Filter */}
                        <Select
                            value={clientFilter}
                            onValueChange={(v) => {
                                setClientFilter(v);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-[180px] h-9 bg-background/60">
                                <SelectValue placeholder="Filter by Client" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Clients</SelectItem>
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

                    {/* Table */}
                    <div className="rounded-md border border-border/60 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow className="hover:bg-muted/40 border-b-border/60">
                                    <TableHead className="font-semibold">
                                        Period
                                    </TableHead>
                                    <TableHead className="font-semibold">
                                        Orders
                                    </TableHead>
                                    <TableHead className="font-semibold">
                                        Client
                                    </TableHead>
                                    <TableHead className="font-semibold text-right">
                                        Amount
                                    </TableHead>
                                    <TableHead className="font-semibold">
                                        Status
                                    </TableHead>
                                    <TableHead className="font-semibold text-right">
                                        BDT
                                    </TableHead>
                                    <TableHead className="font-semibold text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    [...Array(5)].map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell>
                                                <Skeleton className="h-4 w-24" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-4 w-32" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-4 w-20" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-4 w-16 ml-auto" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-6 w-20 rounded-full" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-4 w-16 ml-auto" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-8 w-20 mx-auto" />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : earnings.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={7}
                                            className="h-48 text-center"
                                        >
                                            <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                                                <div className="bg-muted/50 p-3 rounded-full">
                                                    <DollarSign className="h-6 w-6 opacity-30" />
                                                </div>
                                                <p className="text-lg font-medium">
                                                    No earnings found
                                                </p>
                                                <p className="text-sm">
                                                    Try adjusting your filters
                                                    or create a new order.
                                                </p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    earnings.map((earning) => (
                                        <TableRow
                                            key={earning._id}
                                            className="hover:bg-muted/20 transition-colors"
                                        >
                                            <TableCell className="whitespace-nowrap text-muted-foreground">
                                                {
                                                    MONTHS.find(
                                                        (m) =>
                                                            m.value ===
                                                            earning.month,
                                                    )?.label
                                                }{" "}
                                                {earning.year}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {earning.isLegacy ? (
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-xs"
                                                    >
                                                        Legacy
                                                    </Badge>
                                                ) : (
                                                    <span>
                                                        {earning.orderIds
                                                            ?.length || 0}{" "}
                                                        orders
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="max-w-[150px] truncate text-muted-foreground">
                                                {earning.clientId?.name ||
                                                    earning.legacyClientCode ||
                                                    "-"}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className={cn(
                                                        "text-sm font-semibold",
                                                        earning.status === "unpaid" && earning.paidAmount > 0 && "text-orange-600"
                                                    )}>
                                                        {formatCurrency(
                                                            earning.totalAmount,
                                                            earning.currency,
                                                        )}
                                                    </span>
                                                    {earning.paidAmount > 0 && earning.status !== "paid" && (
                                                        <div className="w-24 space-y-1">
                                                            <div className="flex justify-between text-[10px] text-muted-foreground font-normal">
                                                                <span>Paid</span>
                                                                <span>{Math.round((earning.paidAmount / earning.totalAmount) * 100)}%</span>
                                                            </div>
                                                            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-orange-500 rounded-full"
                                                                    style={{ width: `${(earning.paidAmount / earning.totalAmount) * 100}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={earning.status}
                                                    onValueChange={(v) =>
                                                        handleStatusChange(
                                                            earning,
                                                            v as EarningStatus,
                                                        )
                                                    }
                                                    disabled={isToggling}
                                                >
                                                    <SelectTrigger
                                                        className={cn(
                                                            "w-auto h-8 border-none focus:ring-0 focus:ring-offset-0",
                                                            earning.status === "paid"
                                                                ? "text-green-600 font-medium hover:text-green-700"
                                                                : earning.paidAmount > 0
                                                                    ? "text-yellow-500 font-medium hover:text-yellow-600"
                                                                    : "text-orange-600 font-medium hover:text-orange-700",
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-1.5">
                                                            {earning.status === "paid" ? (
                                                                <CheckCircle2 className="h-4 w-4" />
                                                            ) : earning.paidAmount > 0 ? (
                                                                <HistoryIcon className="h-4 w-4" />
                                                            ) : (
                                                                <Clock className="h-4 w-4" />
                                                            )}
                                                            <span className="capitalize text-xs font-semibold">
                                                                {earning.status === "unpaid" && earning.paidAmount > 0 ? "Partially Paid" : earning.status}
                                                            </span>
                                                        </div>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="unpaid">
                                                            <span className="flex items-center gap-2 text-orange-600">
                                                                <XCircle className="h-4 w-4" />{" "}
                                                                Unpaid
                                                            </span>
                                                        </SelectItem>
                                                        <SelectItem value="partialPaid">
                                                            <span className="flex items-center gap-2 text-yellow-600">
                                                                <HistoryIcon className="h-4 w-4" />{" "}
                                                                Partially Paid
                                                            </span>
                                                        </SelectItem>
                                                        <SelectItem value="paid">
                                                            <span className="flex items-center gap-2 text-green-600">
                                                                <CheckCircle2 className="h-4 w-4" />{" "}
                                                                Paid
                                                            </span>
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {earning.status === "paid" &&
                                                    earning.amountInBDT > 0 ? (
                                                    <span className="font-mono text-green-600/90 font-medium">
                                                        {formatCurrency(
                                                            earning.amountInBDT,
                                                        )}
                                                    </span>
                                                ) : earning.status ===
                                                    "paid" ? (
                                                    <span className="text-orange-500/80 text-xs font-medium">
                                                        Pending
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground/30">
                                                        -
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-foreground/70 hover:text-primary"
                                                        onClick={() => {
                                                            setSelectedEarning(
                                                                earning,
                                                            );
                                                            setIsViewDialogOpen(
                                                                true,
                                                            );
                                                        }}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>

                                                    {/* Edit Client Button */}
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger
                                                                asChild
                                                            >
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-foreground/70 hover:text-blue-600"
                                                                    onClick={() =>
                                                                        handleEditClient(
                                                                            earning,
                                                                        )
                                                                    }
                                                                >
                                                                    <Settings2 className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>
                                                                    Change
                                                                    Client
                                                                </p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>

                                                    {(earning.status === "unpaid" ||
                                                        earning.paidAmount < earning.totalAmount - 0.01 ||
                                                        earning.payments?.some(p => !p.amountInBDT || p.amountInBDT <= p.amount + 0.01) ||
                                                        (earning.paidAmount > (earning.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0) + 0.01)) && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-foreground/70 hover:text-green-600"
                                                                onClick={() =>
                                                                    handleWithdraw(
                                                                        earning,
                                                                    )
                                                                }
                                                            >
                                                                <Wallet className="h-4 w-4" />
                                                            </Button>
                                                        )}

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-foreground/70 hover:text-blue-500"
                                                        onClick={() =>
                                                            handleSync(earning._id)
                                                        }
                                                        disabled={isSyncing}
                                                        title="Sync with orders"
                                                    >
                                                        <RefreshCcw
                                                            className={cn(
                                                                "h-4 w-4",
                                                                isSyncing &&
                                                                "animate-spin",
                                                            )}
                                                        />
                                                    </Button>

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-foreground/70 hover:text-destructive"
                                                        onClick={() => {
                                                            setSelectedEarning(
                                                                earning,
                                                            );
                                                            setIsDeleteDialogOpen(
                                                                true,
                                                            );
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {meta && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                            <div className="flex items-center gap-2">
                                <p className="text-sm text-muted-foreground">
                                    Showing {(page - 1) * limit + 1} to{" "}
                                    {Math.min(page * limit, meta.total)} of{" "}
                                    {meta.total} entries
                                </p>
                                <Select
                                    value={limit.toString()}
                                    onValueChange={(value) => {
                                        setLimit(parseInt(value));
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger className="h-8 w-[70px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {perPageOptions.map((option) => (
                                            <SelectItem
                                                key={option}
                                                value={option.toString()}
                                            >
                                                {option}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {meta.totalPages > 1 && (
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setPage(1)}
                                        disabled={page === 1 || isFetching}
                                    >
                                        <ChevronsLeft className="h-4 w-4" />
                                    </Button>
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
                                    {(() => {
                                        const totalPages = meta.totalPages;
                                        const pageNumbers: (number | string)[] =
                                            [];
                                        if (totalPages <= 7) {
                                            for (
                                                let i = 1;
                                                i <= totalPages;
                                                i++
                                            ) {
                                                pageNumbers.push(i);
                                            }
                                        } else {
                                            if (page <= 3) {
                                                pageNumbers.push(
                                                    1,
                                                    2,
                                                    3,
                                                    4,
                                                    "...",
                                                    totalPages,
                                                );
                                            } else if (page >= totalPages - 2) {
                                                pageNumbers.push(
                                                    1,
                                                    "...",
                                                    totalPages - 3,
                                                    totalPages - 2,
                                                    totalPages - 1,
                                                    totalPages,
                                                );
                                            } else {
                                                pageNumbers.push(
                                                    1,
                                                    "...",
                                                    page - 1,
                                                    page,
                                                    page + 1,
                                                    "...",
                                                    totalPages,
                                                );
                                            }
                                        }
                                        return pageNumbers.map((num, idx) =>
                                            num === "..." ? (
                                                <span
                                                    key={`ellipsis-${idx}`}
                                                    className="px-2 text-muted-foreground"
                                                >
                                                    ...
                                                </span>
                                            ) : (
                                                <Button
                                                    key={num}
                                                    variant={
                                                        page === num
                                                            ? "default"
                                                            : "outline"
                                                    }
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() =>
                                                        setPage(num as number)
                                                    }
                                                    disabled={isFetching}
                                                >
                                                    {num}
                                                </Button>
                                            ),
                                        );
                                    })()}
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() =>
                                            setPage((p) =>
                                                Math.min(
                                                    meta.totalPages,
                                                    p + 1,
                                                ),
                                            )
                                        }
                                        disabled={
                                            page === meta.totalPages ||
                                            isFetching
                                        }
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setPage(meta.totalPages)}
                                        disabled={
                                            page === meta.totalPages ||
                                            isFetching
                                        }
                                    >
                                        <ChevronsRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Withdraw Dialog */}
            <Dialog
                open={isWithdrawDialogOpen}
                onOpenChange={setIsWithdrawDialogOpen}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Withdraw Earning</DialogTitle>
                        <DialogDescription>
                            Complete this transaction
                        </DialogDescription>
                    </DialogHeader>
                    {selectedEarning && (
                        <ScrollArea className="max-h-[75vh] pr-4 py-2">
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border border-border/50">
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                            Total Balance
                                        </div>
                                        <div className="text-xl font-bold">
                                            {formatCurrency(
                                                selectedEarning.totalAmount,
                                                selectedEarning.currency,
                                            )}
                                        </div>
                                    </div>
                                    <div className="h-10 w-px bg-border/50" />
                                    <div className="space-y-1 text-right">
                                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                            Remaining
                                        </div>
                                        <div className="text-xl font-bold text-orange-600">
                                            {formatCurrency(
                                                Math.max(0, selectedEarning.totalAmount - selectedEarning.paidAmount),
                                                selectedEarning.currency,
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <Tabs value={withdrawTab} onValueChange={(val) => {
                                    setWithdrawTab(val);
                                    if (val === "payment") {
                                        setWithdrawAmount(Math.max(0, selectedEarning.totalAmount - selectedEarning.paidAmount).toFixed(2));
                                        setWithdrawInvoiceNumber("manual");
                                        setWithdrawTransactionId("");
                                        setWithdrawMethod("Cash");
                                        setSelectedPaymentId("manual");
                                    } else {
                                        const unconverted = selectedEarning.payments?.filter(p => !p.amountInBDT || p.amountInBDT <= p.amount + 0.01 || p.conversionRate <= 1.1) || [];
                                        const paymentsTotal = selectedEarning.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
                                        const gap = selectedEarning.paidAmount - paymentsTotal;

                                        if (unconverted.length > 0) {
                                            const firstP = unconverted[0];
                                            setSelectedPaymentId((firstP as any)._id || "manual");
                                            setWithdrawAmount(firstP.amount.toString());
                                            setWithdrawInvoiceNumber(firstP.invoiceNumber || "manual");
                                            setWithdrawTransactionId(firstP.transactionId || "");
                                            setWithdrawMethod(firstP.method || "Cash");
                                        } else if (gap > 0.01) {
                                            setSelectedPaymentId("manual-gap");
                                            setWithdrawAmount(gap.toFixed(2));
                                            setWithdrawInvoiceNumber("manual");
                                            setWithdrawTransactionId("");
                                            setWithdrawMethod("Cash");
                                        }
                                    }
                                }}>
                                    <TabsList className="grid w-full grid-cols-2 mb-6">
                                        <TabsTrigger value="payment">New Payment</TabsTrigger>
                                        <TabsTrigger
                                            value="conversion"
                                            disabled={(selectedEarning.payments?.filter(p => !p.amountInBDT || p.amountInBDT <= p.amount + 0.01 || p.conversionRate <= 1.1) || []).length === 0 &&
                                                (selectedEarning.paidAmount - (selectedEarning.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0)) <= 0.01
                                            }
                                        >
                                            Convert Existing
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="payment" className="space-y-4 pt-1 outline-none">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold">Amount to Pay</Label>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        value={withdrawAmount}
                                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                                        className="pl-6 h-9"
                                                    />
                                                    <span className="absolute left-2.5 top-2.5 text-muted-foreground text-xs">$</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold">Method</Label>
                                                <Select value={withdrawMethod} onValueChange={setWithdrawMethod}>
                                                    <SelectTrigger className="w-full h-9">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Cash">Cash</SelectItem>
                                                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                                        <SelectItem value="PayPal">PayPal (Manual)</SelectItem>
                                                        <SelectItem value="Stripe">Stripe (Manual)</SelectItem>
                                                        <SelectItem value="Check">Check</SelectItem>
                                                        <SelectItem value="Other">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold">Select Invoice (Optional)</Label>
                                                <Select
                                                    value={withdrawInvoiceNumber}
                                                    onValueChange={(val) => {
                                                        setWithdrawInvoiceNumber(val);
                                                        const selectedInv = pendingInvoices.find((i: any) => i.invoiceNumber === val);
                                                        if (selectedInv) setWithdrawAmount(selectedInv.totalAmount.toString());
                                                    }}
                                                >
                                                    <SelectTrigger className="w-full h-9">
                                                        <SelectValue placeholder="Manual Entry" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="manual">None / Manual</SelectItem>
                                                        {pendingInvoices.map((inv: any) => (
                                                            <SelectItem key={inv.invoiceNumber} value={inv.invoiceNumber}>
                                                                #{inv.invoiceNumber} - {formatCurrency(inv.totalAmount, inv.currency)}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold">Reference ID / Inv #</Label>
                                                <Input
                                                    value={withdrawTransactionId}
                                                    onChange={(e) => setWithdrawTransactionId(e.target.value)}
                                                    placeholder="e.g. PayPal-998"
                                                    className="h-9"
                                                />
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="conversion" className="space-y-4 pt-1 outline-none">
                                        <div className="space-y-3">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold">Select Payment to Convert</Label>
                                                <Select
                                                    value={selectedPaymentId}
                                                    onValueChange={(val) => {
                                                        setSelectedPaymentId(val);
                                                        if (val === "manual-gap") {
                                                            const pTotal = selectedEarning.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
                                                            const gap = selectedEarning.paidAmount - pTotal;
                                                            setWithdrawAmount(gap.toFixed(2));
                                                            setWithdrawInvoiceNumber("manual");
                                                            setWithdrawTransactionId("");
                                                            setWithdrawMethod("Cash");
                                                        } else {
                                                            const p = selectedEarning.payments?.find(p => (p as any)._id === val);
                                                            if (p) {
                                                                setWithdrawAmount(p.amount.toString());
                                                                setWithdrawInvoiceNumber(p.invoiceNumber || "manual");
                                                                setWithdrawTransactionId(p.transactionId || "");
                                                                setWithdrawMethod(p.method || "Cash");
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger className="w-full h-9">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {selectedEarning.payments?.filter(p => !p.amountInBDT || p.amountInBDT <= p.amount + 0.01 || p.conversionRate <= 1.1).map((p: any) => (
                                                            <SelectItem key={p._id} value={p._id}>
                                                                {formatCurrency(p.amount, selectedEarning.currency)} via {p.method} ({p.invoiceNumber})
                                                            </SelectItem>
                                                        ))}
                                                        {(() => {
                                                            const pTotal = selectedEarning.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
                                                            const gap = selectedEarning.paidAmount - pTotal;
                                                            if (gap > 0.01) {
                                                                return (
                                                                    <SelectItem value="manual-gap">
                                                                        {formatCurrency(gap, selectedEarning.currency)} (Manual/Marked Paid)
                                                                    </SelectItem>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border border-dashed border-border/60">
                                                <div>
                                                    <div className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">Amount</div>
                                                    <div className="text-sm font-semibold">
                                                        {selectedPaymentId === "manual-gap"
                                                            ? formatCurrency(selectedEarning.paidAmount - (selectedEarning.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0), selectedEarning.currency)
                                                            : formatCurrency(Number(withdrawAmount), selectedEarning.currency)}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">Method</div>
                                                    <div className="text-sm font-semibold">{withdrawMethod}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">Invoice</div>
                                                    <div className="text-sm font-semibold truncate">#{withdrawInvoiceNumber}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">Reference</div>
                                                    <div className="text-sm font-semibold truncate">{withdrawTransactionId || "N/A"}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </TabsContent>
                                </Tabs>

                                <div className="grid grid-cols-3 gap-4 border-t border-border/50 pt-6">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">Conversion Rate</Label>
                                        <Input
                                            type="number"
                                            value={withdrawRate}
                                            onChange={(e) => setWithdrawRate(e.target.value)}
                                            placeholder="e.g. 120"
                                            className="h-9"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">Fees</Label>
                                        <Input
                                            type="number"
                                            value={withdrawFees}
                                            onChange={(e) => setWithdrawFees(e.target.value)}
                                            className="h-9"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">Tax</Label>
                                        <Input
                                            type="number"
                                            value={withdrawTax}
                                            onChange={(e) => setWithdrawTax(e.target.value)}
                                            className="h-9"
                                        />
                                    </div>
                                </div>

                                <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-5">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm font-medium text-green-700 dark:text-green-400">
                                            Final Payout
                                        </span>
                                        <span className="text-2xl font-black text-green-700 dark:text-green-400">
                                            {formatCurrency(withdrawBDT)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>
                                            Net: {formatCurrency(withdrawNetAmount, selectedEarning.currency)}
                                        </span>
                                        <span>Rate: {withdrawRateNum}</span>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Internal Notes</Label>
                                    <Textarea
                                        value={withdrawNotes}
                                        onChange={(e) => setWithdrawNotes(e.target.value)}
                                        placeholder="Add any transaction details..."
                                        rows={2}
                                        className="resize-none"
                                    />
                                </div>
                            </div>
                        </ScrollArea>
                    )}
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="ghost"
                            onClick={() => setIsWithdrawDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmWithdraw}
                            disabled={
                                isWithdrawing ||
                                !withdrawRateNum ||
                                withdrawRateNum <= 0
                            }
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            {isWithdrawing && (
                                <Loader className="h-4 w-4  animate-spin" />
                            )}
                            Record Payment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Details Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Earning Details</DialogTitle>
                    </DialogHeader>
                    {selectedEarning && (
                        <div className="pt-2 space-y-5">
                            <div className="flex items-center justify-between p-4 bg-muted/40 rounded-lg">
                                <span className="text-sm font-medium text-muted-foreground">
                                    Status
                                </span>
                                <Badge
                                    variant={
                                        selectedEarning.status === "paid"
                                            ? "default"
                                            : "secondary"
                                    }
                                    className={
                                        selectedEarning.status === "paid"
                                            ? "bg-green-500/15 text-green-600 hover:bg-green-500/25"
                                            : "bg-orange-500/15 text-orange-600 hover:bg-orange-500/25"
                                    }
                                >
                                    {selectedEarning.status.toUpperCase()}
                                </Badge>
                            </div>

                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <div className="text-muted-foreground text-xs mb-1">
                                            Period
                                        </div>
                                        <div className="font-medium">
                                            {
                                                MONTHS.find(
                                                    (m) =>
                                                        m.value ===
                                                        selectedEarning.month,
                                                )?.label
                                            }{" "}
                                            {selectedEarning.year}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground text-xs mb-1">
                                            Client
                                        </div>
                                        <div className="font-medium truncate">
                                            {selectedEarning.clientId?.name ||
                                                selectedEarning.legacyClientCode ||
                                                "N/A"}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground text-xs mb-1">
                                            Orders
                                        </div>
                                        <div className="font-medium">
                                            {selectedEarning.isLegacy
                                                ? "Legacy"
                                                : `${selectedEarning.orderIds?.length || 0} orders`}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground text-xs mb-1">
                                            Amount
                                        </div>
                                        <div className="font-medium">
                                            {formatCurrency(
                                                selectedEarning.totalAmount,
                                                selectedEarning.currency,
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {selectedEarning.status === "paid" && (
                                    <>
                                        <div className="h-px bg-border/50 my-2" />
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <div className="text-muted-foreground text-xs mb-1">
                                                    Fees & Tax
                                                </div>
                                                <div className="font-medium text-destructive">
                                                    -
                                                    {formatCurrency(
                                                        selectedEarning.fees +
                                                        selectedEarning.tax,
                                                        selectedEarning.currency,
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-muted-foreground text-xs mb-1">
                                                    Net Amount
                                                </div>
                                                <div className="font-medium">
                                                    {formatCurrency(
                                                        selectedEarning.netAmount,
                                                        selectedEarning.currency,
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-muted-foreground text-xs mb-1">
                                                    Conversion Rate
                                                </div>
                                                <div className="font-medium">
                                                    {
                                                        selectedEarning.conversionRate
                                                    }{" "}
                                                    BDT
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-muted-foreground text-xs mb-1">
                                                    Paid At
                                                </div>
                                                <div className="font-medium">
                                                    {selectedEarning.paidAt
                                                        ? format(
                                                            new Date(
                                                                selectedEarning.paidAt,
                                                            ),
                                                            "P",
                                                        )
                                                        : "-"}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-3 bg-green-500/5 rounded border border-green-500/10 flex justify-between items-center mt-2">
                                            <span className="text-xs font-medium text-green-700 dark:text-green-500">
                                                Total Payout
                                            </span>
                                            <span className="text-lg font-bold text-green-700 dark:text-green-500">
                                                {formatCurrency(
                                                    selectedEarning.amountInBDT,
                                                )}
                                            </span>
                                        </div>
                                    </>
                                )}

                                {selectedEarning.payments && selectedEarning.payments.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                            <HistoryIcon className="h-3 w-3" />
                                            Payment Ledger
                                        </div>
                                        <div className="rounded-lg border overflow-hidden">
                                            <Table className="text-[11px]">
                                                <TableHeader className="bg-muted/30">
                                                    <TableRow className="h-8">
                                                        <TableHead className="h-8">Invoice</TableHead>
                                                        <TableHead className="h-8">Method</TableHead>
                                                        <TableHead className="h-8 text-right">Amount</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {selectedEarning.payments.map((payment, idx) => (
                                                        <TableRow key={idx} className="h-8">
                                                            <TableCell className="h-8 font-mono py-1">
                                                                #{payment.invoiceNumber}
                                                            </TableCell>
                                                            <TableCell className="h-8 py-1">{payment.method}</TableCell>
                                                            <TableCell className="h-8 text-right py-1 font-medium">
                                                                {formatCurrency(payment.amount, selectedEarning.currency)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                )}

                                {selectedEarning.notes && (
                                    <div className="text-xs bg-muted/20 p-2.5 rounded italic text-muted-foreground border border-border/50">
                                        &quot;{selectedEarning.notes}&quot;
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Same Bulk Withdraw & Delete Dialogs (Keeping logic, updating style if needed) */}
            <Dialog
                open={isBulkWithdrawDialogOpen}
                onOpenChange={(open) => {
                    setIsBulkWithdrawDialogOpen(open);
                    if (!open) {
                        setBulkClientId("");
                        setBulkFees("0");
                        setBulkTax("0");
                        setBulkNotes("");
                    }
                }}
            >
                <DialogContent className="max-w-4xl! max-h-[85vh] w-full overflow-hidden flex flex-col p-0">
                    <DialogHeader className="px-6 py-4 border-b">
                        <DialogTitle className="flex items-center gap-2">
                            <Wallet className="h-5 w-5 text-primary" />
                            Monthly Payout Statement
                        </DialogTitle>
                        <DialogDescription>
                            Generate and process withdrawal for{" "}
                            {format(
                                new Date(bulkYear, bulkMonth - 1),
                                "MMMM yyyy",
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {/* Selection Bar */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/40 rounded-xl border border-border/50">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Period
                                </Label>
                                <div className="flex gap-2">
                                    <Select
                                        value={bulkYear.toString()}
                                        onValueChange={(v) =>
                                            setBulkYear(parseInt(v))
                                        }
                                    >
                                        <SelectTrigger className="bg-background">
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
                                    <Select
                                        value={bulkMonth.toString()}
                                        onValueChange={(v) =>
                                            setBulkMonth(parseInt(v))
                                        }
                                    >
                                        <SelectTrigger className="bg-background">
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
                            </div>

                            <div className="space-y-1.5 md:col-span-2">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Client Account
                                </Label>
                                <Select
                                    value={bulkClientId}
                                    onValueChange={handleBulkClientChange}
                                    disabled={isFetchingClients}
                                >
                                    <SelectTrigger
                                        className={cn(
                                            "bg-background transition-colors",
                                            !bulkClientId && "border-dashed",
                                        )}
                                    >
                                        <SelectValue
                                            placeholder={
                                                isFetchingClients
                                                    ? "Loading clients..."
                                                    : "Select client to generate statement..."
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clientsWithEarnings.length === 0 ? (
                                            <div className="p-4 text-center space-y-2">
                                                <div className="mx-auto bg-muted rounded-full w-10 h-10 flex items-center justify-center">
                                                    <Search className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                                <div className="text-sm font-medium">
                                                    No results found
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    No unpaid earnings found for{" "}
                                                    {format(
                                                        new Date(
                                                            bulkYear,
                                                            bulkMonth - 1,
                                                        ),
                                                        "MMMM yyyy",
                                                    )}
                                                </p>
                                            </div>
                                        ) : (
                                            clientsWithEarnings.map(
                                                (client) => (
                                                    <SelectItem
                                                        key={client._id}
                                                        value={client._id}
                                                        className="cursor-pointer"
                                                    >
                                                        <div className="flex items-center justify-between w-full gap-2">
                                                            <span className="font-medium">
                                                                {client.name}
                                                            </span>
                                                            <Badge
                                                                variant="outline"
                                                                className="text-[10px] h-5"
                                                            >
                                                                {client.currency ||
                                                                    "USD"}
                                                            </Badge>
                                                        </div>
                                                    </SelectItem>
                                                ),
                                            )
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Statement Content */}
                        {isLoadingClientOrders ? (
                            <div className="py-12 flex flex-col items-center justify-center space-y-3 opacity-80">
                                <Loader className="h-8 w-8 animate-spin text-primary" />
                                <span className="text-sm font-medium">
                                    Fetching orders...
                                </span>
                            </div>
                        ) : bulkClientId && bulkOrdersData ? (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                {/* Summary Cards */}
                                <div className="grid grid-cols-2 gap-4">
                                    <Card className="bg-primary/5 border-primary/20 shadow-sm">
                                        <CardContent className="p-4">
                                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                                                <FileText className="h-3.5 w-3.5" />{" "}
                                                Total Orders
                                            </p>
                                            <p className="text-2xl font-bold mt-1 text-foreground">
                                                {bulkOrdersData.orderCount}
                                            </p>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-primary/5 border-primary/20 shadow-sm">
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                                                        <CreditCard className="h-3.5 w-3.5" />{" "}
                                                        Gross Revenue
                                                    </p>
                                                    <p className="text-2xl font-bold mt-1 text-primary">
                                                        {formatCurrency(
                                                            bulkOrdersData.totalAmount,
                                                            bulkOrdersData.currency,
                                                        )}
                                                    </p>
                                                </div>
                                                <Badge className="bg-primary/20 text-primary hover:bg-primary/20">
                                                    {bulkOrdersData.currency}
                                                </Badge>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Deductions Form */}
                                <div className="bg-card rounded-xl border shadow-sm p-5 space-y-4">
                                    <div className="flex items-center gap-2 pb-2 border-b">
                                        <Settings2 className="h-4 w-4 text-muted-foreground" />
                                        <h4 className="text-sm font-semibold">
                                            Payout Adjustments
                                        </h4>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">
                                                Marketplace Fees
                                            </Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-medium">
                                                    {CURRENCY_SYMBOLS[
                                                        bulkOrdersData?.currency ||
                                                        "USD"
                                                    ] || "$"}
                                                </span>
                                                <Input
                                                    type="number"
                                                    value={bulkFees}
                                                    onChange={(e) =>
                                                        setBulkFees(
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="pl-7 bg-muted/40"
                                                    min={0}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">
                                                Withholding Tax
                                            </Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-medium">
                                                    {CURRENCY_SYMBOLS[
                                                        bulkOrdersData?.currency ||
                                                        "USD"
                                                    ] || "$"}
                                                </span>
                                                <Input
                                                    type="number"
                                                    value={bulkTax}
                                                    onChange={(e) =>
                                                        setBulkTax(
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="pl-7 bg-muted/40"
                                                    min={0}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                                Exchange Rate
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Info className="h-3 w-3 text-muted-foreground/50 cursor-pointer" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            1{" "}
                                                            {
                                                                bulkOrdersData?.currency
                                                            }{" "}
                                                            = ? BDT
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-medium">
                                                    ৳
                                                </span>
                                                <Input
                                                    type="number"
                                                    value={bulkRate}
                                                    onChange={(e) =>
                                                        setBulkRate(
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="pl-7 bg-muted/40"
                                                    min={0}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Net Payout */}
                                <div className="bg-linear-to-br from-green-500/10 to-emerald-500/5 rounded-xl border border-green-500/20 p-5">
                                    <div className="flex flex-col sm:flex-row justify-between items-end gap-4">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-green-700 dark:text-green-400">
                                                Net Payout Amount
                                            </p>
                                            <div className="text-3xl font-bold text-green-700 dark:text-green-400 tracking-tight">
                                                {formatCurrency(bulkBDT)}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                * Includes deductions for fees (
                                                {formatCurrency(
                                                    bulkFeesNum,
                                                    bulkOrdersData.currency,
                                                )}
                                                ) and tax (
                                                {formatCurrency(
                                                    bulkTaxNum,
                                                    bulkOrdersData.currency,
                                                )}
                                                )
                                            </p>
                                        </div>
                                        <div className="w-full sm:w-auto">
                                            <div className="text-right text-xs text-muted-foreground mb-1">
                                                Net:{" "}
                                                {formatCurrency(
                                                    bulkNetAmount,
                                                    bulkOrdersData.currency,
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs">
                                        Transaction Notes
                                    </Label>
                                    <Textarea
                                        value={bulkNotes}
                                        onChange={(e) =>
                                            setBulkNotes(e.target.value)
                                        }
                                        placeholder="Add invoice number, transaction ID, or references..."
                                        className="h-20 resize-none bg-muted/40"
                                    />
                                </div>
                            </div>
                        ) : (
                            // Empty State Initial
                            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 opacity-50">
                                <div className="bg-muted p-4 rounded-full">
                                    <Receipt className="h-8 w-8" />
                                </div>
                                <div>
                                    <p className="text-lg font-medium">
                                        Payout Statement
                                    </p>
                                    <p className="text-sm">
                                        Select a client above to auto-generate
                                        the statement
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="p-4 border-t bg-muted/10">
                        <div className="flex items-center justify-between w-full">
                            <Button
                                variant="ghost"
                                onClick={() =>
                                    setIsBulkWithdrawDialogOpen(false)
                                }
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleConfirmBulkWithdraw}
                                disabled={
                                    !bulkOrdersData ||
                                    isWithdrawing ||
                                    !bulkRateNum ||
                                    bulkRateNum <= 0
                                }
                                className="bg-green-600 hover:bg-green-700 text-white min-w-[140px]"
                            >
                                {isWithdrawing ? (
                                    <>
                                        <Loader className=" h-4 w-4 animate-spin" />{" "}
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        Process Payout{" "}
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Client Dialog */}
            <Dialog
                open={isEditClientDialogOpen}
                onOpenChange={setIsEditClientDialogOpen}
            >
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Update Client</DialogTitle>
                        <DialogDescription>
                            Change the client associated with this earning
                            record.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Select Client</Label>
                            <Select
                                value={editClientId}
                                onValueChange={setEditClientId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a client" />
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

                        {selectedEarning && (
                            <div className="text-sm rounded-md bg-muted p-3 text-muted-foreground">
                                <p>
                                    Moving this earning (
                                    {formatCurrency(
                                        selectedEarning.totalAmount,
                                        selectedEarning.currency,
                                    )}
                                    ) from{" "}
                                    <span className="font-medium text-foreground">
                                        {selectedEarning.clientId?.name ||
                                            "Unknown"}
                                    </span>
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setIsEditClientDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmEditClient}
                            disabled={isUpdating || !editClientId}
                        >
                            {isUpdating && (
                                <Loader className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Update Client
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete the earning record. The associated order will
                            remain unchanged.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {isDeleting && (
                                <Loader className="h-4 w-4  animate-spin" />
                            )}
                            Delete Record
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
