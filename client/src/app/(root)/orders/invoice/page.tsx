"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
    useGetOrdersQuery,
    useGetOrderYearsQuery,
} from "@/redux/features/order/orderApi";
import {
    useLazyGetNextInvoiceNumberQuery,
    useSendInvoiceEmailMutation,
    useRecordInvoiceMutation,
} from "@/redux/features/invoice/invoiceApi";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, FileText, Mail, Loader } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import type { IOrder, OrderStatus } from "@/types/order.type";
import type { Client } from "@/types/client.type";
import dynamic from "next/dynamic";
import { pdf } from "@react-pdf/renderer";
import { InvoiceDocument } from "@/components/invoice/InvoicePDF";
import { toast } from "sonner";

// Dynamically import the PDF component to avoid SSR issues
const InvoicePDF = dynamic(() => import("@/components/invoice/InvoicePDF"), {
    ssr: false,
    loading: () => <span>Loading PDF generator...</span>,
});

const statusLabels: Record<OrderStatus, string> = {
    pending: "Pending",
    in_progress: "In Progress",
    quality_check: "Quality Check",
    revision: "Revision",
    completed: "Completed",
    delivered: "Delivered",
    cancelled: "Cancelled",
};

const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
];

export default function InvoicePage() {
    const currentDate = new Date();
    const [selectedYear, setSelectedYear] = useState<string>("");
    const [selectedMonth, setSelectedMonth] = useState<string>(
        String(currentDate.getMonth() + 1),
    );
    const [selectedClientId, setSelectedClientId] = useState<string>("");
    const [selectedOrders, setSelectedOrders] = useState<Set<string>>(
        new Set(),
    );
    const [invoiceNumber, setInvoiceNumber] = useState<string>("");
    const [paymentToken, setPaymentToken] = useState<string>("");
    const [showPDF, setShowPDF] = useState(false);

    const [sendInvoiceEmail, { isLoading: isSending }] =
        useSendInvoiceEmailMutation();

    // Ref for PDF section scroll
    const pdfSectionRef = useRef<HTMLDivElement>(null);

    const [getNextInvoiceNumber, { isLoading: isGeneratingInvoice }] =
        useLazyGetNextInvoiceNumberQuery();

    const [recordInvoice, { isLoading: isRecording }] =
        useRecordInvoiceMutation();

    // Fetch available years from database
    const { data: yearsData, isLoading: isLoadingYears } =
        useGetOrderYearsQuery();
    const years = useMemo(
        () => yearsData?.data?.map(String) || [],
        [yearsData],
    );

    // Auto-select first year when years load
    useEffect(() => {
        if (years.length > 0 && !selectedYear) {
            setSelectedYear(years[0]);
        }
    }, [years, selectedYear]);

    // Fetch all orders for selected year/month (to get unique clients)
    const { data: allOrdersData, isLoading: isLoadingAllOrders } =
        useGetOrdersQuery(
            selectedYear
                ? {
                      month: parseInt(selectedMonth),
                      year: parseInt(selectedYear),
                      limit: 1000,
                  }
                : undefined,
            { skip: !selectedYear },
        );

    const allOrders = useMemo(() => allOrdersData?.data || [], [allOrdersData]);

    // Extract unique clients from orders
    const availableClients = useMemo(() => {
        const clientMap = new Map<
            string,
            {
                _id: string;
                name: string;
                clientId: string;
                currency?: string;
                address?: string;
                officeAddress?: string;
                email?: string;
            }
        >();
        allOrders.forEach((order: IOrder) => {
            if (order.clientId && !clientMap.has(order.clientId._id)) {
                clientMap.set(order.clientId._id, {
                    _id: order.clientId._id,
                    name: order.clientId.name,
                    clientId: order.clientId.clientId,
                    currency: order.clientId.currency,
                    address: order.clientId.address,
                    officeAddress: order.clientId.officeAddress,
                    email: order.clientId.email,
                });
            }
        });
        return Array.from(clientMap.values()).sort((a, b) =>
            a.name.localeCompare(b.name),
        );
    }, [allOrders]);

    // Filter orders for selected client
    const orders = useMemo(() => {
        if (!selectedClientId) return [];
        return allOrders.filter(
            (order: IOrder) => order.clientId?._id === selectedClientId,
        );
    }, [allOrders, selectedClientId]);

    // Get selected client details
    const selectedClient = useMemo(() => {
        return availableClients.find((c) => c._id === selectedClientId);
    }, [availableClients, selectedClientId]);

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
        if (selectedOrders.size === 0 || !selectedClient) return;

        try {
            const result = await getNextInvoiceNumber().unwrap();
            if (result.success) {
                const generatedNumber = result.formattedInvoiceNumber;

                // Calculate date range
                const orderDates = selectedOrdersList.map((o) =>
                    new Date(o.orderDate).getTime(),
                );
                const minDate = new Date(Math.min(...orderDates)).toISOString();
                const maxDate = new Date(Math.max(...orderDates)).toISOString();

                // Record invoice immediately to get the secure hashed link token
                const recordResult = await recordInvoice({
                    invoiceNumber: generatedNumber,
                    clientName: selectedClient.name,
                    clientId: selectedClient.clientId,
                    clientAddress:
                        selectedClient.address ||
                        selectedClient.officeAddress ||
                        "N/A",
                    companyName: selectedClient.officeAddress || "N/A",
                    totalAmount: totals.totalAmount,
                    currency: selectedClient.currency || "USD",
                    dueDate: new Date(
                        new Date().getTime() + 7 * 24 * 60 * 60 * 1000,
                    ).toISOString(),
                    month: Number(selectedMonth),
                    year: Number(selectedYear),
                    totalImages: totals.totalImages,
                    dateFrom: minDate,
                    dateTo: maxDate,
                    totalOrders: selectedOrdersList.length,
                    items: selectedOrdersList.map((order) => ({
                        name: order.orderName,
                        price: order.perImagePrice * order.imageQuantity,
                        quantity: order.imageQuantity,
                    })),
                }).unwrap();

                if (recordResult.success && recordResult.invoice) {
                    const invoiceData = recordResult.invoice as {
                        paymentToken: string;
                        [key: string]: unknown;
                    };
                    setInvoiceNumber(generatedNumber);
                    setPaymentToken(invoiceData.paymentToken);
                    setShowPDF(true);

                    // Smooth scroll to PDF section
                    setTimeout(() => {
                        pdfSectionRef.current?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                        });
                    }, 100);
                }
            }
        } catch (error) {
            console.error("Failed to generate invoice number:", error);
            toast.error("Failed to generate secure invoice link");
        }
    };

    const handleSendDirectly = async () => {
        if (selectedOrders.size === 0 || !selectedClient) return;

        // Check email first
        const clientEmail = selectedClient.email;
        if (!clientEmail) {
            toast.error("Client email is missing.");
            return;
        }

        try {
            let currentInvoiceNumber = invoiceNumber;
            let currentToken = paymentToken;

            if (!currentInvoiceNumber || !currentToken) {
                const result = await getNextInvoiceNumber().unwrap();
                if (result.success) {
                    currentInvoiceNumber = result.formattedInvoiceNumber;

                    const orderDates = selectedOrdersList.map((o) =>
                        new Date(o.orderDate).getTime(),
                    );
                    const minDate = new Date(
                        Math.min(...orderDates),
                    ).toISOString();
                    const maxDate = new Date(
                        Math.max(...orderDates),
                    ).toISOString();

                    const recordResult = await recordInvoice({
                        invoiceNumber: currentInvoiceNumber,
                        clientName: selectedClient.name,
                        clientId: selectedClient.clientId,
                        clientAddress:
                            selectedClient.address ||
                            selectedClient.officeAddress ||
                            "N/A",
                        companyName: selectedClient.officeAddress || "N/A",
                        totalAmount: totals.totalAmount,
                        currency: selectedClient.currency || "USD",
                        dueDate: new Date(
                            new Date().getTime() + 7 * 24 * 60 * 60 * 1000,
                        ).toISOString(),
                        month: Number(selectedMonth),
                        year: Number(selectedYear),
                        totalImages: totals.totalImages,
                        dateFrom: minDate,
                        dateTo: maxDate,
                        totalOrders: selectedOrdersList.length,
                        items: selectedOrdersList.map((order) => ({
                            name: order.orderName,
                            price: order.perImagePrice * order.imageQuantity,
                            quantity: order.imageQuantity,
                        })),
                    }).unwrap();

                    const invoiceData = recordResult.invoice as {
                        paymentToken: string;
                        [key: string]: unknown;
                    };
                    currentToken = invoiceData.paymentToken;

                    setInvoiceNumber(currentInvoiceNumber);
                    setPaymentToken(currentToken);
                } else {
                    throw new Error("Failed to generate invoice number");
                }
            }

            const fileName = `Invoice_${selectedClient.clientId}_${selectedMonth}_${selectedYear}.pdf`;

            const blob = await pdf(
                <InvoiceDocument
                    client={selectedClient as Client}
                    orders={selectedOrdersList}
                    month={
                        months.find((m) => m.value === selectedMonth)?.label ||
                        ""
                    }
                    year={selectedYear}
                    invoiceNumber={currentInvoiceNumber}
                    paymentToken={currentToken}
                    totals={totals}
                />,
            ).toBlob();

            const formData = new FormData();
            formData.append("file", blob, fileName);
            formData.append("to", clientEmail);
            formData.append("clientName", selectedClient.name);
            formData.append(
                "month",
                months.find((m) => m.value === selectedMonth)?.label || "",
            );
            formData.append("year", selectedYear);

            const result = await sendInvoiceEmail(formData).unwrap();

            if (result.success) {
                toast.success("Invoice sent successfully to " + clientEmail);
            } else {
                throw new Error(result.message || "Failed to send email");
            }
        } catch (error) {
            console.error("Error sending email:", error);
            toast.error((error as Error).message || "Failed to send email");
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: selectedClient?.currency || "USD",
        }).format(amount);
    };

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
                        Select year, month, and client to generate an invoice
                    </p>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>Select Orders</CardTitle>
                    <CardDescription>
                        Choose a year, month, and client to view orders
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Year Select */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Year</label>
                            {isLoadingYears ? (
                                <Skeleton className="h-10 w-full" />
                            ) : (
                                <Select
                                    value={selectedYear}
                                    onValueChange={(value) => {
                                        setSelectedYear(value);
                                        setSelectedClientId("");
                                        setSelectedOrders(new Set());
                                        setShowPDF(false);
                                    }}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue
                                            placeholder={
                                                years.length === 0
                                                    ? "No orders found"
                                                    : "Select year"
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {years.map((year) => (
                                            <SelectItem key={year} value={year}>
                                                {year}
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
                                    setSelectedClientId("");
                                    setSelectedOrders(new Set());
                                    setShowPDF(false);
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {months.map((month) => (
                                        <SelectItem
                                            key={month.value}
                                            value={month.value}
                                        >
                                            {month.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Client Select - Dynamic based on Year/Month */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Client
                            </label>
                            {isLoadingAllOrders ? (
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
                                    <SelectTrigger className="w-full">
                                        <SelectValue
                                            placeholder={
                                                availableClients.length === 0
                                                    ? "No clients found"
                                                    : "Select a client"
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableClients.map((client) => (
                                            <SelectItem
                                                key={client._id}
                                                value={client._id}
                                            >
                                                {client.name} ({client.clientId}
                                                )
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                            {!isLoadingAllOrders &&
                                availableClients.length === 0 && (
                                    <p className="text-xs text-muted-foreground">
                                        No orders found for this period
                                    </p>
                                )}
                        </div>

                        {/* Buttons */}
                        <div className="flex items-end gap-2 flex-wrap">
                            <Button
                                onClick={handleSendDirectly}
                                disabled={
                                    selectedOrders.size === 0 ||
                                    isGeneratingInvoice ||
                                    isSending
                                }
                                className="flex-1 bg-orange-500 hover:bg-orange-600"
                            >
                                {isSending ? (
                                    <Loader className="h-4 w-4  animate-spin" />
                                ) : (
                                    <Mail className="h-4 w-4 " />
                                )}
                                {isSending ? "Processing..." : "Send"}
                            </Button>
                            <Button
                                onClick={handleGenerateInvoice}
                                disabled={
                                    selectedOrders.size === 0 ||
                                    isGeneratingInvoice ||
                                    isRecording ||
                                    isSending
                                }
                                className="flex-1 bg-teal-500 hover:bg-teal-600"
                            >
                                {isGeneratingInvoice ? (
                                    <Loader className="h-4 w-4  animate-spin" />
                                ) : (
                                    <FileText className="h-4 w-4 " />
                                )}
                                {isGeneratingInvoice
                                    ? "Generating..."
                                    : `Generate Invoice (${selectedOrders.size})`}
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
                                    {selectedClient?.name} -{" "}
                                    {
                                        months.find(
                                            (m) => m.value === selectedMonth,
                                        )?.label
                                    }{" "}
                                    {selectedYear}
                                </CardDescription>
                            </div>
                            {selectedOrders.size > 0 && (
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground">
                                        Selected: {selectedOrders.size} orders
                                    </p>
                                    <p className="font-semibold">
                                        Total:{" "}
                                        {formatCurrency(totals.totalAmount)}
                                    </p>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="border">
                            {orders.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    No orders found for this client in this
                                    period
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12 border">
                                                <Checkbox
                                                    checked={
                                                        orders.length > 0 &&
                                                        selectedOrders.size ===
                                                            orders.length
                                                    }
                                                    onCheckedChange={
                                                        handleSelectAll
                                                    }
                                                />
                                            </TableHead>
                                            <TableHead className="border">
                                                Order Name
                                            </TableHead>
                                            <TableHead className="border">
                                                Order Date
                                            </TableHead>
                                            <TableHead className="border">
                                                Images
                                            </TableHead>
                                            <TableHead className="border">
                                                Per Image
                                            </TableHead>
                                            <TableHead className="border">
                                                Total
                                            </TableHead>
                                            <TableHead className="border">
                                                Status
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {orders.map((order: IOrder) => (
                                            <TableRow
                                                key={order._id}
                                                className={
                                                    selectedOrders.has(
                                                        order._id,
                                                    )
                                                        ? "bg-muted/50"
                                                        : ""
                                                }
                                            >
                                                <TableCell className="border">
                                                    <Checkbox
                                                        checked={selectedOrders.has(
                                                            order._id,
                                                        )}
                                                        onCheckedChange={(
                                                            checked,
                                                        ) =>
                                                            handleSelectOrder(
                                                                order._id,
                                                                checked as boolean,
                                                            )
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell className="font-medium border">
                                                    {order.orderName}
                                                </TableCell>
                                                <TableCell className="border">
                                                    {format(
                                                        new Date(
                                                            order.orderDate,
                                                        ),
                                                        "MMM dd, yyyy",
                                                    )}
                                                </TableCell>
                                                <TableCell className="border">
                                                    {order.imageQuantity}
                                                </TableCell>
                                                <TableCell className="border">
                                                    {formatCurrency(
                                                        order.perImagePrice,
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-medium border">
                                                    {formatCurrency(
                                                        order.totalPrice,
                                                    )}
                                                </TableCell>
                                                <TableCell className="border">
                                                    <Badge variant="outline">
                                                        {
                                                            statusLabels[
                                                                order.status
                                                            ]
                                                        }
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

            {/* PDF Preview */}
            {showPDF && selectedClient && selectedOrdersList.length > 0 && (
                <div ref={pdfSectionRef}>
                    <InvoicePDF
                        client={selectedClient as Client}
                        orders={selectedOrdersList}
                        month={
                            months.find((m) => m.value === selectedMonth)
                                ?.label || ""
                        }
                        year={selectedYear}
                        invoiceNumber={invoiceNumber}
                        paymentToken={paymentToken}
                        totals={totals}
                    />
                </div>
            )}
        </div>
    );
}
