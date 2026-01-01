'use client';

import { useState } from 'react';
import {
    useGetOrdersQuery,
    useCreateOrderMutation,
    useUpdateOrderMutation,
    useDeleteOrderMutation,
    useGetOrderStatsQuery,
    useUpdateOrderStatusMutation,
    useExtendDeadlineMutation,
    useAddRevisionMutation,
} from '@/redux/features/order/orderApi';
import { useGetClientsQuery } from '@/redux/features/client/clientApi';
import type {
    IOrder,
    OrderStatus,
    OrderPriority,
    OrderFilters,
} from '@/types/order.type';
import {
    ORDER_STATUS_LABELS,
    ORDER_PRIORITY_LABELS,
} from '@/types/order.type';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Loader2,
    ChevronLeft,
    ChevronRight,
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
} from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { OrderForm, type OrderFormData } from '@/components/order/OrderForm';
import { DeadlineCountdown } from '@/components/order/DeadlineCountdown';
import { OrderTimeline } from '@/components/order/OrderTimeline';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { DateTimePicker } from '@/components/shared/DateTimePicker';
import { cn } from '@/lib/utils';

const statusColors: Record<OrderStatus, string> = {
    pending: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
    in_progress: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
    quality_check: 'bg-purple-500/20 text-purple-700 dark:text-purple-400',
    revision: 'bg-orange-500/20 text-orange-700 dark:text-orange-400',
    completed: 'bg-green-500/20 text-green-700 dark:text-green-400',
    delivered: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
    cancelled: 'bg-red-500/20 text-red-700 dark:text-red-400',
};

const priorityColors: Record<OrderPriority, string> = {
    low: 'bg-muted text-muted-foreground',
    normal: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
    high: 'bg-orange-500/20 text-orange-700 dark:text-orange-400',
    urgent: 'bg-red-500/20 text-red-700 dark:text-red-400',
};

// Status workflow: defines which statuses can transition to which
// Key = current status, Value = array of allowed next statuses
const statusWorkflow: Record<OrderStatus, OrderStatus[]> = {
    pending: ['in_progress', 'cancelled'],
    in_progress: ['quality_check', 'revision', 'cancelled'],
    quality_check: ['completed', 'revision', 'in_progress'],
    revision: ['in_progress', 'cancelled'],
    completed: ['delivered', 'revision'],
    delivered: [], // Final state - no transitions allowed
    cancelled: [], // Final state - no transitions allowed
};

