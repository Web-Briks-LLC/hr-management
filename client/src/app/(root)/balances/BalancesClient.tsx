"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
    useGetMyWalletTransactionsQuery,
    useGetMeQuery,
    useGetStaffsQuery,
    useGetAllTransactionsQuery,
    useAdminWithdrawMutation,
    useSyncCommissionsMutation,
} from "@/redux/features/staff/staffApi";
import { cn } from "@/lib/utils";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Wallet,
    ArrowDownCircle,
    TrendingUp,
    Filter,
    Users,
    History,
    RefreshCw,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface IWalletTx {
    _id: string;
    amount: number;
    type: string;
    description: string;
    status: string;
    createdAt: string;
    staffId?: {
        userId?: {
            name?: string;
        };
    };
    metadata?: {
        clientName?: string;
    };
}

interface IStaffWallet {
    _id: string;
    staffId: string;
    phone?: string;
    designation?: string;
    balance?: number;
    user?: {
        name?: string;
    };
}

export default function BalancesClient() {
    // Separate pagination states for each tab
    const [myTxPage, setMyTxPage] = useState(1);
    const [staffPage, setStaffPage] = useState(1);
    const [allTxPage, setAllTxPage] = useState(1);

    const [typeFilter, setTypeFilter] = useState("all");
    const limit = 10;

    const { data: meData, isLoading: isMeLoading } = useGetMeQuery({});

    // My Transactions
    const {
        data: txData,
        isLoading: isTxLoading,
        isFetching: isTxFetching,
    } = useGetMyWalletTransactionsQuery({
        page: myTxPage,
        limit,
        type: typeFilter === "all" ? undefined : typeFilter
    });

    const isAdmin = ["admin", "super_admin", "owner"].includes(meData?.user?.role || meData?.staff?.user?.role);

    // Staff Balances (Admin only)
    const {
        data: adminStaffData,
        isFetching: isAdminStaffFetching
    } = useGetStaffsQuery(
        { page: staffPage, limit, designation: "telemarketer", hasBalance: true },
        { skip: !isAdmin }
    );

    // All Transactions (Admin only)
    const {
        data: allTxData,
        isFetching: isAllTxFetching
    } = useGetAllTransactionsQuery(
        { page: allTxPage, limit },
        { skip: !isAdmin }
    );

    const [adminWithdraw] = useAdminWithdrawMutation();
    const [syncCommissions, { isLoading: isSyncing }] = useSyncCommissionsMutation();

    const transactions = txData?.data || [];
    const myTxMeta = txData?.meta;

    // Calculate accurate balance from transaction logs to avoid sync issues
    const totalEarned = myTxMeta?.totalEarned || 0;
    const totalWithdrawn = myTxMeta?.totalWithdrawn || 0;
    const calculatedBalance = totalEarned - totalWithdrawn;

    const handleWithdraw = async (staffDocId: string, amount: number, description: string) => {
        try {
            await adminWithdraw({ staffDocId, amount, description }).unwrap();
            toast.success("Withdrawal processed successfully");
        } catch (err: unknown) {
            const error = err as { data?: { message?: string } };
            toast.error(error?.data?.message || "Failed to process withdrawal");
        }
    };

    const handleSyncCommissions = async () => {
        try {
            const res = await syncCommissions({}).unwrap();
            toast.success(res?.message || "Commissions and balances synchronized successfully");
        } catch (err: unknown) {
            const error = err as { data?: { message?: string } };
            toast.error(error?.data?.message || "Failed to synchronize commissions");
        }
    };

    if (isMeLoading || isTxLoading) {
        return (
            <div className="space-y-8 p-1">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <Skeleton className="h-8 w-48 bg-muted animate-pulse rounded-md" />
                        <Skeleton className="h-4 w-72 bg-muted animate-pulse rounded-md mt-2" />
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    <Skeleton className="h-[120px] w-full rounded-xl bg-muted animate-pulse" />
                    <Skeleton className="h-[120px] w-full rounded-xl bg-muted animate-pulse" />
                    <Skeleton className="h-[120px] w-full rounded-xl bg-muted animate-pulse" />
                </div>
                <Skeleton className="h-[400px] w-full rounded-xl bg-muted animate-pulse" />
            </div>
        );
    }

    return (
        <div className="space-y-8 p-1">
            {/* Header Overview */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text">
                        Balances Overview
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        Manage staff wallets, commissions, and payout withdrawals.
                    </p>
                </div>
                {isAdmin && (
                    <Button
                        variant="outline"
                        onClick={handleSyncCommissions}
                        disabled={isSyncing}
                        className="gap-2 shadow-xs"
                    >
                        <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                        {isSyncing ? "Syncing..." : "Sync Commissions"}
                    </Button>
                )}
            </div>

            <Tabs defaultValue={isAdmin ? "staff-balances" : "my-balance"} className="w-full space-y-6">
                {isAdmin && (
                    <TabsList className="bg-muted/40 p-1 border border-border/50 rounded-xl h-auto flex flex-wrap gap-1 w-max">
                        <TabsTrigger
                            value="staff-balances"
                            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs px-4 py-2 text-sm font-medium rounded-lg transition-all"
                        >
                            <Users className="h-4 w-4 mr-2" />
                            Staff Balances
                        </TabsTrigger>
                        <TabsTrigger
                            value="all-transactions"
                            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs px-4 py-2 text-sm font-medium rounded-lg transition-all"
                        >
                            <History className="h-4 w-4 mr-2" />
                            All Transactions
                        </TabsTrigger>
                        <TabsTrigger
                            value="my-balance"
                            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs px-4 py-2 text-sm font-medium rounded-lg transition-all"
                        >
                            <Wallet className="h-4 w-4 mr-2" />
                            My Wallet
                        </TabsTrigger>
                    </TabsList>
                )}

                {/* My Balance Tab */}
                <TabsContent value="my-balance" className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {/* Available Balance */}
                        <Card className="relative overflow-hidden border-border/60 hover:border-border transition-all duration-200 group shadow-xs">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <div className="h-24 w-24 rounded-full bg-blue-500 blur-2xl" />
                            </div>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <span className="text-sm font-medium text-muted-foreground">
                                    Available Balance
                                </span>
                                <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border-0 font-medium">
                                    Wallet
                                </Badge>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-baseline justify-between">
                                    <span className="text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                                        ৳{calculatedBalance.toLocaleString()}
                                    </span>
                                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                                        <Wallet className="h-5 w-5" />
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground font-medium">
                                    Calculated from transaction logs
                                </div>
                            </CardContent>
                        </Card>

                        {/* Total Earned */}
                        <Card className="relative overflow-hidden border-border/60 hover:border-border transition-all duration-200 group shadow-xs">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <div className="h-24 w-24 rounded-full bg-emerald-500 blur-2xl" />
                            </div>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <span className="text-sm font-medium text-muted-foreground">
                                    Total Earned
                                </span>
                                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-0 font-medium">
                                    Gross Earnings
                                </Badge>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-baseline justify-between">
                                    <span className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                                        ৳{totalEarned.toLocaleString()}
                                    </span>
                                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                                        <TrendingUp className="h-5 w-5" />
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground font-medium">
                                    Sum of all commissions & rewards
                                </div>
                            </CardContent>
                        </Card>

                        {/* Total Withdrawn */}
                        <Card className="relative overflow-hidden border-border/60 hover:border-border transition-all duration-200 group shadow-xs">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <div className="h-24 w-24 rounded-full bg-orange-500 blur-2xl" />
                            </div>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <span className="text-sm font-medium text-muted-foreground">
                                    Total Withdrawn
                                </span>
                                <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 border-0 font-medium">
                                    Payouts
                                </Badge>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-baseline justify-between">
                                    <span className="text-3xl font-bold tracking-tight text-orange-600 dark:text-orange-400">
                                        ৳{totalWithdrawn.toLocaleString()}
                                    </span>
                                    <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 shrink-0">
                                        <ArrowDownCircle className="h-5 w-5" />
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground font-medium">
                                    Sum of all payouts processed
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* My Transactions Card */}
                    <Card className="border-border/60 shadow-md">
                        <CardHeader className="pb-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    <History className="h-5 w-5 text-primary" />
                                    Transaction History
                                </CardTitle>
                                <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg border border-border/50 shrink-0">
                                    <Filter className="h-4 w-4 text-primary ml-1" />
                                    <span className="text-xs font-medium">Filter:</span>
                                    <Select value={typeFilter} onValueChange={(val) => { setTypeFilter(val); setMyTxPage(1); }}>
                                        <SelectTrigger className="w-[140px] h-8 bg-background/60 text-xs font-medium">
                                            <SelectValue placeholder="Filter type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all" className="text-xs">All Types</SelectItem>
                                            <SelectItem value="commission" className="text-xs">Commissions</SelectItem>
                                            <SelectItem value="withdrawal" className="text-xs">Withdrawals</SelectItem>
                                            <SelectItem value="reward" className="text-xs">Rewards</SelectItem>
                                            <SelectItem value="adjustment" className="text-xs">Adjustments</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="rounded-md border border-border/60 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/40">
                                        <TableRow className="hover:bg-muted/40 border-b-border/60">
                                            <TableHead className="font-semibold py-3 pl-4 w-[140px]">Date</TableHead>
                                            <TableHead className="font-semibold py-3">Description</TableHead>
                                            <TableHead className="font-semibold py-3 w-[120px]">Type</TableHead>
                                            <TableHead className="font-semibold py-3 w-[120px]">Status</TableHead>
                                            <TableHead className="font-semibold py-3 text-right pr-4 w-[160px]">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isTxFetching && transactions.length === 0 ? (
                                            Array.from({ length: 5 }).map((_, i) => (
                                                <TableRow key={i} className="border-b last:border-b-0">
                                                    <TableCell className="py-3 pl-4">
                                                        <Skeleton className="h-4 w-24 bg-muted animate-pulse rounded-md" />
                                                    </TableCell>
                                                    <TableCell className="py-3">
                                                        <Skeleton className="h-4 w-48 bg-muted animate-pulse rounded-md" />
                                                    </TableCell>
                                                    <TableCell className="py-3">
                                                        <Skeleton className="h-6 w-20 rounded-full bg-muted animate-pulse" />
                                                    </TableCell>
                                                    <TableCell className="py-3">
                                                        <Skeleton className="h-6 w-16 rounded-full bg-muted animate-pulse" />
                                                    </TableCell>
                                                    <TableCell className="py-3 pr-4 text-right">
                                                        <Skeleton className="h-4 w-20 ml-auto bg-muted animate-pulse rounded-md" />
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : transactions.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground font-medium">
                                                    No transactions found.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            transactions.map((tx: IWalletTx) => (
                                                <TableRow key={tx._id} className="hover:bg-muted/15 transition-colors border-b last:border-b-0">
                                                    <TableCell className="py-3 pl-4 font-medium text-xs text-muted-foreground">
                                                        {format(new Date(tx.createdAt), "PPP")}
                                                    </TableCell>
                                                    <TableCell className="py-3">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-sm text-foreground">{tx.description}</span>
                                                            {tx.metadata?.clientName && (
                                                                <span className="text-xs text-muted-foreground uppercase font-mono">Client: {tx.metadata.clientName}</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-3">
                                                        <Badge variant="outline" className="capitalize font-normal text-xs">
                                                            {tx.type}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="py-3">
                                                        <Badge
                                                            variant={tx.status === "completed" ? "default" : "secondary"}
                                                            className="px-2 py-0.5 text-xs font-medium"
                                                        >
                                                            {tx.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className={`py-3 pr-4 text-right font-bold text-sm ${tx.type === 'withdrawal' ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                        {tx.type === 'withdrawal' ? '-' : '+'}৳{tx.amount.toLocaleString()}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination Footer */}
                            {myTxMeta && (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/60">
                                    <div className="text-sm text-muted-foreground font-medium select-none">
                                        Showing <span className="font-semibold text-foreground">{transactions.length}</span> of{" "}
                                        <span className="font-semibold text-foreground">{myTxMeta.total}</span> transactions
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setMyTxPage(1)}
                                            disabled={myTxPage === 1 || isTxFetching}
                                        >
                                            <ChevronsLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setMyTxPage((p) => Math.max(1, p - 1))}
                                            disabled={myTxPage === 1 || isTxFetching}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <span className="text-xs font-medium px-2 whitespace-nowrap select-none">
                                            Page {myTxMeta.page} of {myTxMeta.totalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setMyTxPage((p) => Math.min(myTxMeta.totalPages, p + 1))}
                                            disabled={myTxPage >= myTxMeta.totalPages || isTxFetching}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setMyTxPage(myTxMeta.totalPages)}
                                            disabled={myTxPage >= myTxMeta.totalPages || isTxFetching}
                                        >
                                            <ChevronsRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Staff Balances Tab */}
                <TabsContent value="staff-balances" className="space-y-6">
                    <Card className="border-border/60 shadow-md">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <Users className="h-5 w-5 text-primary" />
                                Staff Wallet Management
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="rounded-md border border-border/60 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/40">
                                        <TableRow className="hover:bg-muted/40 border-b-border/60">
                                            <TableHead className="font-semibold py-3 pl-4">Staff Member</TableHead>
                                            <TableHead className="font-semibold py-3">Staff ID</TableHead>
                                            <TableHead className="font-semibold py-3">Designation</TableHead>
                                            <TableHead className="font-semibold py-3 text-right">Balance</TableHead>
                                            <TableHead className="font-semibold py-3 text-right pr-4">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isAdminStaffFetching && (!adminStaffData || staffPage > 1) ? (
                                            Array.from({ length: 5 }).map((_, i) => (
                                                <TableRow key={i} className="border-b last:border-b-0">
                                                    <TableCell className="py-3 pl-4">
                                                        <Skeleton className="h-4 w-32 bg-muted animate-pulse rounded-md" />
                                                    </TableCell>
                                                    <TableCell className="py-3">
                                                        <Skeleton className="h-4 w-20 bg-muted animate-pulse rounded-md" />
                                                    </TableCell>
                                                    <TableCell className="py-3">
                                                        <Skeleton className="h-4 w-24 bg-muted animate-pulse rounded-md" />
                                                    </TableCell>
                                                    <TableCell className="py-3 text-right">
                                                        <Skeleton className="h-4 w-20 ml-auto bg-muted animate-pulse rounded-md" />
                                                    </TableCell>
                                                    <TableCell className="py-3 pr-4 text-right">
                                                        <Skeleton className="h-8 w-28 ml-auto bg-muted animate-pulse rounded-md" />
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : adminStaffData?.staffs?.map((staff: IStaffWallet) => (
                                            <TableRow key={staff._id} className="hover:bg-muted/15 transition-colors border-b last:border-b-0">
                                                <TableCell className="py-3 pl-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-sm text-foreground">{staff.user?.name}</span>
                                                        <span className="text-xs text-muted-foreground font-mono">{staff.phone}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-3 font-mono text-xs">{staff.staffId}</TableCell>
                                                <TableCell className="py-3 capitalize text-sm">{staff.designation}</TableCell>
                                                <TableCell className="py-3 text-right font-bold text-sm text-blue-600 dark:text-blue-400">৳{staff.balance?.toLocaleString() || 0}</TableCell>
                                                <TableCell className="py-3 pr-4 text-right">
                                                    <WithdrawDialog staff={staff} onWithdraw={handleWithdraw} />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination Footer */}
                            {adminStaffData?.meta && (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/60">
                                    <div className="text-sm text-muted-foreground font-medium select-none">
                                        Showing <span className="font-semibold text-foreground">{adminStaffData.staffs?.length || 0}</span> of{" "}
                                        <span className="font-semibold text-foreground">{adminStaffData.meta.total}</span> staff members
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setStaffPage(1)}
                                            disabled={staffPage === 1 || isAdminStaffFetching}
                                        >
                                            <ChevronsLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setStaffPage((p) => Math.max(1, p - 1))}
                                            disabled={staffPage === 1 || isAdminStaffFetching}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <span className="text-xs font-medium px-2 whitespace-nowrap select-none">
                                            Page {adminStaffData.meta.page} of {adminStaffData.meta.totalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setStaffPage((p) => Math.min(adminStaffData.meta.totalPages, p + 1))}
                                            disabled={staffPage >= adminStaffData.meta.totalPages || isAdminStaffFetching}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setStaffPage(adminStaffData.meta.totalPages)}
                                            disabled={staffPage >= adminStaffData.meta.totalPages || isAdminStaffFetching}
                                        >
                                            <ChevronsRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* All Transactions Tab */}
                <TabsContent value="all-transactions" className="space-y-6">
                    <Card className="border-border/60 shadow-md">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <History className="h-5 w-5 text-primary" />
                                Global Audit Log
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="rounded-md border border-border/60 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/40">
                                        <TableRow className="hover:bg-muted/40 border-b-border/60">
                                            <TableHead className="font-semibold py-3 pl-4 w-[160px]">Date & Time</TableHead>
                                            <TableHead className="font-semibold py-3">Staff Name</TableHead>
                                            <TableHead className="font-semibold py-3">Activity</TableHead>
                                            <TableHead className="font-semibold py-3 w-[120px]">Type</TableHead>
                                            <TableHead className="font-semibold py-3 text-right pr-4 w-[160px]">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isAllTxFetching && (!allTxData || allTxPage > 1) ? (
                                            Array.from({ length: 5 }).map((_, i) => (
                                                <TableRow key={i} className="border-b last:border-b-0">
                                                    <TableCell className="py-3 pl-4">
                                                        <Skeleton className="h-4 w-24 bg-muted animate-pulse rounded-md" />
                                                    </TableCell>
                                                    <TableCell className="py-3">
                                                        <Skeleton className="h-4 w-32 bg-muted animate-pulse rounded-md" />
                                                    </TableCell>
                                                    <TableCell className="py-3">
                                                        <Skeleton className="h-4 w-48 bg-muted animate-pulse rounded-md" />
                                                    </TableCell>
                                                    <TableCell className="py-3">
                                                        <Skeleton className="h-6 w-20 rounded-full bg-muted animate-pulse" />
                                                    </TableCell>
                                                    <TableCell className="py-3 pr-4 text-right">
                                                        <Skeleton className="h-4 w-20 ml-auto bg-muted animate-pulse rounded-md" />
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : allTxData?.data?.map((tx: IWalletTx) => (
                                            <TableRow key={tx._id} className="hover:bg-muted/15 transition-colors border-b last:border-b-0">
                                                <TableCell className="py-3 pl-4 font-medium text-xs text-muted-foreground">
                                                    {format(new Date(tx.createdAt), "PPP p")}
                                                </TableCell>
                                                <TableCell className="py-3 font-semibold text-sm text-foreground">{tx.staffId?.userId?.name || 'Deleted Staff'}</TableCell>
                                                <TableCell className="py-3 text-sm">{tx.description}</TableCell>
                                                <TableCell className="py-3">
                                                    <Badge variant="outline" className="uppercase py-0.5 text-xs font-medium">
                                                        {tx.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className={`py-3 pr-4 text-right font-bold text-sm ${tx.type === 'withdrawal' ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                    {tx.type === 'withdrawal' ? '-' : '+'}৳{tx.amount.toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination Footer */}
                            {allTxData?.meta && (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/60">
                                    <div className="text-sm text-muted-foreground font-medium select-none">
                                        Showing <span className="font-semibold text-foreground">{allTxData.data?.length || 0}</span> of{" "}
                                        <span className="font-semibold text-foreground">{allTxData.meta.total}</span> audit records
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setAllTxPage(1)}
                                            disabled={allTxPage === 1 || isAllTxFetching}
                                        >
                                            <ChevronsLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setAllTxPage((p) => Math.max(1, p - 1))}
                                            disabled={allTxPage === 1 || isAllTxFetching}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <span className="text-xs font-medium px-2 whitespace-nowrap select-none">
                                            Page {allTxData.meta.page} of {allTxData.meta.totalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setAllTxPage((p) => Math.min(allTxData.meta.totalPages, p + 1))}
                                            disabled={allTxPage >= allTxData.meta.totalPages || isAllTxFetching}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setAllTxPage(allTxData.meta.totalPages)}
                                            disabled={allTxPage >= allTxData.meta.totalPages || isAllTxFetching}
                                        >
                                            <ChevronsRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function WithdrawDialog({ staff, onWithdraw }: { staff: IStaffWallet, onWithdraw: (staffDocId: string, amount: number, description: string) => Promise<void> }) {
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            toast.error("Enter a valid amount");
            return;
        }
        setIsSubmitting(true);
        try {
            await onWithdraw(staff._id, parseFloat(amount), description);
            setOpen(false);
            setAmount("");
            setDescription("");
        } catch {
            // Error handled in parent
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-primary text-primary hover:bg-accent shadow-xs" disabled={(staff.balance || 0) <= 0}>Process Payout</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Process Withdrawal</DialogTitle>
                    <DialogDescription>
                        Recording a payout for <strong>{staff.user?.name}</strong>. This will deduct the amount from their wallet balance.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Available</Label>
                        <div className="col-span-3 font-bold text-blue-600 dark:text-blue-400">৳{staff.balance?.toLocaleString() || 0}</div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount" className="text-right">Amount (৳)</Label>
                        <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="col-span-3 h-9" placeholder="0.00" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="desc" className="text-right">Notes</Label>
                        <Input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3 h-9" placeholder="Cash payment, bank transfer, etc." />
                    </div>
                </div>
                <DialogFooter className="flex-row justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={isSubmitting}>Cancel</Button>
                    <Button size="sm" onClick={handleSubmit} disabled={!amount || parseFloat(amount) > (staff.balance || 0) || isSubmitting}>
                        {isSubmitting ? "Processing..." : "Confirm Payout"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
