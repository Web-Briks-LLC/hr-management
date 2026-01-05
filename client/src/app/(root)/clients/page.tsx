'use client';

import { useState } from 'react';
import {
    useGetClientsQuery,
    useCreateClientMutation,
    useUpdateClientMutation,
    useDeleteClientMutation,
} from '@/redux/features/client/clientApi';
import type { Client } from '@/types/client.type';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import { Loader2, ChevronLeft, ChevronRight, Plus, Trash2, Edit2, Users, Eye } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ClientForm, type ClientFormData } from '@/components/client/ClientForm';
import { ScrollArea } from '@/components/ui/scroll-area';

const statusOptions = [
    { value: 'active', label: 'Active', color: 'text-green-600 bg-green-100' },
    { value: 'inactive', label: 'Inactive', color: 'text-gray-600 bg-gray-100' },
];

const perPageOptions = [10, 25, 50, 100];

interface ApiErrorResponse {
    data?: {
        message?: string;
        errors?: Record<string, string[]>;
    };
}

export default function ClientsPage() {
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({
        search: '',
        status: '',
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc' as 'asc' | 'desc',
    });
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);

    // Server errors state for displaying in forms
    const [createServerErrors, setCreateServerErrors] = useState<Record<string, string[]> | undefined>(undefined);
    const [updateServerErrors, setUpdateServerErrors] = useState<Record<string, string[]> | undefined>(undefined);

    // Default form values for edit
    const [editDefaultValues, setEditDefaultValues] = useState<ClientFormData | undefined>(undefined);

    // Queries
    const { data: clientData, isLoading, isFetching } = useGetClientsQuery({
        ...filters,
        page,
    });

    // Mutations
    const [createClient, { isLoading: isCreating }] = useCreateClientMutation();
    const [updateClient, { isLoading: isUpdating }] = useUpdateClientMutation();
    const [deleteClient, { isLoading: isDeleting }] = useDeleteClientMutation();

    const clients = clientData?.clients || [];
    const pagination = clientData?.pagination;

    const handleFilterChange = (key: string, value: string | number) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
        setPage(1);
    };

    const handleCreateClient = async (data: ClientFormData) => {
        setCreateServerErrors(undefined);
        try {
            await createClient(data).unwrap();
            toast.success('Client created successfully');
            setIsAddDialogOpen(false);
        } catch (error: unknown) {
            const err = error as ApiErrorResponse;
            // Check if it's a validation error with field errors
            if (err?.data?.errors) {
                setCreateServerErrors(err.data.errors);
            } else {
                toast.error(err?.data?.message || 'Failed to create client');
            }
        }
    };

    const handleUpdateClient = async (data: ClientFormData) => {
        if (!selectedClient) return;
        setUpdateServerErrors(undefined);
        try {
            await updateClient({
                id: selectedClient._id,
                ...data,
            }).unwrap();
            toast.success('Client updated successfully');
            setIsEditDialogOpen(false);
            setSelectedClient(null);
        } catch (error: unknown) {
            const err = error as ApiErrorResponse;
            // Check if it's a validation error with field errors
            if (err?.data?.errors) {
                setUpdateServerErrors(err.data.errors);
            } else {
                toast.error(err?.data?.message || 'Failed to update client');
            }
        }
    };

    const handleDeleteClient = async () => {
        if (!selectedClient) return;
        try {
            await deleteClient(selectedClient._id).unwrap();
            toast.success('Client deleted successfully');
            setIsDeleteDialogOpen(false);
            setSelectedClient(null);
        } catch (error: unknown) {
            const err = error as ApiErrorResponse;
            toast.error(err?.data?.message || 'Failed to delete client');
        }
    };

    const openEditDialog = (client: Client) => {
        setSelectedClient(client);
        setUpdateServerErrors(undefined);
        setEditDefaultValues({
            clientId: client.clientId,
            name: client.name,
            email: client.email,
            phone: client.phone || '',
            address: client.address || '',
            officeAddress: client.officeAddress || '',
            description: client.description || '',
            currency: client.currency || '',
            status: client.status,
        });
        setIsEditDialogOpen(true);
    };

    const handleAddDialogChange = (open: boolean) => {
        setIsAddDialogOpen(open);
        if (!open) {
            setCreateServerErrors(undefined);
        }
    };

    const handleEditDialogChange = (open: boolean) => {
        setIsEditDialogOpen(open);
        if (!open) {
            setUpdateServerErrors(undefined);
        }
    };

    return (
        <div className="space-y-6">
            {/* Stats Card */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{pagination?.total || 0}</div>
                </CardContent>
            </Card>

            {/* Main Card */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className='text-2xl'>Client Management</CardTitle>
                        <CardDescription>Manage your clients and their information</CardDescription>
                    </div>
                    <Dialog open={isAddDialogOpen} onOpenChange={handleAddDialogChange}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus />
                                Add Client
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Add New Client</DialogTitle>
                                <DialogDescription>Fill in the details to add a new client</DialogDescription>
                            </DialogHeader>
                            <ClientForm
                                onSubmit={handleCreateClient}
                                isSubmitting={isCreating}
                                submitLabel="Create"
                                onCancel={() => setIsAddDialogOpen(false)}
                                serverErrors={createServerErrors}
                            />
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                        <Input
                            placeholder="Search by name, email, or ID..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            className='w-full'
                        />
                        <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="All statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                {statusOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={filters.limit.toString()}
                            onValueChange={(value) => handleFilterChange('limit', parseInt(value))}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {perPageOptions.map((opt) => (
                                    <SelectItem key={opt} value={opt.toString()}>
                                        {opt} per page
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setFilters({
                                    search: '',
                                    status: '',
                                    limit: 10,
                                    sortBy: 'createdAt',
                                    sortOrder: 'desc',
                                });
                                setPage(1);
                            }}
                        >
                            Clear Filters
                        </Button>
                    </div>

                    {/* Table */}
                    <div className='border'>
                        {isLoading ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className='border-r text-center'>Client ID</TableHead>
                                        <TableHead className='border-r text-center'>Name</TableHead>
                                        <TableHead className='border-r text-center'>Email</TableHead>
                                        <TableHead className='border-r text-center'>Phone</TableHead>
                                        <TableHead className='border-r text-center'>Status</TableHead>
                                        <TableHead className="text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {[...Array(5)].map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell className='border-r'><Skeleton className="h-4 w-20" /></TableCell>
                                            <TableCell className='border-r'><Skeleton className="h-4 w-32" /></TableCell>
                                            <TableCell className='border-r'><Skeleton className="h-4 w-40" /></TableCell>
                                            <TableCell className='border-r'><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell className='border-r'><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
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
                                        <TableHead className='border-r text-center'>Client ID</TableHead>
                                        <TableHead className='border-r text-center'>Name</TableHead>
                                        <TableHead className='border-r text-center'>Email</TableHead>
                                        <TableHead className='border-r text-center'>Phone</TableHead>
                                        <TableHead className='border-r text-center'>Status</TableHead>
                                        <TableHead className="text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {clients.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                No clients found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        clients.map((client: Client) => {
                                            const statusOpt = statusOptions.find((s) => s.value === client.status);
                                            return (
                                                <TableRow key={client._id}>
                                                    <TableCell className='border-r font-mono'>{client.clientId}</TableCell>
                                                    <TableCell className="font-medium border-r">{client.name}</TableCell>
                                                    <TableCell className='border-r'>{client.email}</TableCell>
                                                    <TableCell className='border-r'>{client.phone || '-'}</TableCell>
                                                    <TableCell className='border-r text-center'>
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusOpt?.color}`}>
                                                            {statusOpt?.label}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                asChild
                                                            >
                                                                <Link href={`/clients/${client._id}`}>
                                                                    <Eye className="h-4 w-4" />
                                                                </Link>
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => openEditDialog(client)}
                                                            >
                                                                <Edit2 />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => {
                                                                    setSelectedClient(client);
                                                                    setIsDeleteDialogOpen(true);
                                                                }}
                                                            >
                                                                <Trash2 className="text-destructive" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </div>

                    {/* Pagination */}
                    {pagination && pagination.pages > 1 && (
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                                Page {pagination.page} of {pagination.pages} ({pagination.total} total)
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1 || isFetching}
                                >
                                    <ChevronLeft />
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                                    disabled={page === pagination.pages || isFetching}
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
            <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogChange}>
                <DialogContent className="max-w-md ">
                    <DialogHeader>
                        <DialogTitle>Edit Client</DialogTitle>
                        <DialogDescription>Update the client details</DialogDescription>
                    </DialogHeader>
                    {editDefaultValues && (
                        <ClientForm
                            key={selectedClient?._id}
                            defaultValues={editDefaultValues}
                            onSubmit={handleUpdateClient}
                            isSubmitting={isUpdating}
                            submitLabel="Update"
                            onCancel={() => setIsEditDialogOpen(false)}
                            serverErrors={updateServerErrors}
                            isEditMode={true}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Client</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>{selectedClient?.name}</strong>? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteClient}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isDeleting}
                        >
                            {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
