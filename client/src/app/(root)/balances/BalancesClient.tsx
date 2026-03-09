"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
    useGetMyWalletTransactionsQuery,
    useGetMeQuery,
    useGetStaffsQuery,
    useGetAllTransactionsQuery,
    useAdminWithdrawMutation,
} from "@/redux/features/staff/staffApi";
import {
    Card,
    CardContent,
    CardDescription,
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
    Wallet,
    ArrowDownCircle,
    TrendingUp,
    Filter,
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
        isLoading: isAdminStaffLoading,
        isFetching: isAdminStaffFetching
    } = useGetStaffsQuery(
        { page: staffPage, limit },
        { skip: !isAdmin }
    );

    // All Transactions (Admin only)
    const {
        data: allTxData,
        isLoading: isAllTxLoading,
        isFetching: isAllTxFetching
    } = useGetAllTransactionsQuery(
        { page: allTxPage, limit },
        { skip: !isAdmin }
    );

    const [adminWithdraw] = useAdminWithdrawMutation();

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
        } catch (err: any) {
            toast.error(err.data?.message || "Failed to process withdrawal");
        }
    };

    if (isMeLoading || isTxLoading) {
        return (
            <div className="flex-1 space-y-4 p-8 pt-6 text-foreground bg-background min-h-screen">
                <div className="flex items-center justify-between space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">Balances</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    <Skeleton className="h-[120px] w-full rounded-xl" />
                    <Skeleton className="h-[120px] w-full rounded-xl" />
                    <Skeleton className="h-[120px] w-full rounded-xl" />
                </div>
                <Skeleton className="h-[400px] w-full border mt-4" />
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Balances</h2>
            </div>

            <Tabs defaultValue={isAdmin ? "staff-balances" : "my-balance"} className="w-full">
                <TabsList className={isAdmin ? "" : "hidden"}>
                    {!isAdmin && <TabsTrigger value="my-balance">My Balance</TabsTrigger>}
                    <TabsTrigger value="staff-balances">Staff Balances</TabsTrigger>
                    <TabsTrigger value="all-transactions">All Transactions</TabsTrigger>
                </TabsList>

                {!isAdmin && (
                    <TabsContent value="my-balance" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20 shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
                                    <Wallet className="h-4 w-4 text-blue-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">৳{calculatedBalance.toLocaleString()}</div>
                                    <p className="text-muted-foreground mt-1">Calculated from transaction logs</p>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20 shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
                                    <TrendingUp className="h-4 w-4 text-green-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">৳{totalEarned.toLocaleString()}</div>
                                    <p className="text-muted-foreground mt-1">Sum of all earnings & rewards</p>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20 shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Withdrawn</CardTitle>
                                    <ArrowDownCircle className="h-4 w-4 text-orange-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">৳{totalWithdrawn.toLocaleString()}</div>
                                    <p className="text-muted-foreground mt-1">Sum of all payouts processed</p>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                                <div>
                                    <CardTitle>Transaction History</CardTitle>
                                    <CardDescription>View your latest commissions and withdrawals.</CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                                    <Select value={typeFilter} onValueChange={(val) => { setTypeFilter(val); setMyTxPage(1); }}>
                                        <SelectTrigger className="w-[140px] h-8">
                                            <SelectValue placeholder="Filter type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Types</SelectItem>
                                            <SelectItem value="commission">Commissions</SelectItem>
                                            <SelectItem value="withdrawal">Withdrawals</SelectItem>
                                            <SelectItem value="reward">Rewards</SelectItem>
                                            <SelectItem value="adjustment">Adjustments</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                <TableHead className="w-[120px]">Date</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead className="w-[100px]">Type</TableHead>
                                                <TableHead className="w-[100px]">Status</TableHead>
                                                <TableHead className="text-right w-[150px]">Amount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {isTxFetching && transactions.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="h-24 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <Skeleton className="h-4 w-4 rounded-full animate-pulse" />
                                                            Loading...
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : transactions.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                        No transactions found.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                transactions.map((tx: any) => (
                                                    <TableRow key={tx._id} className="hover:bg-muted/30 transition-colors">
                                                        <TableCell className="font-medium">
                                                            {format(new Date(tx.createdAt), "dd MMM, yyyy")}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">{tx.description}</span>
                                                                {tx.metadata?.clientName && (
                                                                    <span className="text-muted-foreground uppercase tracking-tight">Client: {tx.metadata.clientName}</span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="capitalize font-normal">
                                                                {tx.type}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant={tx.status === "completed" ? "default" : "secondary"}
                                                                className="px-1.5 font-normal"
                                                            >
                                                                {tx.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className={`text-right font-bold ${tx.type === 'withdrawal' ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                                                            {tx.type === 'withdrawal' ? '-' : '+'}৳{tx.amount.toLocaleString()}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                {myTxMeta && myTxMeta.totalPages > 1 && (
                                    <div className="flex items-center justify-end space-x-2 py-4">
                                        <span className="text-muted-foreground mr-2">Page {myTxMeta.page} of {myTxMeta.totalPages}</span>
                                        <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setMyTxPage(p => Math.max(1, p - 1))} disabled={myTxPage === 1 || isTxFetching}>
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setMyTxPage(p => Math.min(myTxMeta.totalPages || p, p + 1))} disabled={myTxPage === myTxMeta.totalPages || isTxFetching}>
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                <TabsContent value="staff-balances" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Staff Wallet Management</CardTitle>
                            <CardDescription>View all staff balances and process intentional payouts.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead>Staff Member</TableHead>
                                            <TableHead>Staff ID</TableHead>
                                            <TableHead>Designation</TableHead>
                                            <TableHead className="text-right">Balance</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isAdminStaffFetching && (!adminStaffData || staffPage > 1) ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center">Loading...</TableCell>
                                            </TableRow>
                                        ) : adminStaffData?.staffs?.map((staff: any) => (
                                            <TableRow key={staff._id}>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{staff.user?.name}</span>
                                                        <span className="text-muted-foreground">{staff.phone}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{staff.staffId}</TableCell>
                                                <TableCell className="capitalize">{staff.designation}</TableCell>
                                                <TableCell className="text-right font-bold text-blue-600">৳{staff.balance?.toLocaleString() || 0}</TableCell>
                                                <TableCell className="text-right">
                                                    <WithdrawDialog staff={staff} onWithdraw={handleWithdraw} />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {adminStaffData?.meta && adminStaffData.meta.totalPages > 1 && (
                                <div className="flex items-center justify-end space-x-2 py-4">
                                    <span className="text-muted-foreground mr-2">Page {adminStaffData.meta.page} of {adminStaffData.meta.totalPages}</span>
                                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setStaffPage(p => Math.max(1, p - 1))} disabled={staffPage === 1 || isAdminStaffFetching}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setStaffPage(p => Math.min(adminStaffData.meta.totalPages || p, p + 1))} disabled={staffPage === adminStaffData.meta.totalPages || isAdminStaffFetching}>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="all-transactions" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Global Audit Log</CardTitle>
                            <CardDescription>Track every financial transaction across the entire system.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead>Date & Time</TableHead>
                                            <TableHead>Staff Name</TableHead>
                                            <TableHead>Activity</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isAllTxFetching && (!allTxData || allTxPage > 1) ? (
                                            <TableRow><TableCell colSpan={5} className="text-center h-24">Loading audit log...</TableCell></TableRow>
                                        ) : allTxData?.data?.map((tx: any) => (
                                            <TableRow key={tx._id}>
                                                <TableCell>{format(new Date(tx.createdAt), "dd MMM HH:mm")}</TableCell>
                                                <TableCell className="font-medium">{tx.staffId?.userId?.name || 'Deleted Staff'}</TableCell>
                                                <TableCell>{tx.description}</TableCell>
                                                <TableCell><Badge variant="outline" className="uppercase py-0 leading-none h-4">{tx.type}</Badge></TableCell>
                                                <TableCell className={`text-right font-bold ${tx.type === 'withdrawal' ? 'text-red-500' : 'text-green-600'}`}>
                                                    {tx.type === 'withdrawal' ? '-' : '+'}৳{tx.amount.toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {allTxData?.meta && allTxData.meta.totalPages > 1 && (
                                <div className="flex items-center justify-end space-x-2 py-4">
                                    <span className="text-muted-foreground mr-2">Page {allTxData.meta.page} of {allTxData.meta.totalPages}</span>
                                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setAllTxPage(p => Math.max(1, p - 1))} disabled={allTxPage === 1 || isAllTxFetching}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setAllTxPage(p => Math.min(allTxData.meta.totalPages || p, p + 1))} disabled={allTxPage === allTxData.meta.totalPages || isAllTxFetching}>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function WithdrawDialog({ staff, onWithdraw }: { staff: any, onWithdraw: any }) {
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
        } catch (err) {
            // Error handled in parent
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" disabled={staff.balance <= 0}>Process Payout</Button>
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
                        <div className="col-span-3 font-bold text-blue-600">৳{staff.balance?.toLocaleString()}</div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount" className="text-right">Amount (৳)</Label>
                        <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="col-span-3 h-8" placeholder="0.00" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="desc" className="text-right">Notes</Label>
                        <Input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3 h-8" placeholder="Cash payment, bank transfer, etc." />
                    </div>
                </div>
                <DialogFooter className="flex-row justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={isSubmitting}>Cancel</Button>
                    <Button size="sm" onClick={handleSubmit} disabled={!amount || parseFloat(amount) > staff.balance || isSubmitting}>
                        {isSubmitting ? "Processing..." : "Confirm Payout"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
