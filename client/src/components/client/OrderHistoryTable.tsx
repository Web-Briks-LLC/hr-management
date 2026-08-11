"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Eye, CheckCircle2, FileText, ShoppingBag } from "lucide-react";
import Link from 'next/link';
import { format } from "date-fns";
import type { IOrder } from "@/types/order.type";
import {
    ORDER_STATUS_LABELS,
    ORDER_PRIORITY_LABELS,
    ORDER_STATUS_COLORS,
    ORDER_PRIORITY_COLORS,
} from "@/lib/constants";

interface OrderHistoryTableProps {
    orders: IOrder[];
    isLoading: boolean;
    currency?: string;
}

export function OrderHistoryTable({
    orders,
    isLoading,
    currency = "USD",
}: OrderHistoryTableProps) {
    const formatCurrency = (amount: number) => {
        const safeCurrency = currency || "USD";
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: safeCurrency,
        }).format(amount);
    };

    if (isLoading) {
        return (
            <Table>
                <TableHeader className="bg-muted/40">
                    <TableRow className="border-b border-border/60">
                        <TableHead className="font-semibold py-3 pl-4">Order Name</TableHead>
                        <TableHead className="font-semibold py-3 text-center">Date</TableHead>
                        <TableHead className="font-semibold py-3 text-center">Images</TableHead>
                        <TableHead className="font-semibold py-3 text-center">Price</TableHead>
                        <TableHead className="font-semibold py-3 text-center">Status</TableHead>
                        <TableHead className="font-semibold py-3 text-right pr-4">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {[...Array(5)].map((_, i) => (
                        <TableRow key={i} className="border-b border-border/40 last:border-b-0">
                            <TableCell className="py-3 pl-4">
                                <Skeleton className="h-4 w-36 rounded-md" />
                            </TableCell>
                            <TableCell className="py-3">
                                <Skeleton className="h-4 w-20 mx-auto rounded-md" />
                            </TableCell>
                            <TableCell className="py-3">
                                <Skeleton className="h-4 w-12 mx-auto rounded-md" />
                            </TableCell>
                            <TableCell className="py-3">
                                <Skeleton className="h-4 w-20 mx-auto rounded-md" />
                            </TableCell>
                            <TableCell className="py-3">
                                <Skeleton className="h-5 w-20 mx-auto rounded-full" />
                            </TableCell>
                            <TableCell className="py-3 pr-4 text-right">
                                <Skeleton className="h-8 w-8 ml-auto rounded-md" />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );
    }

    return (
        <TooltipProvider>
            <Table>
                <TableHeader className="bg-muted/40">
                    <TableRow className="border-b border-border/60">
                        <TableHead className="font-semibold py-3 pl-4 text-xs uppercase tracking-wider text-muted-foreground">
                            Order Details
                        </TableHead>
                        <TableHead className="font-semibold py-3 text-center text-xs uppercase tracking-wider text-muted-foreground">
                            Date
                        </TableHead>
                        <TableHead className="font-semibold py-3 text-center text-xs uppercase tracking-wider text-muted-foreground">
                            Images
                        </TableHead>
                        <TableHead className="font-semibold py-3 text-center text-xs uppercase tracking-wider text-muted-foreground">
                            Total Price
                        </TableHead>
                        <TableHead className="font-semibold py-3 text-center text-xs uppercase tracking-wider text-muted-foreground">
                            Status
                        </TableHead>
                        <TableHead className="font-semibold py-3 text-right pr-4 text-xs uppercase tracking-wider text-muted-foreground">
                            Action
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {orders.length === 0 ? (
                        <TableRow>
                            <TableCell
                                colSpan={6}
                                className="py-16 text-center text-muted-foreground"
                            >
                                <div className="flex flex-col items-center justify-center space-y-2">
                                    <div className="p-3 rounded-full bg-muted/60">
                                        <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <p className="text-sm font-medium text-foreground">
                                        No orders found
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        This client does not have any orders matching the current filter.
                                    </p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        orders.map((order) => (
                            <TableRow
                                key={order._id}
                                className="hover:bg-muted/25 transition-colors border-b border-border/40 last:border-b-0"
                            >
                                <TableCell className="py-3.5 pl-4 font-medium">
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
                                            <Link href={`/orders?id=${order._id}`}>
                                                {order.orderName}
                                            </Link>
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            {order.isPaid ? (
                                                <Badge
                                                    variant="outline"
                                                    className="text-[9px] h-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                                >
                                                    <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> PAID
                                                </Badge>
                                            ) : order.invoiceNumber ? (
                                                <Badge
                                                    variant="outline"
                                                    className="text-[9px] h-4 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                                >
                                                    <FileText className="h-2.5 w-2.5 mr-0.5" /> INV #{order.invoiceNumber}
                                                </Badge>
                                            ) : null}
                                            <Badge
                                                variant="outline"
                                                className={`text-[9px] h-4 uppercase font-semibold ${ORDER_PRIORITY_COLORS[order.priority]}`}
                                            >
                                                {ORDER_PRIORITY_LABELS[order.priority]}
                                            </Badge>
                                            {order.revisionCount > 0 && (
                                                <Badge variant="secondary" className="text-[9px] h-4 font-semibold px-1">
                                                    R{order.revisionCount}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="py-3.5 text-center text-xs text-muted-foreground font-medium">
                                    {order.orderDate
                                        ? format(new Date(order.orderDate), "MMM dd, yyyy")
                                        : "N/A"}
                                </TableCell>
                                <TableCell className="py-3.5 text-center text-sm font-bold text-foreground">
                                    {order.imageQuantity}
                                </TableCell>
                                <TableCell className="py-3.5 text-center text-sm font-semibold text-foreground font-mono">
                                    {formatCurrency(order.totalPrice)}
                                </TableCell>
                                <TableCell className="py-3.5 text-center">
                                    <span
                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${ORDER_STATUS_COLORS[order.status]}`}
                                    >
                                        {ORDER_STATUS_LABELS[order.status]}
                                    </span>
                                </TableCell>
                                <TableCell className="py-3.5 pr-4 text-right">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                asChild
                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                            >
                                                <Link href={`/orders?id=${order._id}`}>
                                                    <Eye className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>View Order</TooltipContent>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </TooltipProvider>
    );
}
