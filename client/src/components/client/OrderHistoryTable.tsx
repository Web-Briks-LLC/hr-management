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
import { Eye, CheckCircle2, FileText } from "lucide-react";
import Link from 'next/link';
import { format } from "date-fns";
import { IOrder } from "@/types/order.type";
import { ORDER_STATUS_LABELS, ORDER_PRIORITY_LABELS, ORDER_STATUS_COLORS, ORDER_PRIORITY_COLORS } from "@/lib/constants";

interface OrderHistoryTableProps {
    orders: IOrder[];
    isLoading: boolean;
    currency?: string;
}

export function OrderHistoryTable({ orders, isLoading, currency = "USD" }: OrderHistoryTableProps) {
    const formatCurrency = (amount: number) => {
        const safeCurrency = currency || 'USD';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: safeCurrency,
        }).format(amount);
    };

    if (isLoading) {
        return (
            <Table>
                <TableHeader className="bg-muted/40">
                    <TableRow className="hover:bg-muted/40 border-b-border/60">
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
                        <TableRow key={i} className="border-b last:border-b-0">
                            <TableCell className="py-3 pl-4">
                                <Skeleton className="h-4 w-32 bg-muted animate-pulse rounded-md" />
                            </TableCell>
                            <TableCell className="py-3">
                                <Skeleton className="h-4 w-20 mx-auto bg-muted animate-pulse rounded-md" />
                            </TableCell>
                            <TableCell className="py-3">
                                <Skeleton className="h-4 w-12 mx-auto bg-muted animate-pulse rounded-md" />
                            </TableCell>
                            <TableCell className="py-3">
                                <Skeleton className="h-4 w-20 mx-auto bg-muted animate-pulse rounded-md" />
                            </TableCell>
                            <TableCell className="py-3">
                                <Skeleton className="h-6 w-20 mx-auto rounded-full bg-muted animate-pulse" />
                            </TableCell>
                            <TableCell className="py-3 pr-4 text-right">
                                <Skeleton className="h-8 w-8 ml-auto bg-muted animate-pulse rounded-md" />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );
    }

    return (
        <Table>
            <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-muted/40 border-b-border/60">
                    <TableHead className="font-semibold py-3 pl-4">Order Name</TableHead>
                    <TableHead className="font-semibold py-3 text-center">Date</TableHead>
                    <TableHead className="font-semibold py-3 text-center">Images</TableHead>
                    <TableHead className="font-semibold py-3 text-center">Price</TableHead>
                    <TableHead className="font-semibold py-3 text-center">Status</TableHead>
                    <TableHead className="font-semibold py-3 text-right pr-4">Action</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {orders.length === 0 ? (
                    <TableRow>
                        <TableCell
                            colSpan={6}
                            className="py-12 text-center text-muted-foreground"
                        >
                            No orders found for this client.
                        </TableCell>
                    </TableRow>
                ) : (
                    orders.map((order) => (
                        <TableRow key={order._id} className="hover:bg-muted/15 transition-colors border-b last:border-b-0">
                            <TableCell className="py-3 pl-4 font-medium">
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm font-semibold text-foreground">{order.orderName}</span>
                                    <div className="flex items-center gap-2">
                                        {order.isPaid ? (
                                            <Badge variant="outline" className="text-[9px] h-4 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                                                <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> PAID
                                            </Badge>
                                        ) : order.invoiceNumber ? (
                                            <Badge variant="outline" className="text-[9px] h-4 bg-blue-500/10 text-blue-500 border-blue-500/20">
                                                <FileText className="h-2.5 w-2.5 mr-0.5" /> INV #{order.invoiceNumber}
                                            </Badge>
                                        ) : null}
                                        <Badge variant="outline" className={`text-[9px] h-4 uppercase ${ORDER_PRIORITY_COLORS[order.priority]}`}>
                                            {ORDER_PRIORITY_LABELS[order.priority]}
                                        </Badge>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="py-3 text-center text-xs text-muted-foreground">
                                {order.orderDate ? format(new Date(order.orderDate), "MMM dd, yyyy") : "N/A"}
                            </TableCell>
                            <TableCell className="py-3 text-center text-sm font-bold">
                                {order.imageQuantity}
                            </TableCell>
                            <TableCell className="py-3 text-center text-sm font-semibold">
                                {formatCurrency(order.totalPrice)}
                            </TableCell>
                            <TableCell className="py-3 text-center">
                                <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${ORDER_STATUS_COLORS[order.status]}`}
                                >
                                    {ORDER_STATUS_LABELS[order.status]}
                                </span>
                            </TableCell>
                            <TableCell className="py-3 pr-4 text-right">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    asChild
                                    className="h-8 w-8 hover:bg-muted border border-transparent hover:border-border transition-all"
                                >
                                    <Link href={`/orders?id=${order._id}`}>
                                        <Eye className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    );
}
