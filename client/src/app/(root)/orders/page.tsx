"use client";

import { useState, useMemo } from "react";
import {
    useGetOrdersQuery,
    useCreateOrderMutation,
    useUpdateOrderMutation,
    useDeleteOrderMutation,
    useGetOrderStatsQuery,
    useUpdateOrderStatusMutation,
    useExtendDeadlineMutation,
    useAddRevisionMutation,
    useLazyGetOrdersQuery,
    useGetOrderYearsQuery,
} from "@/redux/features/order/orderApi";
import { useGetAllClientsQuery } from "@/redux/features/client/clientApi";
import type {
    IOrder,
    OrderStatus,
    OrderPriority,
    OrderFilters,
    UpdateStatusInput,
} from "@/types/order.type";
import { ORDER_STATUS_LABELS, ORDER_PRIORITY_LABELS, PER_PAGE_OPTIONS } from "@/lib/constants";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Loader,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Plus,
    Trash2,
    Edit2,
    Package,
    Clock,
    CheckCircle,
    AlertCircle,
    Eye,
    Calendar,
    RotateCcw,
    AlertTriangle,
    FileText,
    History,
    Search,
    Filter,
    X,
    CheckSquare,
} from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { OrderForm, type OrderFormData } from "@/components/order/OrderForm";
import { DeadlineCountdown } from "@/components/order/DeadlineCountdown";
import { OrderTimeline } from "@/components/order/OrderTimeline";
import { EmailDialog } from "./EmailDialog";
import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { DateTimePicker } from "@/components/shared/DateTimePicker";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/lib/auth-client";
import { useGetMeQuery } from "@/redux/features/staff/staffApi";
import { Role } from "@/constants/role";

const statusColors: Record<OrderStatus, string> = {
    pending: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
    in_progress: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
    quality_check: "bg-purple-500/20 text-purple-700 dark:text-purple-400",
    revision: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
    completed: "bg-green-500/20 text-green-700 dark:text-green-400",
    delivered: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
    cancelled: "bg-red-500/20 text-red-700 dark:text-red-400",
};

const priorityColors: Record<OrderPriority, string> = {
    low: "bg-muted text-muted-foreground",
    normal: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
    high: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
    urgent: "bg-red-500/20 text-red-700 dark:text-red-400",
};

// Status workflow: defines which statuses can transition to which
// Key = current status, Value = array of allowed next statuses
const statusWorkflow: Record<OrderStatus, OrderStatus[]> = {
    pending: ["in_progress", "cancelled"],
    in_progress: ["quality_check", "revision", "cancelled"],
    quality_check: ["completed", "revision", "in_progress"],
    revision: ["in_progress", "cancelled"],
    completed: ["delivered", "revision"],
    delivered: [], // Final state - no transitions allowed
    cancelled: [], // Final state - no transitions allowed
};

// Helper function to check if a status transition is allowed
const canTransitionTo = (
    currentStatus: OrderStatus,
    targetStatus: OrderStatus,
): boolean => {
    if (currentStatus === targetStatus) return false; // Can't transition to same status
    return statusWorkflow[currentStatus]?.includes(targetStatus) || false;
};

interface ApiErrorResponse {
    data?: {
        message?: string;
        errors?: Record<string, string[]>;
    };
}

