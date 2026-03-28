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
import { Eye, Clock, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import Link from 'next/link';
import { format } from "date-fns";
import { IOrder, OrderStatus, OrderPriority } from "@/types/order.type";
import { ORDER_STATUS_LABELS, ORDER_PRIORITY_LABELS, ORDER_STATUS_COLORS, ORDER_PRIORITY_COLORS } from "@/lib/constants";

interface OrderHistoryTableProps {
    orders: IOrder[];
    isLoading: boolean;
    currency?: string;
}

export function OrderHistoryTable({ orders, isLoading, currency = "USD" }: OrderHistoryTableProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(amount);
    };

    if (isLoading) {
        return (
            <div className="border rounded-xl bg-card overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="border-r">Order Name</TableHead>
                            <TableHead className="border-r text-center">Date</TableHead>
                            <TableHead className="border-r text-center">Images</TableHead>
                            <TableHead className="border-r text-center">Price</TableHead>
                            <TableHead className="border-r text-center">Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(5)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell className="border-r">
                                    <Skeleton className="h-4 w-32" />
                                </TableCell>
                                <TableCell className="border-r">
                                    <Skeleton className="h-4 w-20 mx-auto" />
                                </TableCell>
                                <TableCell className="border-r">
                                    <Skeleton className="h-4 w-12 mx-auto" />
                                </TableCell>
                                <TableCell className="border-r">
                                    <Skeleton className="h-4 w-20 mx-auto" />
                                </TableCell>
                                <TableCell className="border-r">
                                    <Skeleton className="h-6 w-20 mx-auto rounded-full" />
                                </TableCell>
                                <TableCell className="text-right">
                                    <Skeleton className="h-8 w-8 ml-auto" />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        );
    }

    return (
        <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
            <Table>
                <TableHeader className="bg-muted/30">
                    <TableRow>
                        <TableHead className="border-r font-semibold">Order Name</TableHead>
                        <TableHead className="border-r text-center font-semibold">Date</TableHead>
                        <TableHead className="border-r text-center font-semibold">Images</TableHead>
                        <TableHead className="border-r text-center font-semibold">Price</TableHead>
                        <TableHead className="border-r text-center font-semibold">Status</TableHead>
                        <TableHead className="text-right font-semibold">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {orders.length === 0 ? (
                        <TableRow>
                            <TableCell
                                colSpan={6}
                                className="h-32 text-center text-muted-foreground"
                            >
                                No orders found for this client.
                            </TableCell>
                        </TableRow>
                    ) : (
                        orders.map((order) => (
                            <TableRow key={order._id} className="group hover:bg-muted/10 transition-colors">
                                <TableCell className="border-r font-medium py-4">
                                    <div className="flex flex-col gap-1">
                                        <span>{order.orderName}</span>
                                        <div className="flex items-center gap-2">
                                            {order.isPaid ? (
                                                <Badge variant="outline" className="text-[9px] h-4 bg-green-50 text-green-700 border-green-200">
                                                    <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> PAID
                                                </Badge>
                                            ) : order.invoiceNumber ? (
                                                <Badge variant="outline" className="text-[9px] h-4 bg-blue-50 text-blue-700 border-blue-200">
                                                    <FileText className="h-2.5 w-2.5 mr-0.5" /> INV #{order.invoiceNumber}
                                                </Badge>
                                            ) : null}
                                            <Badge variant="outline" className={`text-[9px] h-4 uppercase ${ORDER_PRIORITY_COLORS[order.priority]}`}>
                                                {ORDER_PRIORITY_LABELS[order.priority]}
                                            </Badge>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="border-r text-center py-4 text-xs">
                                    {format(new Date(order.orderDate), "MMM dd, yyyy")}
                                </TableCell>
                                <TableCell className="border-r text-center py-4 text-sm font-bold">
                                    {order.imageQuantity}
                                </TableCell>
                                <TableCell className="border-r text-center py-4 text-sm font-semibold">
                                    {formatCurrency(order.totalPrice)}
                                </TableCell>
                                <TableCell className="border-r text-center py-4">
                                    <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${ORDER_STATUS_COLORS[order.status]}`}
                                    >
                                        {ORDER_STATUS_LABELS[order.status]}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right py-4">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        asChild
                                        className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all"
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
        </div>
    );
}
