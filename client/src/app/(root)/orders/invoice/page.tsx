'use client';

import { useState, useMemo } from 'react';
import { useGetClientsQuery } from '@/redux/features/client/clientApi';
import { useGetOrdersQuery } from '@/redux/features/order/orderApi';
import { useLazyGetNextInvoiceNumberQuery } from '@/redux/features/invoice/invoiceApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import type { IOrder, OrderStatus } from '@/types/order.type';
import type { Client } from '@/types/client.type';
import dynamic from 'next/dynamic';

// Dynamically import the PDF component to avoid SSR issues
const InvoicePDF = dynamic(() => import('@/components/invoice/InvoicePDF'), {
    ssr: false,
    loading: () => <span>Loading PDF generator...</span>,
});

const statusLabels: Record<OrderStatus, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    quality_check: 'Quality Check',
    revision: 'Revision',
    completed: 'Completed',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
};

const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
];

export default function InvoicePage() {
    const currentDate = new Date();
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [selectedMonth, setSelectedMonth] = useState<string>(String(currentDate.getMonth() + 1));
    const [selectedYear, setSelectedYear] = useState<string>(String(currentDate.getFullYear()));
    const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
    const [invoiceNumber, setInvoiceNumber] = useState<string>('');
    const [showPDF, setShowPDF] = useState(false);

    const [getNextInvoiceNumber, { isLoading: isGeneratingInvoice }] = useLazyGetNextInvoiceNumberQuery();

    // Fetch clients
    const { data: clientsData, isLoading: isLoadingClients } = useGetClientsQuery({
        limit: 100,
    });

    const clients = clientsData?.clients || [];

    // Fetch orders for selected client and month
    const { data: ordersData, isLoading: isLoadingOrders } = useGetOrdersQuery(
        selectedClientId
            ? {
                clientId: selectedClientId,
                startDate: `${selectedYear}-${selectedMonth.padStart(2, '0')}-01`,
                endDate: format(new Date(parseInt(selectedYear), parseInt(selectedMonth), 0), 'yyyy-MM-dd') + 'T23:59:59.999Z',
            }
            : undefined,
        { skip: !selectedClientId }
    );

    const orders = ordersData?.data || [];

    // Get selected client details
    const selectedClient = useMemo(() => {
        return clients.find((c: Client) => c._id === selectedClientId);
    }, [clients, selectedClientId]);

    // Get selected order objects
    const selectedOrdersList = useMemo(() => {
        return orders.filter((order: IOrder) => selectedOrders.has(order._id));
    }, [orders, selectedOrders]);

    // Calculate totals
    const totals = useMemo(() => {
        let totalImages = 0;
        let totalAmount = 0;
        selectedOrdersList.forEach((order: IOrder) => {
            totalImages += order.imageQuantity;
            totalAmount += order.totalPrice;
        });
        return { totalImages, totalAmount };
    }, [selectedOrdersList]);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedOrders(new Set(orders.map((o: IOrder) => o._id)));
        } else {
            setSelectedOrders(new Set());
        }
    };

    const handleSelectOrder = (orderId: string, checked: boolean) => {
        const newSelected = new Set(selectedOrders);
        if (checked) {
            newSelected.add(orderId);
        } else {
            newSelected.delete(orderId);
        }
        setSelectedOrders(newSelected);
    };

    const handleGenerateInvoice = async () => {
        if (selectedOrders.size === 0) return;

        try {
            const result = await getNextInvoiceNumber().unwrap();
            if (result.success) {
                setInvoiceNumber(result.formattedInvoiceNumber); // or result.invoiceNumber.toString()
                setShowPDF(true);
            }
        } catch (error) {
            console.error('Failed to generate invoice number:', error);
            // Optionally show toast error here
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: selectedClient?.currency || 'USD',
        }).format(amount);
    };

    // Generate years (current year and 2 previous years)
    const years = [
        String(currentDate.getFullYear()),
        String(currentDate.getFullYear() - 1),
        String(currentDate.getFullYear() - 2),
    ];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/orders">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Generate Invoice</h1>
                    <p className="text-muted-foreground">
                        Select client and orders to generate an invoice
                    </p>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>Select Orders</CardTitle>
                    <CardDescription>Choose a client and time period to view orders</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Client Select */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Client</label>
                            {isLoadingClients ? (
                                <Skeleton className="h-10 w-full" />
                            ) : (
                                <Select
                                    value={selectedClientId}
                                    onValueChange={(value) => {
                                        setSelectedClientId(value);
                                        setSelectedOrders(new Set());
                                        setShowPDF(false);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a client" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clients.map((client: Client) => (
                                            <SelectItem key={client._id} value={client._id}>
                                                {client.name} ({client.clientId})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        {/* Month Select */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Month</label>
                            <Select
                                value={selectedMonth}
                                onValueChange={(value) => {
                                    setSelectedMonth(value);
                                    setSelectedOrders(new Set());
                                    setShowPDF(false);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {months.map((month) => (
                                        <SelectItem key={month.value} value={month.value}>
                                            {month.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Year Select */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Year</label>
                            <Select
                                value={selectedYear}
                                onValueChange={(value) => {
                                    setSelectedYear(value);
                                    setSelectedOrders(new Set());
                                    setShowPDF(false);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map((year) => (
                                        <SelectItem key={year} value={year}>
                                            {year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Generate Button */}
                        <div className="flex items-end">
                            <Button
                                onClick={handleGenerateInvoice}
                                disabled={selectedOrders.size === 0 || isGeneratingInvoice}
                                className="w-full bg-teal-500 hover:bg-teal-600"
                            >
                                <FileText className="h-4 w-4 mr-2" />
                                {isGeneratingInvoice ? 'Generating...' : `Generate Invoice (${selectedOrders.size})`}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Orders Table */}
            {selectedClientId && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Orders</CardTitle>
                                <CardDescription>
                                    {selectedClient?.name} - {months.find((m) => m.value === selectedMonth)?.label}{' '}
                                    {selectedYear}
                                </CardDescription>
                            </div>
                            {selectedOrders.size > 0 && (
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground">
                                        Selected: {selectedOrders.size} orders
                                    </p>
                                    <p className="font-semibold">
                                        Total: {formatCurrency(totals.totalAmount)}
                                    </p>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="border">
                            {isLoadingOrders ? (
                                <div className="p-8 text-center">
                                    <Skeleton className="h-8 w-full mb-2" />
                                    <Skeleton className="h-8 w-full mb-2" />
                                    <Skeleton className="h-8 w-full" />
                                </div>
                            ) : orders.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    No orders found for this period
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12 border">
                                                <Checkbox
                                                    checked={
                                                        orders.length > 0 &&
                                                        selectedOrders.size === orders.length
                                                    }
                                                    onCheckedChange={handleSelectAll}
                                                />
                                            </TableHead>
                                            <TableHead className="border">Order Name</TableHead>
                                            <TableHead className="border">Order Date</TableHead>
                                            <TableHead className="border">Images</TableHead>
                                            <TableHead className="border">Per Image</TableHead>
                                            <TableHead className="border">Total</TableHead>
                                            <TableHead className="border">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {orders.map((order: IOrder) => (
                                            <TableRow
                                                key={order._id}
                                                className={
                                                    selectedOrders.has(order._id)
                                                        ? 'bg-muted/50'
                                                        : ''
                                                }
                                            >
                                                <TableCell className="border">
                                                    <Checkbox
                                                        checked={selectedOrders.has(order._id)}
                                                        onCheckedChange={(checked) =>
                                                            handleSelectOrder(
                                                                order._id,
                                                                checked as boolean
                                                            )
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell className="font-medium border">
                                                    {order.orderName}
                                                </TableCell>
                                                <TableCell className="border">
                                                    {format(new Date(order.orderDate), 'MMM dd, yyyy')}
                                                </TableCell>
                                                <TableCell className="border">{order.imageQuantity}</TableCell>
                                                <TableCell className="border">
                                                    {formatCurrency(order.perImagePrice)}
                                                </TableCell>
                                                <TableCell className="font-medium border">
                                                    {formatCurrency(order.totalPrice)}
                                                </TableCell>
                                                <TableCell className="border">
                                                    <Badge variant="outline">
                                                        {statusLabels[order.status]}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* PDF Preview & Download */}
            {showPDF && selectedClient && selectedOrdersList.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Invoice Preview</CardTitle>
                        <CardDescription>
                            Review and download the invoice
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <InvoicePDF
                            client={selectedClient}
                            orders={selectedOrdersList}
                            month={months.find((m) => m.value === selectedMonth)?.label || ''}
                            year={selectedYear}
                            invoiceNumber={invoiceNumber}
                            totals={totals}
                        />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