// Helper function to check if a status transition is allowed
const canTransitionTo = (currentStatus: OrderStatus, targetStatus: OrderStatus): boolean => {
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
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState<OrderFilters>({
        search: '',
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
    const [isStatusChangeDialogOpen, setIsStatusChangeDialogOpen] = useState(false);
    const [pendingStatusChange, setPendingStatusChange] = useState<{ orderId: string; status: OrderStatus } | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<IOrder | null>(null);

    const [serverErrors, setServerErrors] = useState<
        Record<string, string[]> | undefined
    >(undefined);
    const [editDefaultValues, setEditDefaultValues] = useState<
        OrderFormData | undefined
    >(undefined);

    // Extend deadline state
    const [newDeadline, setNewDeadline] = useState<Date | undefined>(undefined);
    const [extendReason, setExtendReason] = useState('');

    // Revision state
    const [revisionInstruction, setRevisionInstruction] = useState('');
    const [statusChangeNote, setStatusChangeNote] = useState('');

    // Queries
    const {
        data: orderData,
        isLoading,
        isFetching,
    } = useGetOrdersQuery({
        ...filters,
        page,
    });
    const { data: statsData } = useGetOrderStatsQuery();
    const { data: clientsData } = useGetClientsQuery({ limit: 100 });

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

    const orders = orderData?.data || [];
    const meta = orderData?.meta;
    const stats = statsData?.data;
    const clients = clientsData?.clients || [];

    const handleFilterChange = (
        key: keyof OrderFilters,
        value: string | number | undefined
    ) => {
        setFilters((prev) => ({ ...prev, [key]: value || undefined }));
        setPage(1);
    };

    const handleCreateOrder = async (data: OrderFormData) => {
        setServerErrors(undefined);
        try {
            await createOrder(data).unwrap();
            toast.success('Order created successfully');
            setIsAddDialogOpen(false);
        } catch (error: unknown) {
            const err = error as ApiErrorResponse;
            if (err?.data?.errors) {
                setServerErrors(err.data.errors);
            } else {
                toast.error(err?.data?.message || 'Failed to create order');
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
            toast.success('Order updated successfully');
            setIsEditDialogOpen(false);
            setSelectedOrder(null);
        } catch (error: unknown) {
            const err = error as ApiErrorResponse;
            if (err?.data?.errors) {
                setServerErrors(err.data.errors);
            } else {
                toast.error(err?.data?.message || 'Failed to update order');
            }
        }
    };

    const handleDeleteOrder = async () => {
        if (!selectedOrder) return;
        try {
            await deleteOrder(selectedOrder._id).unwrap();
            toast.success('Order deleted successfully');
            setIsDeleteDialogOpen(false);
            setSelectedOrder(null);
        } catch (error: unknown) {
            const err = error as ApiErrorResponse;
            toast.error(err?.data?.message || 'Failed to delete order');
        }
    };

    const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
        // Guard against empty/undefined values
        if (!newStatus) {
            console.log('handleStatusChange - empty status, skipping');
            return;
        }

        // If changing to revision, ask for optional instruction
        if (newStatus === 'revision') {
            setPendingStatusChange({ orderId, status: newStatus });
            setStatusChangeNote('');
            setIsStatusChangeDialogOpen(true);
            return;
        }

        try {
            await updateOrderStatus({
                id: orderId,
                data: { status: newStatus },
            }).unwrap();
            toast.success(`Status updated to ${ORDER_STATUS_LABELS[newStatus]}`);
        } catch (error: unknown) {
            const err = error as ApiErrorResponse;
            toast.error(err?.data?.message || 'Failed to update status');
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
            toast.success(`Status updated to ${ORDER_STATUS_LABELS[pendingStatusChange.status]}`);
            setIsStatusChangeDialogOpen(false);
            setPendingStatusChange(null);
            setStatusChangeNote('');
        } catch (error: unknown) {
            const err = error as ApiErrorResponse;
            toast.error(err?.data?.message || 'Failed to update status');
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
            toast.success('Deadline extended successfully');
            setIsExtendDialogOpen(false);
            setNewDeadline(undefined);
            setExtendReason('');
            setSelectedOrder(null);
        } catch (error: unknown) {
            const err = error as ApiErrorResponse;
            toast.error(err?.data?.message || 'Failed to extend deadline');
        }
    };

    const handleAddRevision = async () => {
        if (!selectedOrder || !revisionInstruction.trim()) return;
        try {
            await addRevision({
                id: selectedOrder._id,
                data: { instruction: revisionInstruction },
            }).unwrap();
            toast.success('Revision added successfully');
            setIsRevisionDialogOpen(false);
            setRevisionInstruction('');
            setSelectedOrder(null);
        } catch (error: unknown) {
            const err = error as ApiErrorResponse;
            toast.error(err?.data?.message || 'Failed to add revision');
        }
    };

    const openEditDialog = (order: IOrder) => {
        setSelectedOrder(order);
        setServerErrors(undefined);
        setEditDefaultValues({
            orderName: order.orderName,
            clientId: order.clientId._id,
            orderDate: order.orderDate.split('T')[0],
            deadline: order.deadline,
            imageQuantity: order.imageQuantity,
            perImagePrice: order.perImagePrice,
            totalPrice: order.totalPrice,
            services: order.services.map((s) => s._id),
            returnFileFormat: order.returnFileFormat._id,
            instruction: order.instruction || '',
            priority: order.priority,
            assignedTo: order.assignedTo?._id || '',
            notes: order.notes || '',
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
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total
                        </CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats?.total || 0}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Pending
                        </CardTitle>
                        <Clock className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">
                            {stats?.pending || 0}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            In Progress
                        </CardTitle>
                        <Loader2 className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {stats?.inProgress || 0}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">QC</CardTitle>
                        <AlertCircle className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">
                            {stats?.qualityCheck || 0}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Revision
                        </CardTitle>
                        <RotateCcw className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                            {stats?.revision || 0}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Completed
                        </CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {stats?.completed || 0}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Delivered
                        </CardTitle>
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">
                            {stats?.delivered || 0}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Overdue
                        </CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {stats?.overdue || 0}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Card */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-2xl">
                            Order Management
                        </CardTitle>
                        <CardDescription>
                            Manage graphic design orders and track their status
                        </CardDescription>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            asChild
                        >
                            <Link href="/orders/invoice">
                                <FileText className="mr-2 h-4 w-4" />
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
                                <Button>
                                    <Plus />
                                    Add Order
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl! max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Create New Order</DialogTitle>
                                    <DialogDescription>
                                        Fill in the order details
                                    </DialogDescription>
                                </DialogHeader>
                                <OrderForm
                                    onSubmit={handleCreateOrder}
                                    isSubmitting={isCreating}
                                    submitLabel="Create Order"
                                    onCancel={() => setIsAddDialogOpen(false)}
                                    serverErrors={serverErrors}
                                />
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 w-full">
                        <Input
                            placeholder="Search by name..."
                            value={filters.search || ''}
                            onChange={(e) =>
                                handleFilterChange('search', e.target.value)
                            }
                            className="w-full"
                        />
                        <Select
                            value={filters.status || ''}
                            onValueChange={(value) =>
                                handleFilterChange(
                                    'status',
                                    value as OrderStatus
                                )
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="All statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(ORDER_STATUS_LABELS).map(
                                    ([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                            {label}
                                        </SelectItem>
                                    )
                                )}
                            </SelectContent>
                        </Select>
                        <Select
                            value={filters.priority || ''}
                            onValueChange={(value) =>
                                handleFilterChange(
                                    'priority',
                                    value as OrderPriority
                                )
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="All priorities" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(ORDER_PRIORITY_LABELS).map(
                                    ([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                            {label}
                                        </SelectItem>
                                    )
                                )}
                            </SelectContent>
                        </Select>
                        <Select
                            value={filters.clientId || ''}
                            onValueChange={(value) =>
                                handleFilterChange('clientId', value)
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="All clients" />
                            </SelectTrigger>
                            <SelectContent>
                                {clients.map((client) => (
                                    <SelectItem
                                        key={client._id}
                                        value={client._id}
                                    >
                                        {client.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setFilters({
                                    search: '',
                                    status: undefined,
                                    priority: undefined,
                                    clientId: undefined,
                                    limit: 10,
                                });
                                setPage(1);
                            }}
                        >
                            Clear Filters
                        </Button>
                    </div>

                    {/* Table */}
                    <div className="border">
                        {isLoading ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="border-r">Name</TableHead>
                                        <TableHead className="border-r">Client</TableHead>
                                        <TableHead className="border-r">Time Left</TableHead>
                                        <TableHead className="border-r">Qty</TableHead>
                                        <TableHead className="border-r">Total</TableHead>
                                        <TableHead className="border-r">Status</TableHead>
                                        <TableHead className="border-r">Priority</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {[...Array(5)].map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="border-r">
                                                <Skeleton className="h-4 w-32" />
                                            </TableCell>
                                            <TableCell className="border-r">
                                                <Skeleton className="h-4 w-24" />
                                            </TableCell>
                                            <TableCell className="border-r">
                                                <Skeleton className="h-4 w-16" />
                                            </TableCell>
                                            <TableCell className="border-r">
                                                <Skeleton className="h-4 w-10" />
                                            </TableCell>
                                            <TableCell className="border-r">
                                                <Skeleton className="h-4 w-16" />
                                            </TableCell>
                                            <TableCell className="border-r">
                                                <Skeleton className="h-6 w-20" />
                                            </TableCell>
                                            <TableCell className="border-r">
                                                <Skeleton className="h-6 w-16" />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    <Skeleton className="h-8 w-8" />
                                                    <Skeleton className="h-8 w-8" />
                                                    <Skeleton className="h-8 w-8" />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="border-r">Name</TableHead>
                                        <TableHead className="border-r">Client</TableHead>
                                        <TableHead className="border-r">Time Left</TableHead>
                                        <TableHead className="border-r text-center">Qty</TableHead>
                                        <TableHead className="border-r">Total</TableHead>
                                        <TableHead className="border-r text-center">Status</TableHead>
                                        <TableHead className="border-r">Priority</TableHead>
                                        <TableHead className='text-center'>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {orders.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={8}
                                                className="text-center py-8 text-muted-foreground"
                                            >
                                                No orders found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        orders.map((order: IOrder) => (
                                            <TableRow key={order._id}>
                                                <TableCell className="border-r font-medium max-w-[200px] truncate">
                                                    {order.orderName}
                                                    {order.revisionCount > 0 && (
                                                        <Badge
                                                            variant="outline"
                                                            className="ml-2 text-xs"
                                                        >
                                                            R{order.revisionCount}
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="border-r">
                                                    {order.clientId?.name || '-'}
                                                </TableCell>
                                                <TableCell className="border-r">
                                                    <DeadlineCountdown
                                                        deadline={order.deadline}
                                                        status={order.status}
                                                    />
                                                </TableCell>
                                                <TableCell className="border-r text-center">
                                                    {order.imageQuantity}
                                                </TableCell>
                                                <TableCell className="border-r">
                                                    ${order.totalPrice.toFixed(2)}
                                                </TableCell>
                                                <TableCell className="border-r flex items-center justify-center w-auto">
                                                    <Select
                                                        value={order.status}
                                                        onValueChange={(value) =>
                                                            handleStatusChange(
                                                                order._id,
                                                                value as OrderStatus
                                                            )
                                                        }
                                                        disabled={isUpdatingStatus || statusWorkflow[order.status].length === 0}
                                                    >
                                                        <SelectTrigger
                                                            className={cn(statusColors[order.status])}
                                                        >
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {Object.entries(
                                                                ORDER_STATUS_LABELS
                                                            ).map(([value, label]) => (
                                                                <SelectItem
                                                                    key={value}
                                                                    value={value}
                                                                    disabled={!canTransitionTo(order.status, value as OrderStatus)}
                                                                >
                                                                    {label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell className="border-r">
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[order.priority]}`}
                                                    >
                                                        {ORDER_PRIORITY_LABELS[order.priority]}
                                                    </span>
                                                </TableCell>
                                                <TableCell className='w-auto'>
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                openViewDialog(order)
                                                            }
                                                            title="View"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                openEditDialog(order)
                                                            }
                                                            title="Edit"
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                openExtendDialog(order)
                                                            }
                                                            title="Extend Deadline"
                                                        >
                                                            <Calendar className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                openRevisionDialog(order)
                                                            }
                                                            title="Add Revision"
                                                        >
                                                            <RotateCcw className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                openTimelineDialog(order)
                                                            }
                                                            title="View Timeline"
                                                        >
                                                            <History className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => {
                                                                setSelectedOrder(order);
                                                                setIsDeleteDialogOpen(true);
                                                            }}
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </div>

                    {/* Pagination */}
                    {meta && meta.totalPages > 1 && (
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                                Page {meta.page} of {meta.totalPages} (
                                {meta.total} total)
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setPage((p) => Math.max(1, p - 1))
                                    }
                                    disabled={page === 1 || isFetching}
                                >
                                    <ChevronLeft />
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setPage((p) =>
                                            Math.min(meta.totalPages, p + 1)
                                        )
                                    }
                                    disabled={
                                        page === meta.totalPages || isFetching
                                    }
                                >
                                    Next
                                    <ChevronRight />
                                </Button>
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
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Order</DialogTitle>
                        <DialogDescription>
                            Update the order details
                        </DialogDescription>
                    </DialogHeader>
                    {editDefaultValues && (
                        <OrderForm
                            key={selectedOrder?._id}
                            defaultValues={editDefaultValues}
                            onSubmit={handleUpdateOrder}
                            isSubmitting={isUpdating}
                            submitLabel="Update Order"
                            onCancel={() => setIsEditDialogOpen(false)}
                            serverErrors={serverErrors}
                            isEditMode={true}
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
                                        Status
                                    </p>
                                    <Badge
                                        className={
                                            statusColors[selectedOrder.status]
                                        }
                                    >
                                        {ORDER_STATUS_LABELS[selectedOrder.status]}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        Order Date
                                    </p>
                                    <p className="font-medium">
                                        {format(
                                            new Date(selectedOrder.orderDate),
                                            'MMM dd, yyyy'
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
                                            'MMM dd, yyyy h:mm a'
                                        )}
                                    </p>
                                    {selectedOrder.originalDeadline && (
                                        <p className="text-xs text-muted-foreground">
                                            Original:{' '}
                                            {format(
                                                new Date(
                                                    selectedOrder.originalDeadline
                                                ),
                                                'MMM dd, yyyy'
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
                                            priorityColors[selectedOrder.priority]
                                        }
                                    >
                                        {ORDER_PRIORITY_LABELS[selectedOrder.priority]}
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
                                selectedOrder.revisionInstructions.length > 0 && (
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
                                                                new Date(rev.createdAt),
                                                                'MMM dd, yyyy h:mm a'
                                                            )}{' '}
                                                            by Admin
                                                        </p>
                                                    </div>
                                                )
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
                        setExtendReason('');
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
                                onChange={(e) => setExtendReason(e.target.value)}
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
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
                    if (!open) setRevisionInstruction('');
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
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
                        setStatusChangeNote('');
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
                                onChange={(e) => setStatusChangeNote(e.target.value)}
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
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
                            Are you sure you want to delete order{' '}
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
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            )}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
