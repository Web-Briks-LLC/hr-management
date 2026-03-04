"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
    useGetMyWalletTransactionsQuery,
    useGetMeQuery,
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
import { ChevronLeft, ChevronRight, Wallet } from "lucide-react";

export default function BalancesPage() {
    const [page, setPage] = useState(1);
    const limit = 10;

    const { data: meData, isLoading: isMeLoading } = useGetMeQuery({});
    const {
        data: txData,
        isLoading: isTxLoading,
        isFetching,
    } = useGetMyWalletTransactionsQuery({ page, limit });

    const balance = meData?.staff?.balance || 0;
    const transactions = txData?.data || [];
    const meta = txData?.meta;

    if (isMeLoading || isTxLoading) {
        return (
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div className="flex items-center justify-between space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">
                        Balances
                    </h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Current Balance
                        </CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ৳{balance.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Available funds
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card className="mt-4">
                <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                    <CardDescription>
                        View your latest commissions and withdrawals.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">
                                        Amount (BDT)
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={5}
                                            className="h-24 text-center"
                                        >
                                            No transactions found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    transactions.map(
                                        (tx: Record<string, string>) => (
                                            <TableRow key={tx._id}>
                                                <TableCell className="font-medium">
                                                    {format(
                                                        new Date(tx.createdAt),
                                                        "dd MMM, yyyy",
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {tx.description}
                                                </TableCell>
                                                <TableCell className="capitalize">
                                                    {tx.type}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={
                                                            tx.status ===
                                                            "completed"
                                                                ? "default"
                                                                : tx.status ===
                                                                    "pending"
                                                                  ? "secondary"
                                                                  : "destructive"
                                                        }
                                                    >
                                                        {tx.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-green-600 dark:text-green-400">
                                                    +৳
                                                    {tx.amount.toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        ),
                                    )
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {meta && meta.totalPages > 1 && (
                        <div className="flex items-center justify-end space-x-2 py-4">
                            <span className="text-sm text-muted-foreground">
                                Page {meta.page} of {meta.totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setPage((p) => Math.max(1, p - 1))
                                }
                                disabled={page === 1 || isFetching}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setPage((p) =>
                                        Math.min(meta.totalPages || p, p + 1),
                                    )
                                }
                                disabled={
                                    page === meta.totalPages || isFetching
                                }
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