export default function OrdersPage() {
    const { data: session } = useSession();
    const { data: meData } = useGetMeQuery({});
    const isTelemarketer = useMemo(() => {
        return (
            (session?.user?.role === Role.STAFF ||
                session?.user?.role === Role.TEAM_LEADER) &&
            meData?.staff?.designation?.toLowerCase() === "telemarketer"
        );
    }, [session, meData]);
    const isAdmin = useMemo(() => {
        return (
            session?.user?.role === Role.SUPER_ADMIN ||
            session?.user?.role === Role.ADMIN ||
            session?.user?.role === Role.HR_MANAGER
        );
    }, [session]);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState<OrderFilters>({
        search: "",
        status: undefined,
        priority: undefined,
        clientId: undefined,
        limit: 10,
    });
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [isExtendDialogOpen, setIsExtendDialogOpen] = useState(false);
    const [isRevisionDialogOpen, setIsRevisionDialogOpen] = useState(false);
    const [isTimelineDialogOpen, setIsTimelineDialogOpen] = useState(false);
    const [isStatusChangeDialogOpen, setIsStatusChangeDialogOpen] =
        useState(false);
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [pendingStatusChange, setPendingStatusChange] = useState<{
        orderId: string;
        status: OrderStatus;
    } | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<IOrder | null>(null);
    const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(
        new Set(),
    );

    const [serverErrors, setServerErrors] = useState<
        Record<string, string[]> | undefined
    >(undefined);
    const [editDefaultValues, setEditDefaultValues] = useState<
        OrderFormData | undefined
    >(undefined);

    // Extend deadline state
    const [newDeadline, setNewDeadline] = useState<Date | undefined>(undefined);
    const [extendReason, setExtendReason] = useState("");

    // Revision state
    const [revisionInstruction, setRevisionInstruction] = useState("");
    const [statusChangeNote, setStatusChangeNote] = useState("");

    // Email dialog state
    const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
    const [emailPendingOrder, setEmailPendingOrder] = useState<IOrder | null>(
        null,
    );
    const [emailPendingStatus, setEmailPendingStatus] =
        useState<OrderStatus | null>(null);
    const [isEmailSending, setIsEmailSending] = useState(false);

    const confirmEmailAndStatusChange = async (
        message: string,
        downloadLink?: string,
        selectedEmails?: string[],
        sendEmail: boolean = true,
    ) => {
        if (!emailPendingOrder || !emailPendingStatus) return;
        setIsEmailSending(true);
        try {
            await updateOrderStatus({
                id: emailPendingOrder._id,
                data: {
                    status: emailPendingStatus,
                    customEmailMessage: message,
                    downloadLink,
                    sendEmail,
                    selectedEmails,
                } as UpdateStatusInput,
            }).unwrap();
            toast.success(
                sendEmail
                    ? `Status updated to ${ORDER_STATUS_LABELS[emailPendingStatus]} and email sent!`
                    : `Status updated to ${ORDER_STATUS_LABELS[emailPendingStatus]}!`,
            );
            setIsEmailDialogOpen(false);
            setEmailPendingOrder(null);
            setEmailPendingStatus(null);
        } catch (error: unknown) {
            const err = error as ApiErrorResponse;
            toast.error(
                err?.data?.message || "Failed to update status",
            );
        } finally {
            setIsEmailSending(false);
        }
    };

    // Date filter state
    const [selectedMonth, setSelectedMonth] = useState<string>("");
    const [selectedYear, setSelectedYear] = useState<string>("");
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

    // Queries
    const { data: yearsData } = useGetOrderYearsQuery();
    const sortedYears = useMemo(() => {
        if (!yearsData?.data) {
            const currentYear = new Date().getFullYear();
            return Array.from(
                { length: currentYear - 2020 + 2 },
                (_, i) => 2020 + i,
            );
        }
        return [...yearsData.data].sort((a, b) => b - a);
    }, [yearsData]);

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

    // Queries
    const {
        data: orderData,
        isLoading,
        isFetching,
    } = useGetOrdersQuery({
        ...filters,
        page,
        month: selectedMonth ? parseInt(selectedMonth) : undefined,
        year: selectedYear ? parseInt(selectedYear) : undefined,
    });
    const { data: statsData } = useGetOrderStatsQuery();
    const { data: clientsData } = useGetAllClientsQuery();

    // Mutations
    const [createOrder, { isLoading: isCreating }] = useCreateOrderMutation();
    const [updateOrder, { isLoading: isUpdating }] = useUpdateOrderMutation();
    const [deleteOrder, { isLoading: isDeleting }] = useDeleteOrderMutation();
    const [updateOrderStatus, { isLoading: isUpdatingStatus }] =
        useUpdateOrderStatusMutation();
    const [extendDeadline, { isLoading: isExtending }] =
        useExtendDeadlineMutation();
    const [addRevision, { isLoading: isAddingRevision }] =
        useAddRevisionMutation();
    const [triggerGetAll, { isLoading: isLoadingAll }] =
        useLazyGetOrdersQuery();

    const orders = useMemo(() => orderData?.data || [], [orderData]);
    const meta = orderData?.meta;
    const stats = statsData?.data;
    const clients = useMemo(() => clientsData || [], [clientsData]);

    // Check if all current page orders are selected
    const allOrdersSelected = useMemo(() => {
        return (
            orders.length > 0 &&
            orders.every((order) => selectedOrderIds.has(order._id))
        );
    }, [orders, selectedOrderIds]);

    // Toggle single order selection
    const toggleOrderSelection = (orderId: string) => {
        setSelectedOrderIds((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(orderId)) {
                newSet.delete(orderId);
            } else {
                newSet.add(orderId);
            }
            return newSet;
        });
    };

    // Toggle all orders on current page
    const toggleAllOrders = (checked: boolean) => {
        setSelectedOrderIds((prev) => {
            const newSet = new Set(prev);
            if (checked) {
                orders.forEach((order) => newSet.add(order._id));
            } else {
                // If unchecking "Select All Page", we should probably clear specific page IDs
                // But if "All Total" was selected, user expects to clear just this page?
                // Standard behavior: Uncheck header = Uncheck all visible.
                orders.forEach((order) => newSet.delete(order._id));
            }
            return newSet;
        });
    };

    const handleSelectAllMatches = async () => {
        if (!meta) return;
        try {
            const result = await triggerGetAll({
                ...filters,
                limit: meta.total,
                month: selectedMonth ? parseInt(selectedMonth) : undefined,
                year: selectedYear ? parseInt(selectedYear) : undefined,
            }).unwrap();

            if (result.data) {
                const allIds = result.data.map((o) => o._id);
                setSelectedOrderIds(new Set(allIds));
                toast.success(`All ${allIds.length} orders selected`);
            }
        } catch (error) {
            console.error("Failed to select all", error);
            toast.error("Failed to select all orders");
        }
    };

    // Clear selection and exit selection mode
    const clearSelection = () => {
        setSelectedOrderIds(new Set());
        setIsSelectionMode(false);
    };

    const handleFilterChange = (
        key: keyof OrderFilters,
        value: string | number | undefined,
    ) => {
        setFilters((prev) => ({ ...prev, [key]: value || undefined }));
        setPage(1);
    };

    const handleCreateOrder = async (data: OrderFormData) => {
        setServerErrors(undefined);
        try {
            await createOrder(data).unwrap();
            toast.success("Order created successfully");
            setIsAddDialogOpen(false);
        } catch (error: unknown) {
            const err = error as ApiErrorResponse;
            if (err?.data?.errors) {
                setServerErrors(err.data.errors);
            } else {
                toast.error(err?.data?.message || "Failed to create order");
            }
        }
    };

    const handleUpdateOrder = async (data: OrderFormData) => {
        if (!selectedOrder) return;
        setServerErrors(undefined);
        try {
            await updateOrder({
                id: selectedOrder._id,
                data,
            }).unwrap();
            toast.success("Order updated successfully");
            setIsEditDialogOpen(false);
            setSelectedOrder(null);
        } catch (error: unknown) {
            const err = error as ApiErrorResponse;
            if (err?.data?.errors) {
                setServerErrors(err.data.errors);
            } else {
                toast.error(err?.data?.message || "Failed to update order");
            }
        }
    };

    const handleDeleteOrder = async () => {
        if (!selectedOrder) return;
        try {
            await deleteOrder(selectedOrder._id).unwrap();
            toast.success("Order deleted successfully");
            setIsDeleteDialogOpen(false);
            setSelectedOrder(null);
        } catch (error: unknown) {
            const err = error as ApiErrorResponse;
            toast.error(err?.data?.message || "Failed to delete order");
        }
    };

    const handleBulkDeleteOrders = async () => {
        if (selectedOrderIds.size === 0) return;
        setIsBulkDeleting(true);
        const orderIdsArray = Array.from(selectedOrderIds);

        try {
            const results = await Promise.allSettled(
                orderIdsArray.map((id) => deleteOrder(id).unwrap()),
            );

            const successCount = results.filter(
                (r) => r.status === "fulfilled",
            ).length;
            const errorCount = results.filter(
                (r) => r.status === "rejected",
            ).length;

            if (successCount > 0) {
                toast.success(`${successCount} order(s) deleted successfully`);
            }
            if (errorCount > 0) {
                toast.error(`Failed to delete ${errorCount} order(s)`);
            }
        } catch (error) {
            console.error("Bulk delete error:", error);
            toast.error("An unexpected error occurred during bulk deletion");
        } finally {
            setIsBulkDeleting(false);
            setIsBulkDeleteDialogOpen(false);
            clearSelection();
        }
    };

    const handleStatusChange = async (
        orderId: string,
        newStatus: OrderStatus,
    ) => {
        // Guard against empty/undefined values
        if (!newStatus) {
            console.log("handleStatusChange - empty status, skipping");
            return;
        }

        // If changing to revision, ask for optional instruction
        if (newStatus === "revision") {
            setPendingStatusChange({ orderId, status: newStatus });
            setStatusChangeNote("");
            setIsStatusChangeDialogOpen(true);
            return;
        }

        // Feature: send emails on specific status changes
        if (["cancelled", "completed", "delivered"].includes(newStatus)) {
            const orderObj = orderData?.data.find((o) => o._id === orderId);
            if (orderObj) {
                setEmailPendingStatus(newStatus);
                setEmailPendingOrder(orderObj);
                setIsEmailDialogOpen(true);
                return;
            }
        }

        try {
            await updateOrderStatus({
                id: orderId,
                data: { status: newStatus },
            }).unwrap();
            toast.success(
                `Status updated to ${ORDER_STATUS_LABELS[newStatus]}`,
            );
        } catch (error: unknown) {
            const err = error as ApiErrorResponse;
            toast.error(err?.data?.message || "Failed to update status");
        }
    };

    const confirmStatusChange = async () => {
        if (!pendingStatusChange) return;
        try {
            await updateOrderStatus({
                id: pendingStatusChange.orderId,
                data: {
                    status: pendingStatusChange.status,
                    note: statusChangeNote || undefined,
                },
            }).unwrap();
            toast.success(
                `Status updated to ${ORDER_STATUS_LABELS[pendingStatusChange.status]
                }`,
            );
            setIsStatusChangeDialogOpen(false);
            setPendingStatusChange(null);
            setStatusChangeNote("");
        } catch (error: unknown) {
            const err = error as ApiErrorResponse;
            toast.error(err?.data?.message || "Failed to update status");
        }
    };

    const handleExtendDeadline = async () => {
        if (!selectedOrder || !newDeadline) return;
        try {
            await extendDeadline({
                id: selectedOrder._id,
                data: {
                    newDeadline: newDeadline.toISOString(),
                    reason: extendReason,
                },
            }).unwrap();
            toast.success("Deadline extended successfully");
            setIsExtendDialogOpen(false);
            setNewDeadline(undefined);
            setExtendReason("");
            setSelectedOrder(null);
        } catch (error: unknown) {
            const err = error as ApiErrorResponse;
            toast.error(err?.data?.message || "Failed to extend deadline");
        }
    };

    const handleAddRevision = async () => {
        if (!selectedOrder || !revisionInstruction.trim()) return;
        try {
            await addRevision({
                id: selectedOrder._id,
                data: { instruction: revisionInstruction },
            }).unwrap();
            toast.success("Revision added successfully");
            setIsRevisionDialogOpen(false);
            setRevisionInstruction("");
            setSelectedOrder(null);
        } catch (error: unknown) {
            const err = error as ApiErrorResponse;
            toast.error(err?.data?.message || "Failed to add revision");
        }
    };

    const openEditDialog = (order: IOrder) => {
        setSelectedOrder(order);
        setServerErrors(undefined);
        setEditDefaultValues({
            orderName: order.orderName,
            clientId: order.clientId._id,
            orderDate: order.orderDate.split("T")[0],
            deadline: order.deadline,
            imageQuantity: order.imageQuantity,
            perImagePrice: order.perImagePrice,
            totalPrice: order.totalPrice,
            services: order.services.map((s) => s._id),
            returnFileFormat: order.returnFileFormat._id,
            instruction: order.instruction || "",
            priority: order.priority,
            notes: order.notes || "",
            contactPersonId: order.contactPersonId || "",
        });
        setIsEditDialogOpen(true);
    };

    const openViewDialog = (order: IOrder) => {
        setSelectedOrder(order);
        setIsViewDialogOpen(true);
    };

    const openExtendDialog = (order: IOrder) => {
        setSelectedOrder(order);
        setNewDeadline(new Date(order.deadline));
        setIsExtendDialogOpen(true);
    };

    const openRevisionDialog = (order: IOrder) => {
        setSelectedOrder(order);
        setIsRevisionDialogOpen(true);
    };

    const openTimelineDialog = (order: IOrder) => {
        setSelectedOrder(order);
        setIsTimelineDialogOpen(true);
    };

    return (
        <div className="space-y-8 p-1">
            {/* Header & Stats Overview (Matching Earnings Layout) */}
            <div className="flex flex-col gap-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text">
                        Orders Overview
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Manage graphic design orders and track their status.
                    </p>
                </div>

                {/* Stats Cards - Row 1 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Total Orders Card */}
                    <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-slate-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-slate-500/5 hover:border-slate-500/30">
                        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-slate-500/10 blur-2xl transition-all duration-300 group-hover:bg-slate-500/20" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/10 text-slate-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-slate-500/20">
                                    <Package className="h-5 w-5" />
                                </div>
                                <Badge variant="outline" className="text-[10px] font-medium opacity-70">
                                    Total
                                </Badge>
                            </div>
                            <h3 className="text-3xl font-bold tracking-tight text-foreground">
                                {stats?.total || 0}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-slate-500/10 font-medium">
                                Total Orders
                            </p>
                        </div>
                    </div>

                    {/* Pending Card */}
                    <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-yellow-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/5 hover:border-yellow-500/30">
                        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-yellow-500/10 blur-2xl transition-all duration-300 group-hover:bg-yellow-500/20" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-yellow-500/20">
                                    <Clock className="h-5 w-5" />
                                </div>
                                <Badge variant="outline" className="text-[10px] font-medium bg-yellow-500/5 text-yellow-500 border-yellow-500/20">
                                    Pending
                                </Badge>
                            </div>
                            <h3 className="text-3xl font-bold tracking-tight text-yellow-600 dark:text-yellow-400">
                                {stats?.pending || 0}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-yellow-500/10 font-medium">
                                Pending Orders
                            </p>
                        </div>
                    </div>

                    {/* In Progress Card */}
                    <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-blue-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-500/30">
                        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-blue-500/10 blur-2xl transition-all duration-300 group-hover:bg-blue-500/20" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-500/20">
                                    <Loader className="h-5 w-5" />
                                </div>
                                <Badge variant="outline" className="text-[10px] font-medium bg-blue-500/5 text-blue-500 border-blue-500/20">
                                    Progress
                                </Badge>
                            </div>
                            <h3 className="text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                                {stats?.inProgress || 0}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-blue-500/10 font-medium">
                                In Progress
                            </p>
                        </div>
                    </div>

                    {/* Quality Check Card */}
                    <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-purple-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/5 hover:border-purple-500/30">
                        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-purple-500/10 blur-2xl transition-all duration-300 group-hover:bg-purple-500/20" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-purple-500/20">
                                    <AlertCircle className="h-5 w-5" />
                                </div>
                                <Badge variant="outline" className="text-[10px] font-medium bg-purple-500/5 text-purple-500 border-purple-500/20">
                                    QC
                                </Badge>
                            </div>
                            <h3 className="text-3xl font-bold tracking-tight text-purple-600 dark:text-purple-400">
                                {stats?.qualityCheck || 0}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-purple-500/10 font-medium">
                                Quality Check
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats Cards - Row 2 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Revision Card */}
                    <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-orange-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/5 hover:border-orange-500/30">
                        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-orange-500/10 blur-2xl transition-all duration-300 group-hover:bg-orange-500/20" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-orange-500/20">
                                    <RotateCcw className="h-5 w-5" />
                                </div>
                                <Badge variant="outline" className="text-[10px] font-medium bg-orange-500/5 text-orange-500 border-orange-500/20">
                                    Revision
                                </Badge>
                            </div>
                            <h3 className="text-3xl font-bold tracking-tight text-orange-600 dark:text-orange-400">
                                {stats?.revision || 0}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-orange-500/10 font-medium">
                                In Revision
                            </p>
                        </div>
                    </div>

                    {/* Completed Card */}
                    <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-green-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/5 hover:border-green-500/30">
                        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-green-500/10 blur-2xl transition-all duration-300 group-hover:bg-green-500/20" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-green-500/20">
                                    <CheckCircle className="h-5 w-5" />
                                </div>
                                <Badge variant="outline" className="text-[10px] font-medium bg-green-500/5 text-green-500 border-green-500/20">
                                    Completed
                                </Badge>
                            </div>
                            <h3 className="text-3xl font-bold tracking-tight text-green-600 dark:text-green-400">
                                {stats?.completed || 0}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-green-500/10 font-medium">
                                Completed Orders
                            </p>
                        </div>
                    </div>

                    {/* Delivered Card */}
                    <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-emerald-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/5 hover:border-emerald-500/30">
                        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-emerald-500/10 blur-2xl transition-all duration-300 group-hover:bg-emerald-500/20" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-emerald-500/20">
                                    <CheckCircle className="h-5 w-5" />
                                </div>
                                <Badge variant="outline" className="text-[10px] font-medium bg-emerald-500/5 text-emerald-500 border-emerald-500/20">
                                    Delivered
                                </Badge>
                            </div>
                            <h3 className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                                {stats?.delivered || 0}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-emerald-500/10 font-medium">
                                Delivered Orders
                            </p>
                        </div>
                    </div>

                    {/* Overdue Card */}
                    <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-red-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-red-500/5 hover:border-red-500/30">
                        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-red-500/10 blur-2xl transition-all duration-300 group-hover:bg-red-500/20" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-red-500/20">
                                    <AlertTriangle className="h-5 w-5" />
                                </div>
                                <Badge variant="outline" className="text-[10px] font-medium bg-red-500/5 text-red-500 border-red-500/20">
                                    Overdue
                                </Badge>
                            </div>
                            <h3 className="text-3xl font-bold tracking-tight text-red-600 dark:text-red-400">
                                {stats?.overdue || 0}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-red-500/10 font-medium">
                                Overdue Orders
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Card */}
            <Card className="border-border/60 shadow-md">
                <CardHeader className="pb-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Package className="h-5 w-5 text-primary" />
                            Order Directory
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Select Mode Toggle Button (Hidden for telemarketers) */}
                            {!isTelemarketer &&
                                (!isSelectionMode ? (
                                    <Button
                                        variant="outline"
                                        className="border-primary text-primary hover:bg-accent hover:text-accent-foreground shadow-xs"
                                        onClick={() => setIsSelectionMode(true)}
                                    >
                                        <CheckSquare className="h-4 w-4" />
                                        Select
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        className="border-destructive text-destructive hover:bg-destructive/10 shadow-xs"
                                        onClick={clearSelection}
                                    >
                                        <X className="h-4 w-4" />
                                        Cancel
                                    </Button>
                                ))}
                            <Button variant="outline" className="border-primary text-primary hover:bg-accent hover:text-accent-foreground shadow-xs" asChild>
                                <Link href="/orders/invoice">
                                    <FileText className="h-4 w-4" />
                                    Generate Invoice
                                </Link>
                            </Button>
                            <Dialog
                                open={isAddDialogOpen}
                                onOpenChange={(open) => {
                                    setIsAddDialogOpen(open);
                                    if (!open) setServerErrors(undefined);
                                }}
                            >
                                <DialogTrigger asChild>
                                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs">
                                        <Plus className="h-4 w-4" />
                                        Add Order
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[650px] p-0 gap-0 max-h-[85vh] overflow-hidden flex flex-col">
                                    <div className="px-6 pt-6 pb-4 shrink-0">
                                        <DialogHeader>
                                            <DialogTitle className="text-xl font-semibold">
                                                Create New Order
                                            </DialogTitle>
                                            <DialogDescription>
                                                Fill in the order details below.
                                            </DialogDescription>
                                        </DialogHeader>
                                    </div>
                                    <Separator className="shrink-0" />
                                    <OrderForm
                                        onSubmit={handleCreateOrder}
                                        isSubmitting={isCreating}
                                        submitLabel="Create Order"
                                        onCancel={() => setIsAddDialogOpen(false)}
                                        serverErrors={serverErrors}
                                        isTelemarketer={isTelemarketer}
                                        isAdmin={isAdmin}
                                    />
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Filters Toolbar */}
                    <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
                        <div className="flex items-center gap-2 shrink-0">
                            <div className="bg-primary/10 p-2 rounded-full">
                                <Filter className="h-4 w-4 text-primary" />
                            </div>
                            <span className="text-sm font-medium">Filters:</span>
                        </div>
                        <TooltipProvider>
                            <div className="flex flex-wrap gap-3 items-center flex-1">
                                {/* Search */}
                                <div className="relative flex-1 min-w-[200px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search orders..."
                                        value={filters.search || ""}
                                        onChange={(e) =>
                                            handleFilterChange(
                                                "search",
                                                e.target.value,
                                            )
                                        }
                                        className="pl-9 pr-8 h-9 bg-background/60 border-input text-sm"
                                    />
                                    {filters.search && (
                                        <button
                                            onClick={() => handleFilterChange("search", "")}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                                            type="button"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>

                                {/* Month Filter */}
                                <Select
                                    value={selectedMonth}
                                    onValueChange={(value) => {
                                        setSelectedMonth(value);
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger className="w-[130px] h-9 bg-background/60 text-xs font-medium">
                                        <SelectValue placeholder="All Months" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {months.map((month) => (
                                            <SelectItem
                                                key={month.value}
                                                value={month.value}
                                                className="text-xs"
                                            >
                                                {month.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Year Filter */}
                                <Select
                                    value={selectedYear}
                                    onValueChange={(value) => {
                                        setSelectedYear(value);
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger className="w-[110px] h-9 bg-background/60 text-xs font-medium">
                                        <SelectValue placeholder="All Years" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all" className="text-xs">All Years</SelectItem>
                                        {sortedYears.map((year: number) => (
                                            <SelectItem
                                                key={year}
                                                value={year.toString()}
                                                className="text-xs"
                                            >
                                                {year}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Status Filter */}
                                <Select
                                    value={filters.status || "all"}
                                    onValueChange={(value) =>
                                        handleFilterChange(
                                            "status",
                                            value === "all" ? undefined : value,
                                        )
                                    }
                                >
                                    <SelectTrigger className="w-[130px] h-9 bg-background/60 text-xs font-medium">
                                        <SelectValue placeholder="All Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all" className="text-xs">All Status</SelectItem>
                                        {Object.entries(ORDER_STATUS_LABELS).map(
                                            ([value, label]) => (
                                                <SelectItem
                                                    key={value}
                                                    value={value}
                                                    className="text-xs"
                                                >
                                                    {label}
                                                </SelectItem>
                                            ),
                                        )}
                                    </SelectContent>
                                </Select>

                                {/* Priority Filter */}
                                <Select
                                    value={filters.priority || "all"}
                                    onValueChange={(value) =>
                                        handleFilterChange(
                                            "priority",
                                            value === "all" ? undefined : value,
                                        )
                                    }
                                >
                                    <SelectTrigger className="w-[130px] h-9 bg-background/60 text-xs font-medium">
                                        <SelectValue placeholder="All Priority" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all" className="text-xs">All Priority</SelectItem>
                                        {Object.entries(
                                            ORDER_PRIORITY_LABELS,
                                        ).map(([value, label]) => (
                                            <SelectItem
                                                key={value}
                                                value={value}
                                                className="text-xs"
                                            >
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Client Filter */}
                                <Select
                                    value={filters.clientId || "all"}
                                    onValueChange={(value) =>
                                        handleFilterChange(
                                            "clientId",
                                            value === "all" ? undefined : value,
                                        )
                                    }
                                >
                                    <SelectTrigger className="w-[140px] h-9 bg-background/60 text-xs font-medium">
                                        <SelectValue placeholder="All Clients" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all" className="text-xs">All Clients</SelectItem>
                                        {clients.map((client) => (
                                            <SelectItem
                                                key={client._id}
                                                value={client._id}
                                                className="text-xs"
                                            >
                                                {client.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                 {/* Clear Filters Button */}
                                {(filters.search || filters.status || filters.priority || filters.clientId || selectedMonth || selectedYear) && (
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            setFilters({
                                                search: "",
                                                status: undefined,
                                                priority: undefined,
                                                clientId: undefined,
                                                limit: 10,
                                            });
                                            setSelectedMonth("");
                                            setSelectedYear("");
                                            setPage(1);
                                        }}
                                        className="h-9 px-3 text-xs hover:bg-muted/85 font-medium shrink-0"
                                    >
                                        Clear Filters
                                        <X className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        </TooltipProvider>
                    </div>

                    {/* Selection Action Bar */}
                    {isSelectionMode && (
                        <div className="flex items-center justify-between p-3 rounded-lg border bg-primary/5 border-primary/20">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                    {selectedOrderIds.size} order
                                    {selectedOrderIds.size !== 1
                                        ? "s"
                                        : ""}{" "}
                                    selected
                                </span>
                                {selectedOrderIds.size > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                            setSelectedOrderIds(new Set())
                                        }
                                        className="h-7 text-xs"
                                    >
                                        <X className="h-3 w-3" />
                                        Clear Selection
                                    </Button>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {!isTelemarketer && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() =>
                                            setIsBulkDeleteDialogOpen(true)
                                        }
                                        disabled={selectedOrderIds.size === 0}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Delete ({selectedOrderIds.size})
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Select All Matching Banner */}
                    {isSelectionMode &&
                        allOrdersSelected &&
                        meta &&
                        meta.total > selectedOrderIds.size && (
                            <div className="flex items-center justify-center p-2 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-lg text-sm text-blue-600 dark:text-blue-400">
                                <span>
                                    All {orders.length} orders on this page are
                                    selected.
                                </span>
                                <Button
                                    variant="link"
                                    className="ml-2 h-auto p-0 font-semibold"
                                    onClick={handleSelectAllMatches}
                                    disabled={isLoadingAll}
                                >
                                    {isLoadingAll ? (
                                        <>
                                            <Loader className="h-3 w-3 animate-spin" />
                                            Selecting all {meta.total} orders...
                                        </>
                                    ) : (
                                        `Select all ${meta.total} orders`
                                    )}
                                </Button>
                            </div>
                        )}

                    {/* Table Container */}
                    <div className="rounded-md border border-border/60 overflow-hidden">
                        {isLoading ? (
                            <Table>
                                <TableHeader className="bg-muted/40">
                                    <TableRow className="hover:bg-muted/40 border-b-border/60">
                                        <TableHead className="font-semibold py-3 pl-4">Name</TableHead>
                                        <TableHead className="font-semibold py-3">Client</TableHead>
                                        <TableHead className="font-semibold py-3">Time Left</TableHead>
                                        <TableHead className="font-semibold py-3 text-center">Qty</TableHead>
                                        <TableHead className="font-semibold py-3">Total</TableHead>
                                        <TableHead className="font-semibold py-3 text-center">Status</TableHead>
                                        <TableHead className="font-semibold py-3">Priority</TableHead>
                                        <TableHead className="font-semibold py-3 text-right pr-4">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {[...Array(5)].map((_, i) => (
                                        <TableRow key={i} className="border-b last:border-b-0">
                                            <TableCell className="py-3 pl-4">
                                                <Skeleton className="h-4 w-32 bg-muted animate-pulse rounded-md" />
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <Skeleton className="h-4 w-24 bg-muted animate-pulse rounded-md" />
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <Skeleton className="h-4 w-16 bg-muted animate-pulse rounded-md" />
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <Skeleton className="h-4 w-10 mx-auto bg-muted animate-pulse rounded-md" />
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <Skeleton className="h-4 w-16 bg-muted animate-pulse rounded-md" />
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <Skeleton className="h-6 w-20 mx-auto rounded-full bg-muted animate-pulse" />
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <Skeleton className="h-6 w-16 rounded-full bg-muted animate-pulse" />
                                            </TableCell>
                                            <TableCell className="py-3 pr-4 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Skeleton className="h-8 w-8 bg-muted animate-pulse rounded-md" />
                                                    <Skeleton className="h-8 w-8 bg-muted animate-pulse rounded-md" />
                                                    <Skeleton className="h-8 w-8 bg-muted animate-pulse rounded-md" />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <Table>
                                <TableHeader className="bg-muted/40">
                                    <TableRow className="hover:bg-muted/40 border-b-border/60">
                                        {isSelectionMode && (
                                            <TableHead className="w-[50px] py-3 pl-4">
                                                <Checkbox
                                                    checked={allOrdersSelected}
                                                    onCheckedChange={(
                                                        checked,
                                                    ) =>
                                                        toggleAllOrders(
                                                            !!checked,
                                                        )
                                                    }
                                                    aria-label="Select all orders"
                                                />
                                            </TableHead>
                                        )}
                                        <TableHead className={`font-semibold py-3 ${isSelectionMode ? '' : 'pl-4'}`}>
                                            Order Date
                                        </TableHead>
                                        <TableHead className="font-semibold py-3">
                                            Client
                                        </TableHead>
                                        <TableHead className="font-semibold py-3">
                                            Name
                                        </TableHead>
                                        <TableHead className="font-semibold py-3">
                                            Time Left
                                        </TableHead>
                                        <TableHead className="font-semibold py-3 text-center">
                                            Qty
                                        </TableHead>
                                        <TableHead className="font-semibold py-3">
                                            Total
                                        </TableHead>
                                        <TableHead className="font-semibold py-3 text-center">
                                            Status
                                        </TableHead>
                                        <TableHead className="font-semibold py-3">
                                            Priority
                                        </TableHead>
                                        <TableHead className="font-semibold py-3 text-right pr-4">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {orders.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={
                                                    isSelectionMode ? 10 : 9
                                                }
                                                className="text-center py-8 text-muted-foreground"
                                            >
                                                No orders found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        orders.map((order: IOrder) => (
                                            <TableRow
                                                key={order._id}
                                                className={cn(
                                                    "hover:bg-muted/15 transition-colors border-b last:border-b-0",
                                                    isSelectionMode &&
                                                    selectedOrderIds.has(
                                                        order._id,
                                                    ) &&
                                                    "bg-muted/50",
                                                )}
                                            >
                                                {isSelectionMode && (
                                                    <TableCell className="py-3 pl-4">
                                                        <Checkbox
                                                            checked={selectedOrderIds.has(
                                                                order._id,
                                                            )}
                                                            onCheckedChange={() =>
                                                                toggleOrderSelection(
                                                                    order._id,
                                                                )
                                                            }
                                                            aria-label={`Select ${order.orderName}`}
                                                        />
                                                    </TableCell>
                                                )}
                                                <TableCell className={`py-3 text-xs text-muted-foreground ${isSelectionMode ? '' : 'pl-4'}`}>
                                                    {format(
                                                        new Date(
                                                            order.orderDate,
                                                        ),
                                                        "MMM dd, yyyy",
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-sm text-foreground">
                                                            {
                                                                order.clientId
                                                                    ?.name
                                                            }
                                                        </span>
                                                        <span className="text-xs text-muted-foreground font-mono">
                                                            {
                                                                order.clientId
                                                                    ?.clientId
                                                            }
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-3 font-medium text-sm max-w-[200px] truncate">
                                                    {order.orderName}
                                                    {order.revisionCount >
                                                        0 && (
                                                            <Badge
                                                                variant="outline"
                                                                className="ml-2 text-xs"
                                                            >
                                                                R
                                                                {
                                                                    order.revisionCount
                                                                }
                                                            </Badge>
                                                        )}
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    <DeadlineCountdown
                                                        deadline={
                                                            order.deadline
                                                        }
                                                        status={order.status}
                                                    />
                                                </TableCell>
                                                <TableCell className="py-3 text-center text-sm font-bold">
                                                    {order.imageQuantity}
                                                </TableCell>
                                                <TableCell className="py-3 text-sm font-semibold">
                                                    {!isTelemarketer && order.clientId?.clientId !== 'WB_1003_50' ? (
                                                        <span className="text-muted-foreground">N/A</span>
                                                    ) : (
                                                        `$${order.totalPrice.toFixed(2)}`
                                                    )}
                                                </TableCell>
                                                <TableCell className='py-3 flex items-center justify-center w-auto'>
                                                    <Select
                                                        value={order.status}
                                                        onValueChange={(
                                                            value,
                                                        ) =>
                                                            handleStatusChange(
                                                                order._id,
                                                                value as OrderStatus,
                                                            )
                                                        }
                                                        disabled={
                                                            isUpdatingStatus ||
                                                            statusWorkflow[
                                                                order.status
                                                            ].length === 0
                                                        }
                                                    >
                                                        <SelectTrigger
                                                            className={cn(
                                                                statusColors[
                                                                order
                                                                    .status
                                                                ],
                                                            )}
                                                        >
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {Object.entries(
                                                                ORDER_STATUS_LABELS,
                                                            ).map(
                                                                ([
                                                                    value,
                                                                    label,
                                                                ]) => (
                                                                    <SelectItem
                                                                        key={
                                                                            value
                                                                        }
                                                                        value={
                                                                            value
                                                                        }
                                                                        disabled={
                                                                            !canTransitionTo(
                                                                                order.status,
                                                                                value as OrderStatus,
                                                                            )
                                                                        }
                                                                    >
                                                                        {
                                                                            label
                                                                        }
                                                                    </SelectItem>
                                                                ),
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[
                                                            order.priority
                                                            ]
                                                            }`}
                                                    >
                                                        {
                                                            ORDER_PRIORITY_LABELS[
                                                            order.priority
                                                            ]
                                                        }
                                                    </span>
                                                </TableCell>
                                                <TableCell className="w-auto">
                                                    <TooltipProvider>
                                                        <div className="flex items-center justify-center gap-1">
                                                            <Tooltip>
                                                                <TooltipTrigger
                                                                    asChild
                                                                >
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() =>
                                                                            openViewDialog(
                                                                                order,
                                                                            )
                                                                        }
                                                                    >
                                                                        <Eye className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>View</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                            {(!isTelemarketer ||
                                                                (isTelemarketer &&
                                                                    order
                                                                        .clientId
                                                                        ?.createdBy ===
                                                                    session
                                                                        ?.user
                                                                        ?.id)) && (
                                                                    <>
                                                                        <Tooltip>
                                                                            <TooltipTrigger
                                                                                asChild
                                                                            >
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    onClick={() =>
                                                                                        openEditDialog(
                                                                                            order,
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    <Edit2 className="h-4 w-4" />
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>
                                                                                <p>
                                                                                    Edit
                                                                                </p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                        <Tooltip>
                                                                            <TooltipTrigger
                                                                                asChild
                                                                            >
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    onClick={() =>
                                                                                        openExtendDialog(
                                                                                            order,
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    <Calendar className="h-4 w-4" />
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>
                                                                                <p>
                                                                                    Extend
                                                                                    Deadline
                                                                                </p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                        <Tooltip>
                                                                            <TooltipTrigger
                                                                                asChild
                                                                            >
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    onClick={() =>
                                                                                        openRevisionDialog(
                                                                                            order,
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    <RotateCcw className="h-4 w-4" />
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>
                                                                                <p>
                                                                                    Add
                                                                                    Revision
                                                                                </p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </>
                                                                )}
                                                            {!isTelemarketer && (
                                                                <Tooltip>
                                                                    <TooltipTrigger
                                                                        asChild
                                                                    >
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() => {
                                                                                setSelectedOrder(
                                                                                    order,
                                                                                );
                                                                                setIsDeleteDialogOpen(
                                                                                    true,
                                                                                );
                                                                            }}
                                                                        >
                                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>
                                                                            Delete
                                                                        </p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                            <Tooltip>
                                                                <TooltipTrigger
                                                                    asChild
                                                                >
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() =>
                                                                            openTimelineDialog(
                                                                                order,
                                                                            )
                                                                        }
                                                                    >
                                                                        <History className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>
                                                                        View
                                                                        Timeline
                                                                    </p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </div>
                                                    </TooltipProvider>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </div>

                    {/* Pagination Footer */}
                    {meta && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/60">
                            <div className="text-sm text-muted-foreground font-medium select-none">
                                Showing <span className="font-semibold text-foreground">{orders.length}</span> of{" "}
                                <span className="font-semibold text-foreground">{meta.total}</span> orders
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">Rows per page</span>
                                    <Select
                                        value={`${filters.limit || 10}`}
                                        onValueChange={(value) => {
                                            handleFilterChange("limit", Number(value));
                                        }}
                                    >
                                        <SelectTrigger className="h-8 w-[70px] text-xs font-semibold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PER_PAGE_OPTIONS.map((pageSize) => (
                                                <SelectItem
                                                    key={pageSize}
                                                    value={`${pageSize}`}
                                                    className="text-xs"
                                                >
                                                    {pageSize}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setPage(1)}
                                        disabled={page === 1 || isFetching}
                                    >
                                        <ChevronsLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={page === 1 || isFetching}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="text-xs font-medium px-2 whitespace-nowrap select-none">
                                        Page {meta.page} of {meta.totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                                        disabled={page >= meta.totalPages || isFetching}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setPage(meta.totalPages)}
                                        disabled={page >= meta.totalPages || isFetching}
                                    >
                                        <ChevronsRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog
                open={isEditDialogOpen}
                onOpenChange={(open) => {
                    setIsEditDialogOpen(open);
                    if (!open) setServerErrors(undefined);
                }}
            >
                <DialogContent className="sm:max-w-[650px] p-0 gap-0 max-h-[85vh] overflow-hidden flex flex-col">
                    <div className="px-6 pt-6 pb-4 shrink-0">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-semibold">
                                Edit Order
                            </DialogTitle>
                            <DialogDescription>
                                Update the order details below.
                            </DialogDescription>
                        </DialogHeader>
                    </div>
                    <Separator className="shrink-0" />
                    {editDefaultValues && (
                        <OrderForm
                            key={selectedOrder?._id}
                            defaultValues={editDefaultValues}
                            onSubmit={handleUpdateOrder}
                            isSubmitting={isUpdating}
                            submitLabel="Update Order"
                            onCancel={() => setIsEditDialogOpen(false)}
                            serverErrors={serverErrors}
                            isTelemarketer={isTelemarketer}
                            isAdmin={isAdmin}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* View Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Order Details</DialogTitle>
                        <DialogDescription>
                            {selectedOrder?.orderName}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedOrder && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        Client
                                    </p>
                                    <p className="font-medium">
                                        {selectedOrder.clientId?.name}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        Team Member
                                    </p>
                                    <p className="font-medium">
                                        {(() => {
                                            const member = selectedOrder.clientId?.teamMembers?.find(
                                                (m) => m._id === selectedOrder.contactPersonId
                                            );
                                            return member ? `${member.name} (${member.designation})` : "N/A";
                                        })()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        Status
                                    </p>
                                    <Badge
                                        className={
                                            statusColors[selectedOrder.status]
                                        }
                                    >
                                        {
                                            ORDER_STATUS_LABELS[
                                            selectedOrder.status
                                            ]
                                        }
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        Order Date
                                    </p>
                                    <p className="font-medium">
                                        {format(
                                            new Date(selectedOrder.orderDate),
                                            "MMM dd, yyyy",
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        Deadline
                                    </p>
                                    <p className="font-medium">
                                        {format(
                                            new Date(selectedOrder.deadline),
                                            "MMM dd, yyyy h:mm a",
                                        )}
                                    </p>
                                    {selectedOrder.originalDeadline && (
                                        <p className="text-xs text-muted-foreground">
                                            Original:{" "}
                                            {format(
                                                new Date(
                                                    selectedOrder.originalDeadline,
                                                ),
                                                "MMM dd, yyyy",
                                            )}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        Image Quantity
                                    </p>
                                    <p className="font-medium">
                                        {selectedOrder.imageQuantity}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        Total Price
                                    </p>
                                    <p className="font-medium text-lg">
                                        ${selectedOrder.totalPrice.toFixed(2)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        Revisions
                                    </p>
                                    <p className="font-medium">
                                        {selectedOrder.revisionCount}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        Priority
                                    </p>
                                    <Badge
                                        className={
                                            priorityColors[
                                            selectedOrder.priority
                                            ]
                                        }
                                    >
                                        {
                                            ORDER_PRIORITY_LABELS[
                                            selectedOrder.priority
                                            ]
                                        }
                                    </Badge>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Services
                                </p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {selectedOrder.services.map((service) => (
                                        <Badge
                                            key={service._id}
                                            variant="outline"
                                        >
                                            {service.name}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                            {selectedOrder.instruction && (
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        Instructions
                                    </p>
                                    <p className="text-sm bg-muted p-3 rounded-md mt-1">
                                        {selectedOrder.instruction}
                                    </p>
                                </div>
                            )}
                            {selectedOrder.revisionInstructions &&
                                selectedOrder.revisionInstructions.length >
                                0 && (
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            Revision Instructions
                                        </p>
                                        <div className="space-y-2">
                                            {selectedOrder.revisionInstructions.map(
                                                (rev, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="text-sm bg-orange-500/10 dark:bg-orange-500/20 p-3 rounded-md border border-orange-500/30"
                                                    >
                                                        <p>{rev.instruction}</p>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {format(
                                                                new Date(
                                                                    rev.createdAt,
                                                                ),
                                                                "MMM dd, yyyy h:mm a",
                                                            )}{" "}
                                                            by Admin
                                                        </p>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Extend Deadline Dialog */}
            <Dialog
                open={isExtendDialogOpen}
                onOpenChange={(open) => {
                    setIsExtendDialogOpen(open);
                    if (!open) {
                        setNewDeadline(undefined);
                        setExtendReason("");
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Extend Deadline</DialogTitle>
                        <DialogDescription>
                            Set a new deadline for this order
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <DateTimePicker
                            label="New Deadline"
                            value={newDeadline}
                            onChange={setNewDeadline}
                            placeholder="Select new deadline"
                        />
                        <div className="space-y-2">
                            <Label>Reason (optional)</Label>
                            <Textarea
                                value={extendReason}
                                onChange={(e) =>
                                    setExtendReason(e.target.value)
                                }
                                placeholder="Why is the deadline being extended?"
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsExtendDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleExtendDeadline}
                            disabled={!newDeadline || isExtending}
                        >
                            {isExtending && (
                                <Loader className="h-4 w-4  animate-spin" />
                            )}
                            Extend Deadline
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Revision Dialog */}
            <Dialog
                open={isRevisionDialogOpen}
                onOpenChange={(open) => {
                    setIsRevisionDialogOpen(open);
                    if (!open) setRevisionInstruction("");
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Revision</DialogTitle>
                        <DialogDescription>
                            Add revision instructions for this order
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Revision Instructions *</Label>
                            <Textarea
                                value={revisionInstruction}
                                onChange={(e) =>
                                    setRevisionInstruction(e.target.value)
                                }
                                placeholder="Describe what needs to be revised..."
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsRevisionDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddRevision}
                            disabled={
                                !revisionInstruction.trim() || isAddingRevision
                            }
                        >
                            {isAddingRevision && (
                                <Loader className="h-4 w-4  animate-spin" />
                            )}
                            Add Revision
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Timeline Dialog */}
            <Dialog
                open={isTimelineDialogOpen}
                onOpenChange={setIsTimelineDialogOpen}
            >
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Order Timeline</DialogTitle>
                        <DialogDescription>
                            {selectedOrder?.orderName}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedOrder && selectedOrder.timeline && (
                        <OrderTimeline timeline={selectedOrder.timeline} />
                    )}
                </DialogContent>
            </Dialog>

            {/* Status Change Dialog (for revision) */}
            <Dialog
                open={isStatusChangeDialogOpen}
                onOpenChange={(open) => {
                    setIsStatusChangeDialogOpen(open);
                    if (!open) {
                        setPendingStatusChange(null);
                        setStatusChangeNote("");
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Change to Revision</DialogTitle>
                        <DialogDescription>
                            Add optional revision instructions for the client
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Revision Instructions (optional)</Label>
                            <Textarea
                                value={statusChangeNote}
                                onChange={(e) =>
                                    setStatusChangeNote(e.target.value)
                                }
                                placeholder="What needs to be revised..."
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsStatusChangeDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmStatusChange}
                            disabled={isUpdatingStatus}
                        >
                            {isUpdatingStatus && (
                                <Loader className="h-4 w-4  animate-spin" />
                            )}
                            Set to Revision
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Order</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete order{" "}
                            <strong>{selectedOrder?.orderName}</strong>? This
                            action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteOrder}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isDeleting}
                        >
                            {isDeleting && (
                                <Loader className="h-4 w-4  animate-spin" />
                            )}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Bulk Delete Confirmation */}
            <AlertDialog
                open={isBulkDeleteDialogOpen}
                onOpenChange={setIsBulkDeleteDialogOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Delete Selected Orders
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete{" "}
                            <strong>{selectedOrderIds.size}</strong> selected
                            order
                            {selectedOrderIds.size !== 1 ? "s" : ""}? This
                            action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleBulkDeleteOrders();
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isBulkDeleting}
                        >
                            {isBulkDeleting && (
                                <Loader className="h-4 w-4  animate-spin" />
                            )}
                            Delete {selectedOrderIds.size} Order
                            {selectedOrderIds.size !== 1 ? "s" : ""}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Email Notification Dialog */}
            <EmailDialog
                open={isEmailDialogOpen}
                onOpenChange={setIsEmailDialogOpen}
                order={emailPendingOrder}
                status={emailPendingStatus as OrderStatus}
                onSend={confirmEmailAndStatusChange}
                isLoading={isEmailSending}
            />
        </div>
    );
}
