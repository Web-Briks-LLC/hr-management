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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox";
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    ArrowLeft,
    FileText,
    Mail,
    Loader,
    Package,
    CalendarDays,
    Building2,
    CheckSquare,
    ImageIcon,
    Wallet,
    Filter,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import type { IOrder } from "@/types/order.type";
import dynamic from "next/dynamic";
import { pdf } from "@react-pdf/renderer";
import { InvoiceDocument } from "@/components/invoice/InvoicePDF";
import { toast } from "sonner";
import { InvoiceEmailDialog } from "@/components/invoice/InvoiceEmailDialog";
import { MONTH_OPTIONS, ORDER_STATUS_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth-client";

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
    const { data: session } = useSession();
    const isAdmin =
        !!session?.user?.role &&
        ["admin", "super_admin"].includes(session.user.role);

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

    // Filter orders for selected client, sorted by order date
    const orders = useMemo(() => {
        if (!selectedClientId) return [];
        return allOrders
            .filter((order: IOrder) => order.clientId?._id === selectedClientId)
            .sort(
                (a: IOrder, b: IOrder) =>
                    new Date(a.orderDate).getTime() -
                    new Date(b.orderDate).getTime(),
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

    const clientOptions = useMemo(
        () =>
            availableClients.map((c) => ({
                value: c._id,
                label: c.name,
                description: c.clientId,
            })),
        [availableClients],
    );

    const resetGeneratedInvoice = () => {
        setInvoiceNumber("");
        setPaymentToken("");
        setShowPDF(false);
    };

    const handleSelectAll = (checked: boolean) => {
        resetGeneratedInvoice();
        if (checked) {
            setSelectedOrders(new Set(orders.map((o: IOrder) => o._id)));
        } else {
            setSelectedOrders(new Set());
        }
    };

    const handleSelectOrder = (orderId: string, checked: boolean) => {
        resetGeneratedInvoice();
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
                    clientEmail: selectedClient.emails[0],
                    items: selectedOrdersList.map((order) => ({
                        name: order.orderName,
                        price: order.perImagePrice * order.imageQuantity,
                        quantity: order.imageQuantity,
                    })),
                    orderIds: Array.from(selectedOrders),
                }).unwrap();

                if (recordResult.success && recordResult.invoice) {
                    const invoiceData = recordResult.invoice as {
                        paymentToken: string;
                    };
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
        if (selectedOrders.size === 0 || !selectedClient || emails.length === 0)
            return;

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
                        clientEmail: emails[0],
                        items: selectedOrdersList.map((order) => ({
                            name: order.orderName,
                            price: order.perImagePrice * order.imageQuantity,
                            quantity: order.imageQuantity,
                        })),
                        orderIds: Array.from(selectedOrders),
                    }).unwrap();

                    const invoiceData = recordResult.invoice as {
                        paymentToken: string;
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
                    client={selectedClient}
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
            formData.append("to", emails.join(", "));
            emails.forEach((email) =>
                formData.append("selectedEmails[]", email),
            );
            formData.append("clientName", selectedClient.name);
            formData.append(
                "month",
                months.find((m) => m.value === selectedMonth)?.label || "",
            );
            formData.append("year", selectedYear);

            const result = await sendInvoiceEmail(formData).unwrap();

            if (result.success !== false) {
                toast.success(
                    result.message ||
                        `Invoice sent successfully to ${emails.length} recipient(s)`,
                );
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

    const monthLabel =
        months.find((m) => m.value === selectedMonth)?.label || "";
    const allSelected =
        orders.length > 0 && selectedOrders.size === orders.length;
    const showStats = Boolean(selectedClientId);

    return (
        <div className="space-y-8 p-1">
            {/* Header & Stats Overview */}
            <div className="flex flex-col gap-6">
                <div className="flex items-start gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        asChild
                        className="mt-1 shrink-0 shadow-xs"
                    >
                        <Link href="/orders">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text">
                            Generate Invoice
                        </h2>
                        <p className="text-muted-foreground mt-1">
                            Select a period and client, choose billable orders,
                            then preview or email the invoice.
                        </p>
                    </div>
                </div>

                {showStats && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Selected Orders */}
                        <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-violet-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/5 hover:border-violet-500/30">
                            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-violet-500/10 blur-2xl transition-all duration-300 group-hover:bg-violet-500/20" />
                            <div className="relative">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-violet-500/20">
                                        <CheckSquare className="h-5 w-5" />
                                    </div>
                                </div>
                                {isLoadingAllOrders ? (
                                    <Skeleton className="h-8 w-24" />
                                ) : (
                                    <div>
                                        <h3 className="text-3xl font-bold tracking-tight text-violet-600 dark:text-violet-400">
                                            {selectedOrders.size}
                                            <span className="text-base font-medium text-muted-foreground">
                                                {" / "}
                                                {orders.length}
                                            </span>
                                        </h3>
                                        <p className="text-xs font-medium text-muted-foreground mt-1">
                                            Orders Selected
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Total Images */}
                        <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-blue-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-500/30">
                            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-blue-500/10 blur-2xl transition-all duration-300 group-hover:bg-blue-500/20" />
                            <div className="relative">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-500/20">
                                        <ImageIcon className="h-5 w-5" />
                                    </div>
                                </div>
                                {isLoadingAllOrders ? (
                                    <Skeleton className="h-8 w-24" />
                                ) : (
                                    <div>
                                        <h3 className="text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                                            {totals.totalImages}
                                        </h3>
                                        <p className="text-xs font-medium text-muted-foreground mt-1">
                                            Total Images
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Invoice Total */}
                        <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-green-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/5 hover:border-green-500/30">
                            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-green-500/10 blur-2xl transition-all duration-300 group-hover:bg-green-500/20" />
                            <div className="relative">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-green-500/20">
                                        <Wallet className="h-5 w-5" />
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] font-medium bg-green-500/5 text-green-600 dark:text-green-400 border-green-500/20"
                                    >
                                        {selectedClient?.currency || "USD"}
                                    </Badge>
                                </div>
                                {isLoadingAllOrders ? (
                                    <Skeleton className="h-8 w-28" />
                                ) : (
                                    <div>
                                        <h3 className="text-3xl font-bold tracking-tight text-green-600 dark:text-green-400">
                                            {formatCurrency(totals.totalAmount)}
                                        </h3>
                                        <p className="text-xs font-medium text-muted-foreground mt-1">
                                            Invoice Total
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Period */}
                        <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-amber-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/5 hover:border-amber-500/30">
                            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-amber-500/10 blur-2xl transition-all duration-300 group-hover:bg-amber-500/20" />
                            <div className="relative">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-amber-500/20">
                                        <CalendarDays className="h-5 w-5" />
                                    </div>
                                </div>
                                {isLoadingAllOrders ? (
                                    <Skeleton className="h-8 w-28" />
                                ) : (
                                    <div>
                                        <h3 className="text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400 truncate">
                                            {monthLabel} {selectedYear}
                                        </h3>
                                        <p className="text-xs font-medium text-muted-foreground mt-1 truncate">
                                            {selectedClient?.name} ·{" "}
                                            {selectedClient?.clientId}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Selection Toolbar */}
            <div className="flex flex-col gap-4 p-4 bg-muted/30 rounded-lg border border-border/50 xl:flex-row xl:items-end">
                <div className="flex items-center gap-2 xl:mb-2 xl:self-center">
                    <div className="bg-primary/10 p-2 rounded-full">
                        <Filter className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium">Filters:</span>
                </div>

                <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CalendarDays className="h-3.5 w-3.5" />
                            Year
                        </Label>
                        {isLoadingYears ? (
                            <Skeleton className="h-9 w-full" />
                        ) : (
                            <Select
                                value={selectedYear}
                                onValueChange={(val) => {
                                    setSelectedYear(val);
                                    setSelectedClientId("");
                                    setSelectedOrders(new Set());
                                    resetGeneratedInvoice();
                                }}
                            >
                                <SelectTrigger className="h-9 bg-background/60">
                                    <SelectValue placeholder="Select year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map((y) => (
                                        <SelectItem key={y} value={y}>
                                            {y}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CalendarDays className="h-3.5 w-3.5" />
                            Month
                        </Label>
                        <Select
                            value={selectedMonth}
                            onValueChange={(val) => {
                                setSelectedMonth(val);
                                setSelectedClientId("");
                                setSelectedOrders(new Set());
                                resetGeneratedInvoice();
                            }}
                        >
                            <SelectTrigger className="h-9 bg-background/60">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {months.map((m) => (
                                    <SelectItem key={m.value} value={m.value}>
                                        {m.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Building2 className="h-3.5 w-3.5" />
                            Client
                        </Label>
                        <Combobox
                            value={selectedClientId || null}
                            onValueChange={(val) => {
                                setSelectedClientId((val as string) ?? "");
                                setSelectedOrders(new Set());
                                resetGeneratedInvoice();
                            }}
                            items={clientOptions}
                            itemToStringLabel={(value) =>
                                clientOptions.find((o) => o.value === value)
                                    ?.[isAdmin ? "label" : "description"] ?? ""
                            }
                        >
                            <ComboboxInput placeholder="Select a client" />
                            <ComboboxContent>
                                <ComboboxEmpty>No clients found.</ComboboxEmpty>
                                <ComboboxList>
                                    {(item) => (
                                        <ComboboxItem
                                            key={item.value}
                                            value={item.value}
                                        >
                                            {isAdmin
                                                ? item.label
                                                : item.description}
                                        </ComboboxItem>
                                    )}
                                </ComboboxList>
                            </ComboboxContent>
                        </Combobox>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleOpenEmailDialog}
                        disabled={selectedOrders.size === 0 || isSending}
                        className="flex-1 border-primary text-primary hover:bg-accent hover:text-accent-foreground shadow-xs xl:flex-none"
                    >
                        {isSending ? (
                            <Loader className="h-4 w-4 animate-spin" />
                        ) : (
                            <Mail className="h-4 w-4" />
                        )}
                        Send
                    </Button>
                    <Button
                        onClick={handleGenerateInvoice}
                        disabled={
                            selectedOrders.size === 0 ||
                            isGeneratingInvoice ||
                            isRecording
                        }
                        className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs xl:flex-none"
                    >
                        {isGeneratingInvoice || isRecording ? (
                            <Loader className="h-4 w-4 animate-spin" />
                        ) : (
                            <FileText className="h-4 w-4" />
                        )}
                        Preview
                    </Button>
                </div>
            </div>

            {/* Orders */}
            <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="flex items-center gap-2 text-lg font-semibold">
                            <Package className="h-5 w-5 text-primary" />
                            {selectedClient
                                ? `Orders for ${selectedClient.name}`
                                : "Orders"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {monthLabel} {selectedYear}
                            {selectedClientId
                                ? ` · ${orders.length} available`
                                : ""}
                        </p>
                    </div>
                    {selectedOrders.size > 0 && (
                        <Badge
                            variant="secondary"
                            className="h-7 gap-1.5 px-3 text-sm font-semibold"
                        >
                            {selectedOrders.size} selected
                            <span className="text-primary">
                                {formatCurrency(totals.totalAmount)}
                            </span>
                        </Badge>
                    )}
                </div>

                <div className="rounded-md border border-border/60 overflow-hidden bg-background">
                    <Table>
                        <TableHeader className="bg-muted/40">
                            <TableRow className="hover:bg-muted/40 border-b-border/60">
                                <TableHead className="w-12">
                                    <Checkbox
                                        checked={allSelected}
                                        disabled={
                                            !selectedClientId ||
                                            orders.length === 0
                                        }
                                        onCheckedChange={(val) =>
                                            handleSelectAll(!!val)
                                        }
                                        aria-label="Select all orders"
                                    />
                                </TableHead>
                                <TableHead className="font-semibold">
                                    Order Name
                                </TableHead>
                                <TableHead className="font-semibold">
                                    Date
                                </TableHead>
                                <TableHead className="font-semibold text-center">
                                    Images
                                </TableHead>
                                <TableHead className="font-semibold text-right">
                                    Price
                                </TableHead>
                                <TableHead className="font-semibold text-center">
                                    Status
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!selectedClientId ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="h-48 text-center"
                                    >
                                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                            <div className="bg-muted/50 p-3 rounded-full">
                                                <Building2 className="h-6 w-6 opacity-30" />
                                            </div>
                                            <p className="text-lg font-medium">
                                                Select a client
                                            </p>
                                            <p className="text-sm">
                                                Choose a period and client above
                                                to view billable orders.
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : isLoadingAllOrders ? (
                                [...Array(5)].map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell>
                                            <Skeleton className="h-4 w-4 rounded" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-40" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-24" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-10 mx-auto" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-16 ml-auto" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-6 w-20 mx-auto rounded-full" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : orders.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="h-48 text-center"
                                    >
                                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                            <div className="bg-muted/50 p-3 rounded-full">
                                                <Package className="h-6 w-6 opacity-30" />
                                            </div>
                                            <p className="text-lg font-medium">
                                                No orders found
                                            </p>
                                            <p className="text-sm">
                                                This client has no billable
                                                orders in {monthLabel}{" "}
                                                {selectedYear}.
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                orders.map((order) => (
                                    <TableRow
                                        key={order._id}
                                        onClick={() =>
                                            handleSelectOrder(
                                                order._id,
                                                !selectedOrders.has(order._id),
                                            )
                                        }
                                        className={cn(
                                            "cursor-pointer transition-colors hover:bg-muted/20",
                                            selectedOrders.has(order._id) &&
                                                "bg-muted/50",
                                        )}
                                    >
                                        <TableCell
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Checkbox
                                                checked={selectedOrders.has(
                                                    order._id,
                                                )}
                                                onCheckedChange={(val) =>
                                                    handleSelectOrder(
                                                        order._id,
                                                        !!val,
                                                    )
                                                }
                                                aria-label={`Select ${order.orderName}`}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <span className="font-medium text-foreground">
                                                    {order.orderName}
                                                </span>
                                                {(order.isPaid ||
                                                    order.invoiceNumber) && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {order.isPaid && (
                                                            <Badge
                                                                variant="outline"
                                                                className="text-[9px] font-medium bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                                                            >
                                                                PAID
                                                            </Badge>
                                                        )}
                                                        {order.invoiceNumber && (
                                                            <Badge
                                                                variant="outline"
                                                                className="text-[9px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                                            >
                                                                INV #
                                                                {
                                                                    order.invoiceNumber
                                                                }
                                                            </Badge>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {format(
                                                new Date(order.orderDate),
                                                "MMM dd, yyyy",
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center font-bold">
                                            {order.imageQuantity}
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">
                                            {formatCurrency(order.totalPrice)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-[10px] font-medium capitalize",
                                                    ORDER_STATUS_COLORS[
                                                        order.status
                                                    ],
                                                )}
                                            >
                                                {order.status.replace(
                                                    /_/g,
                                                    " ",
                                                )}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                        {selectedOrders.size > 0 && (
                            <TableFooter className="bg-muted/40">
                                <TableRow className="hover:bg-muted/40">
                                    <TableCell />
                                    <TableCell className="font-semibold">
                                        {selectedOrders.size} order
                                        {selectedOrders.size !== 1
                                            ? "s"
                                            : ""}{" "}
                                        selected
                                    </TableCell>
                                    <TableCell />
                                    <TableCell className="text-center font-bold">
                                        {totals.totalImages}
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-primary">
                                        {formatCurrency(totals.totalAmount)}
                                    </TableCell>
                                    <TableCell />
                                </TableRow>
                            </TableFooter>
                        )}
                    </Table>
                </div>
            </div>

            <InvoiceEmailDialog
                isOpen={isEmailDialogOpen}
                onClose={() => setIsEmailDialogOpen(false)}
                clientId={selectedClientId}
                onSend={performEmailSend}
                isSending={isSending}
                defaultEmails={initialRecipients}
            />

            {showPDF && (
                <div ref={pdfSectionRef} className="space-y-4 border-t pt-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="flex items-center gap-2 text-lg font-semibold">
                                <FileText className="h-5 w-5 text-primary" />
                                Invoice Preview
                            </h3>
                            {invoiceNumber && (
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    Invoice #{invoiceNumber}
                                </p>
                            )}
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => setShowPDF(false)}
                        >
                            Close Preview
                        </Button>
                    </div>
                    <div className="rounded-md border border-border/60 bg-muted/20 p-3 sm:p-4">
                        {selectedClient && (
                            <InvoicePDF
                                client={selectedClient}
                                orders={selectedOrdersList}
                                invoiceNumber={invoiceNumber}
                                paymentToken={paymentToken}
                                totals={totals}
                                month={monthLabel}
                                year={selectedYear}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
