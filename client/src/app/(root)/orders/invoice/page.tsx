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
import type { IOrder } from "@/types/order.type";
import dynamic from "next/dynamic";
import { pdf } from "@react-pdf/renderer";
import { InvoiceDocument } from "@/components/invoice/InvoicePDF";
import { toast } from "sonner";
import { InvoiceEmailDialog } from "@/components/invoice/InvoiceEmailDialog";
import { MONTH_OPTIONS } from "@/lib/constants";

// Dynamically import the PDF component to avoid SSR issues
const InvoicePDF = dynamic(() => import("@/components/invoice/InvoicePDF"), {
    ssr: false,
    loading: () => <span>Loading PDF generator...</span>,
});

const months = MONTH_OPTIONS;

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
    const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
    const [initialRecipients, setInitialRecipients] = useState<string[]>([]);

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

    // Fetch all orders for selected year/month
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

    const allOrders = useMemo(() => {
        const rawOrders = allOrdersData?.data || [];
        return rawOrders.filter(
            (order: IOrder) => order.status !== "cancelled",
        );
    }, [allOrdersData]);

    // Extract unique clients
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
                emails: string[];
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
                    emails: order.clientId.emails,
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

    const selectedClient = useMemo(() => {
        return availableClients.find((c) => c._id === selectedClientId);
    }, [availableClients, selectedClientId]);

    const selectedOrdersList = useMemo(() => {
        return orders.filter((order: IOrder) => selectedOrders.has(order._id));
    }, [orders, selectedOrders]);

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

                const orderDates = selectedOrdersList.map((o) =>
                    new Date(o.orderDate).getTime(),
                );
                const minDate = new Date(Math.min(...orderDates)).toISOString();
                const maxDate = new Date(Math.max(...orderDates)).toISOString();

                const recordResult = await recordInvoice({
                    invoiceNumber: generatedNumber,
                    clientName: selectedClient.name,
                    clientId: selectedClient.clientId,
                    clientAddress: selectedClient.address || selectedClient.officeAddress || "N/A",
                    companyName: selectedClient.officeAddress || "N/A",
                    totalAmount: totals.totalAmount,
                    currency: selectedClient.currency || "USD",
                    dueDate: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    month: Number(selectedMonth),
                    year: Number(selectedYear),
                    totalImages: totals.totalImages,
                    dateFrom: minDate,
                    dateTo: maxDate,
                    totalOrders: selectedOrdersList.length,
                    clientEmail: selectedClient.emails[0],
                    items: selectedOrdersList.map((order) => ({
                        name: order.orderName,
                        price: order.perImagePrice * order.imageQuantity,
                        quantity: order.imageQuantity,
                    })),
                    orderIds: Array.from(selectedOrders),
                }).unwrap();

                if (recordResult.success && recordResult.invoice) {
                    const invoiceData = recordResult.invoice as { paymentToken: string };
                    setInvoiceNumber(generatedNumber);
                    setPaymentToken(invoiceData.paymentToken);
                    setShowPDF(true);

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

    const performEmailSend = async (emails: string[]) => {
        if (selectedOrders.size === 0 || !selectedClient || emails.length === 0) return;

        try {
            let currentInvoiceNumber = invoiceNumber;
            let currentToken = paymentToken;

            if (!currentInvoiceNumber || !currentToken) {
                const result = await getNextInvoiceNumber().unwrap();
                if (result.success) {
                    currentInvoiceNumber = result.formattedInvoiceNumber;

                    const orderDates = selectedOrdersList.map((o) => new Date(o.orderDate).getTime());
                    const minDate = new Date(Math.min(...orderDates)).toISOString();
                    const maxDate = new Date(Math.max(...orderDates)).toISOString();

                    const recordResult = await recordInvoice({
                        invoiceNumber: currentInvoiceNumber,
                        clientName: selectedClient.name,
                        clientId: selectedClient.clientId,
                        clientAddress: selectedClient.address || selectedClient.officeAddress || "N/A",
                        companyName: selectedClient.officeAddress || "N/A",
                        totalAmount: totals.totalAmount,
                        currency: selectedClient.currency || "USD",
                        dueDate: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                        month: Number(selectedMonth),
                        year: Number(selectedYear),
                        totalImages: totals.totalImages,
                        dateFrom: minDate,
                        dateTo: maxDate,
                        totalOrders: selectedOrdersList.length,
                        clientEmail: emails[0],
                        items: selectedOrdersList.map((order) => ({
                            name: order.orderName,
                            price: order.perImagePrice * order.imageQuantity,
                            quantity: order.imageQuantity,
                        })),
                    }).unwrap();

                    const invoiceData = recordResult.invoice as { paymentToken: string };
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
                    client={selectedClient}
                    orders={selectedOrdersList}
                    month={months.find((m) => m.value === selectedMonth)?.label || ""}
                    year={selectedYear}
                    invoiceNumber={currentInvoiceNumber}
                    paymentToken={currentToken}
                    totals={totals}
                />,
            ).toBlob();

            const formData = new FormData();
            formData.append("file", blob, fileName);
            formData.append("to", emails.join(', '));
            emails.forEach(email => formData.append("selectedEmails[]", email));
            formData.append("clientName", selectedClient.name);
            formData.append("month", months.find((m) => m.value === selectedMonth)?.label || "");
            formData.append("year", selectedYear);

            const result = await sendInvoiceEmail(formData).unwrap();

            if (result.success !== false) {
                toast.success(result.message || `Invoice sent successfully to ${emails.length} recipient(s)`);
                setIsEmailDialogOpen(false);
            } else {
                throw new Error(result.message || "Failed to send email");
            }
        } catch (error) {
            console.error("Error sending email:", error);
            toast.error((error as Error).message || "Failed to send email");
        }
    };

    const handleOpenEmailDialog = () => {
        if (!selectedClient) return;
        if (!selectedClient.emails || selectedClient.emails.length === 0) {
            toast.error("Client email is missing.");
            return;
        }
        setInitialRecipients([selectedClient.emails[0]]);
        setIsEmailDialogOpen(true);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: selectedClient?.currency || "USD",
        }).format(amount);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/orders">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold font-heading">Generate Invoice</h1>
                    <p className="text-muted-foreground">
                        Select year, month, and client to generate an invoice
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Select Orders</CardTitle>
                    <CardDescription>Choose period and client to view available orders</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Year</label>
                            {isLoadingYears ? <Skeleton className="h-10 w-full" /> : (
                                <Select value={selectedYear} onValueChange={(val) => { setSelectedYear(val); setSelectedClientId(""); setSelectedOrders(new Set()); setShowPDF(false); }}>
                                    <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                                    <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                                </Select>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Month</label>
                            <Select value={selectedMonth} onValueChange={(val) => { setSelectedMonth(val); setSelectedClientId(""); setSelectedOrders(new Set()); setShowPDF(false); }}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Client</label>
                            {isLoadingAllOrders ? <Skeleton className="h-10 w-full" /> : (
                                <Select value={selectedClientId} onValueChange={(val) => { setSelectedClientId(val); setSelectedOrders(new Set()); setShowPDF(false); }}>
                                    <SelectTrigger><SelectValue placeholder={availableClients.length === 0 ? "No clients found" : "Select a client"} /></SelectTrigger>
                                    <SelectContent>{availableClients.map(c => <SelectItem key={c._id} value={c._id}>{c.name} ({c.clientId})</SelectItem>)}</SelectContent>
                                </Select>
                            )}
                        </div>

                        <div className="flex items-end gap-2">
                            <Button onClick={handleOpenEmailDialog} disabled={selectedOrders.size === 0 || isSending} className="flex-1 bg-orange-500 hover:bg-orange-600">
                                {isSending ? <Loader className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                                Send
                            </Button>
                            <Button onClick={handleGenerateInvoice} disabled={selectedOrders.size === 0 || isGeneratingInvoice || isRecording} className="flex-1 bg-teal-500 hover:bg-teal-600">
                                {isGeneratingInvoice ? <Loader className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                                Preview
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {selectedClientId && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Orders for {selectedClient?.name}</CardTitle>
                            <CardDescription>{months.find(m => m.value === selectedMonth)?.label} {selectedYear}</CardDescription>
                        </div>
                        {selectedOrders.size > 0 && (
                            <div className="text-right">
                                <p className="text-sm text-muted-foreground">{selectedOrders.size} orders selected</p>
                                <p className="text-lg font-bold text-primary">{formatCurrency(totals.totalAmount)}</p>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-md">
                            {orders.length === 0 ? <div className="p-8 text-center text-muted-foreground">No orders found</div> : (
                                <Table>
                                    <TableHeader><TableRow>
                                        <TableHead className="w-12"><Checkbox checked={orders.length > 0 && selectedOrders.size === orders.length} onCheckedChange={handleSelectAll} /></TableHead>
                                        <TableHead>Order Name</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="text-center">Images</TableHead>
                                        <TableHead className="text-right">Price</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                    </TableRow></TableHeader>
                                    <TableBody>{orders.map(order => (
                                        <TableRow key={order._id} className={selectedOrders.has(order._id) ? "bg-muted/50" : ""}>
                                            <TableCell><Checkbox checked={selectedOrders.has(order._id)} onCheckedChange={(val) => handleSelectOrder(order._id, !!val)} /></TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{order.orderName}</span>
                                                    <div className="flex gap-1 mt-1">
                                                        {order.isPaid && <Badge className="text-[9px] bg-green-100 text-green-700">PAID</Badge>}
                                                        {order.invoiceNumber && <Badge className="text-[9px] bg-blue-100 text-blue-700">INV #{order.invoiceNumber}</Badge>}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs">{format(new Date(order.orderDate), "MMM dd, yyyy")}</TableCell>
                                            <TableCell className="text-center font-bold">{order.imageQuantity}</TableCell>
                                            <TableCell className="text-right font-semibold">{formatCurrency(order.totalPrice)}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className="capitalize text-[10px]">{order.status.replace('_', ' ')}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}</TableBody>
                                </Table>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            <InvoiceEmailDialog
                isOpen={isEmailDialogOpen}
                onClose={() => setIsEmailDialogOpen(false)}
                clientId={selectedClientId}
                onSend={performEmailSend}
                isSending={isSending}
                defaultEmails={initialRecipients}
            />

            {showPDF && (
                <div ref={pdfSectionRef} className="pt-8 border-t space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold font-heading">Invoice Preview</h2>
                        <Button variant="outline" onClick={() => setShowPDF(false)}>Close Preview</Button>
                    </div>
                    <Card><CardContent className="p-0 bg-muted/20 min-h-[600px] flex items-center justify-center">
                        {selectedClient && (
                            <InvoicePDF
                                client={selectedClient}
                                orders={selectedOrdersList}
                                invoiceNumber={invoiceNumber}
                                paymentToken={paymentToken}
                                totals={totals}
                                month={
                                    months.find((m) => m.value === selectedMonth)
                                        ?.label || ""
                                }
                                year={selectedYear}
                            />
                        )}
                    </CardContent></Card>
                </div>
            )}
        </div>
    );
}
