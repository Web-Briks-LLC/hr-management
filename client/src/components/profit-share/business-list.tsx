'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
    IconEdit,
    IconTrash,
    IconBuilding,
    IconUser,
    IconPhone,
    IconMail,
} from '@tabler/icons-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    useGetBusinessesQuery,
    useUpdateBusinessMutation,
    useDeleteBusinessMutation,
    type IExternalBusiness,
} from '@/redux/features/externalBusiness/externalBusinessApi';

export function BusinessList() {
    const { data, isLoading } = useGetBusinessesQuery();
    const [updateBusiness, { isLoading: isUpdating }] =
        useUpdateBusinessMutation();
    const [deleteBusiness, { isLoading: isDeleting }] =
        useDeleteBusinessMutation();

    const [editingBusiness, setEditingBusiness] =
        useState<IExternalBusiness | null>(null);
    const [deletingBusiness, setDeletingBusiness] =
        useState<IExternalBusiness | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        contactPerson: '',
        phone: '',
        email: '',
        isActive: true,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleEdit = (business: IExternalBusiness) => {
        setEditingBusiness(business);
        setFormData({
            name: business.name,
            description: business.description || '',
            contactPerson: business.contactPerson || '',
            phone: business.phone || '',
            email: business.email || '',
            isActive: business.isActive,
        });
        setErrors({});
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name || formData.name.length < 2) {
            newErrors.name = 'Name must be at least 2 characters';
        }
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingBusiness || !validate()) return;

        try {
            const response = await updateBusiness({
                id: editingBusiness._id,
                data: formData,
            }).unwrap();
            toast.success(response.message);
            setEditingBusiness(null);
        } catch (error: unknown) {
            if (error && typeof error === 'object' && 'data' in error) {
                const err = error as { data?: { message?: string } };
                toast.error(err.data?.message || 'Failed to update business');
            } else {
                toast.error('Failed to update business');
            }
        }
    };

    const handleDelete = async () => {
        if (!deletingBusiness) return;
        try {
            const response = await deleteBusiness(deletingBusiness._id).unwrap();
            toast.success(response.message);
            setDeletingBusiness(null);
        } catch (error: unknown) {
            if (error && typeof error === 'object' && 'data' in error) {
                const err = error as { data?: { message?: string } };
                toast.error(err.data?.message || 'Failed to delete business');
            } else {
                toast.error('Failed to delete business');
            }
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                ))}
            </div>
        );
    }

    const businesses = data?.data || [];

    if (businesses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <IconBuilding className="size-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No businesses yet</h3>
                <p className="text-muted-foreground">
                    Add your first external business to start tracking profit
                    transfers.
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Business</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {businesses.map((business) => (
                            <TableRow key={business._id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                                            <IconBuilding className="size-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-medium">
                                                {business.name}
                                            </p>
                                            {business.description && (
                                                <p className="text-sm text-muted-foreground line-clamp-1">
                                                    {business.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="space-y-1 text-sm">
                                        {business.contactPerson && (
                                            <div className="flex items-center gap-1.5">
                                                <IconUser className="size-3.5 text-muted-foreground" />
                                                {business.contactPerson}
                                            </div>
                                        )}
                                        {business.phone && (
                                            <div className="flex items-center gap-1.5">
                                                <IconPhone className="size-3.5 text-muted-foreground" />
                                                {business.phone}
                                            </div>
                                        )}
                                        {business.email && (
                                            <div className="flex items-center gap-1.5">
                                                <IconMail className="size-3.5 text-muted-foreground" />
                                                {business.email}
                                            </div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant={
                                            business.isActive
                                                ? 'default'
                                                : 'secondary'
                                        }
                                    >
                                        {business.isActive
                                            ? 'Active'
                                            : 'Inactive'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {format(
                                        new Date(business.createdAt),
                                        'MMM dd, yyyy'
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEdit(business)}
                                        >
                                            <IconEdit className="size-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                                setDeletingBusiness(business)
                                            }
                                        >
                                            <IconTrash className="size-4 text-destructive" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Edit Dialog */}
            <Dialog
                open={!!editingBusiness}
                onOpenChange={(open) => !open && setEditingBusiness(null)}
            >
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Edit Business</DialogTitle>
                        <DialogDescription>
                            Update business information.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Business Name *</Label>
                            <Input
                                id="edit-name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                            />
                            {errors.name && (
                                <p className="text-sm text-destructive">{errors.name}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-description">Description</Label>
                            <Textarea
                                id="edit-description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-contactPerson">Contact Person</Label>
                                <Input
                                    id="edit-contactPerson"
                                    name="contactPerson"
                                    value={formData.contactPerson}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-phone">Phone</Label>
                                <Input
                                    id="edit-phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-email">Email</Label>
                            <Input
                                id="edit-email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                            />
                            {errors.email && (
                                <p className="text-sm text-destructive">{errors.email}</p>
                            )}
                        </div>

                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                                <Label>Active Status</Label>
                                <p className="text-sm text-muted-foreground">
                                    Inactive businesses won&apos;t appear in transfer options
                                </p>
                            </div>
                            <Switch
                                checked={formData.isActive}
                                onCheckedChange={(checked) =>
                                    setFormData((prev) => ({ ...prev, isActive: checked }))
                                }
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditingBusiness(null)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isUpdating}>
                                {isUpdating ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog
                open={!!deletingBusiness}
                onOpenChange={(open) => !open && setDeletingBusiness(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Business</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{deletingBusiness?.name}&quot;?
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
