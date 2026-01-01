'use client';

import { useParams, useRouter } from 'next/navigation';
import { useGetClientByIdQuery, useGetClientStatsQuery } from '@/redux/features/client/clientApi';
import { useGetOrdersByClientQuery } from '@/redux/features/order/orderApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, DollarSign, FileText, CreditCard, AlertCircle, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import type { IOrder, OrderStatus } from '@/types/order.type';
import Link from 'next/link';

const statusColors: Record<OrderStatus, string> = {
    pending: 'bg-gray-500',
    in_progress: 'bg-blue-500',
    quality_check: 'bg-purple-500',
    revision: 'bg-orange-500',
    completed: 'bg-green-500',
    delivered: 'bg-emerald-600',
    cancelled: 'bg-red-500',
};

const statusLabels: Record<OrderStatus, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    quality_check: 'Quality Check',
    revision: 'Revision',
    completed: 'Completed',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
};

export default function ClientDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const clientId = params.id as string;

    const { data: client, isLoading: isLoadingClient, error: clientError } = useGetClientByIdQuery(clientId);
    const { data: stats, isLoading: isLoadingStats } = useGetClientStatsQuery(clientId);
    const { data: ordersData, isLoading: isLoadingOrders } = useGetOrdersByClientQuery({ clientId });

    // Debug logging
    console.log('Client ID:', clientId);
    console.log('Client data:', client);
    console.log('Client error:', clientError);

    const orders = ordersData?.data || [];


    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: client?.currency || 'USD',
        }).format(amount);
    };

    if (isLoadingClient) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-8 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-32" />
                    ))}
                </div>
                <Skeleton className="h-96" />
            </div>
        );
    }

    if (!client) {
        return (
            <div className="p-6">
                <Card>
                    <CardContent className="py-12 text-center">
                        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h2 className="text-xl font-semibold mb-2">Client Not Found</h2>
                        <p className="text-muted-foreground mb-4">
                            The client you&apos;re looking for doesn&apos;t exist.
                        </p>
                        <Button onClick={() => router.push('/clients')}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Clients
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.push('/clients')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{client.name}</h1>
                        <p className="text-muted-foreground">
                            {client.clientId} • {client.email}
                        </p>
                    </div>
                </div>
                <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                    {client.status}
                </Badge>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Orders</p>
                                {isLoadingStats ? (
                                    <Skeleton className="h-8 w-16 mt-1" />
                                ) : (
                                    <p className="text-3xl font-bold">{stats?.totalOrders || 0}</p>
                                )}
                            </div>
                            <div className="p-3 bg-primary/10 rounded-full">
                                <FileText className="h-6 w-6 text-primary" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Amount</p>
                                {isLoadingStats ? (
                                    <Skeleton className="h-8 w-24 mt-1" />
                                ) : (
                                    <p className="text-3xl font-bold text-blue-600">
                                        {formatCurrency(stats?.totalAmount || 0)}
                                    </p>
                                )}
                            </div>
                            <div className="p-3 bg-blue-100 rounded-full">
                                <DollarSign className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Paid Amount</p>
                                {isLoadingStats ? (
                                    <Skeleton className="h-8 w-24 mt-1" />
                                ) : (
                                    <p className="text-3xl font-bold text-green-600">
                                        {formatCurrency(stats?.paidAmount || 0)}
                                    </p>
                                )}
                            </div>
                            <div className="p-3 bg-green-100 rounded-full">
                                <CreditCard className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Due Amount</p>
                                {isLoadingStats ? (
                                    <Skeleton className="h-8 w-24 mt-1" />
                                ) : (
                                    <p className="text-3xl font-bold text-red-600">
                                        {formatCurrency(stats?.dueAmount || 0)}
                                    </p>
                                )}
                            </div>
                            <div className="p-3 bg-red-100 rounded-full">
                                <AlertCircle className="h-6 w-6 text-red-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Client Info */}
            <Card>
                <CardHeader>
                    <CardTitle>Client Information</CardTitle>
                    <CardDescription>Contact and business details</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <p className="text-muted-foreground">Phone</p>
                            <p className="font-medium">{client.phone || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Currency</p>
                            <p className="font-medium">{client.currency || 'USD'}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Address</p>
                            <p className="font-medium">{client.address || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Office Address</p>
                            <p className="font-medium">{client.officeAddress || 'N/A'}</p>
                        </div>
                        {client.description && (
                            <div className="col-span-4">
                                <p className="text-muted-foreground">Description</p>
                                <p className="font-medium">{client.description}</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Orders Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Orders</CardTitle>
                    <CardDescription>All orders from this client</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg">
                        {isLoadingOrders ? (
                            <div className="p-8 text-center">
                                <Skeleton className="h-8 w-full mb-2" />
                                <Skeleton className="h-8 w-full mb-2" />
                                <Skeleton className="h-8 w-full" />
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                                No orders from this client yet
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Order Name</TableHead>
                                        <TableHead>Order Date</TableHead>
                                        <TableHead>Deadline</TableHead>
                                        <TableHead>Images</TableHead>
                                        <TableHead>Total Price</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {orders.map((order: IOrder) => (
                                        <TableRow key={order._id}>
                                            <TableCell className="font-medium">
                                                {order.orderName}
                                            </TableCell>
                                            <TableCell>
                                                {format(new Date(order.orderDate), 'MMM dd, yyyy')}
                                            </TableCell>
                                            <TableCell>
                                                {format(new Date(order.deadline), 'MMM dd, yyyy HH:mm')}
                                            </TableCell>
                                            <TableCell>{order.imageQuantity}</TableCell>
                                            <TableCell className="font-medium">
                                                {formatCurrency(order.totalPrice)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`${statusColors[order.status]} text-white`}>
                                                    {statusLabels[order.status]}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={`/orders/${order._id}`}>
                                                        <ExternalLink className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
