'use client';

import { useEffect, useState, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    useCreateShareholderMutation,
    useUpdateShareholderMutation,
    type IShareholder,
} from '@/redux/features/profitShare/profitShareApi';
import { useGetStaffsQuery } from '@/redux/features/staff/staffApi';
import { Loader, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface AddShareholderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingShareholder: IShareholder | null;
    onClose: () => void;
    remainingPercentage: number;
}

// Admin roles that can be shareholders
const ADMIN_ROLES = ['super_admin', 'admin'];

export default function AddShareholderDialog({
    open,
    onOpenChange,
    editingShareholder,
    onClose,
    remainingPercentage,
}: AddShareholderDialogProps) {
    const [createShareholder, { isLoading: isCreating }] =
        useCreateShareholderMutation();
    const [updateShareholder, { isLoading: isUpdating }] =
        useUpdateShareholderMutation();
    const { data: staffData, isLoading: isLoadingStaff } = useGetStaffsQuery(
        {},
    );

    const [selectedAdmin, setSelectedAdmin] = useState<string>('');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        percentage: '',
        isActive: true,
    });

    const isEditing = !!editingShareholder;
    const isLoading = isCreating || isUpdating;

    // Memoize admins to prevent infinite loop - filter admins from staffData
    const admins = useMemo(() => {
        return (staffData?.staffs || []).filter((staff: any) =>
            ADMIN_ROLES.includes(staff.user?.role),
        );
    }, [staffData?.staffs]);

    // Populate form when editing
    useEffect(() => {
        if (editingShareholder) {
            setFormData({
                name: editingShareholder.name,
                email: editingShareholder.email,
                percentage: editingShareholder.percentage.toString(),
                isActive: editingShareholder.isActive,
            });
            setSelectedAdmin('');
        } else {
            setFormData({
                name: '',
                email: '',
                percentage: '',
                isActive: true,
            });
            setSelectedAdmin('');
        }
    }, [editingShareholder]);

    // When admin is selected, populate name and email from user object
    useEffect(() => {
        if (selectedAdmin && !isEditing) {
            const admin = admins.find((a: any) => a._id === selectedAdmin);
            if (admin) {
                setFormData((prev) => ({
                    ...prev,
                    name: admin.user?.name || '',
                    email: admin.user?.email || '',
                }));
            }
        }
        // Only run when selectedAdmin changes, admins is now memoized so it won't cause re-runs
    }, [selectedAdmin, isEditing, admins]);

    const maxPercentage = isEditing
        ? remainingPercentage + (editingShareholder?.percentage || 0)
        : remainingPercentage;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const percentage = parseFloat(formData.percentage);
        if (isNaN(percentage) || percentage <= 0) {
            toast.error('Please enter a valid percentage');
            return;
        }

        if (percentage > maxPercentage) {
            toast.error(
                `Maximum allowed percentage is ${maxPercentage.toFixed(2)}%`,
            );
            return;
        }

        try {
            if (isEditing && editingShareholder) {
                await updateShareholder({
                    id: editingShareholder._id,
                    data: {
                        name: formData.name,
                        email: formData.email,
                        percentage,
                        isActive: formData.isActive,
                    },
                }).unwrap();
                toast.success('Shareholder updated successfully');
            } else {
                await createShareholder({
                    name: formData.name,
                    email: formData.email,
                    percentage,
                }).unwrap();
                toast.success('Shareholder added successfully');
            }

            onClose();
        } catch (err: any) {
            toast.error(
                err?.data?.message ||
                    `Failed to ${isEditing ? 'update' : 'add'} shareholder`,
            );
        }
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            onClose();
        }
        onOpenChange(newOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            {!isEditing && (
                <DialogTrigger asChild>
                    <Button className="gap-2">
                        <UserPlus className="h-4 w-4" />
                        Add Shareholder
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? 'Edit Shareholder' : 'Add Shareholder'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? 'Update shareholder details and percentage allocation'
                            : 'Select an admin to add as a shareholder with their profit share percentage'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Admin Selection - Only show when adding new */}
                    {!isEditing && (
                        <div className="space-y-2">
                            <Label htmlFor="admin-select">Select Admin *</Label>
                            <Select
                                value={selectedAdmin}
                                onValueChange={setSelectedAdmin}
                            >
                                <SelectTrigger
                                    id="admin-select"
                                    className="w-full"
                                >
                                    <SelectValue
                                        placeholder={
                                            isLoadingStaff
                                                ? 'Loading admins...'
                                                : 'Select an admin'
                                        }
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {admins.length === 0 ? (
                                        <div className="p-2 text-sm text-muted-foreground text-center">
                                            No admins found
                                        </div>
                                    ) : (
                                        admins.map((admin: any) => (
                                            <SelectItem
                                                key={admin._id}
                                                value={admin._id}
                                            >
                                                <div className="flex flex-col items-start">
                                                    <span className="font-medium">
                                                        {admin.user?.name ||
                                                            'Unknown'}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {admin.user?.email} •{' '}
                                                        {(
                                                            admin.user?.role ||
                                                            ''
                                                        ).replace('_', ' ')}
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Show name and email as read-only when admin is selected */}
                    {(selectedAdmin || isEditing) && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            name: e.target.value,
                                        })
                                    }
                                    placeholder="Name"
                                    readOnly={!isEditing && !!selectedAdmin}
                                    className={
                                        !isEditing && selectedAdmin
                                            ? 'bg-muted'
                                            : ''
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            email: e.target.value,
                                        })
                                    }
                                    placeholder="Email"
                                    readOnly={!isEditing && !!selectedAdmin}
                                    className={
                                        !isEditing && selectedAdmin
                                            ? 'bg-muted'
                                            : ''
                                    }
                                />
                            </div>
                        </>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="percentage">
                            Share Percentage * (Max: {maxPercentage.toFixed(2)}
                            %)
                        </Label>
                        <div className="relative">
                            <Input
                                id="percentage"
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={maxPercentage}
                                value={formData.percentage}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        percentage: e.target.value,
                                    })
                                }
                                placeholder="25.00"
                                className="pr-8"
                                required
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                %
                            </span>
                        </div>
                    </div>

                    {isEditing && (
                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                                <Label htmlFor="isActive">Active Status</Label>
                                <p className="text-sm text-muted-foreground">
                                    Inactive shareholders don&apos;t receive
                                    distributions
                                </p>
                            </div>
                            <Switch
                                id="isActive"
                                checked={formData.isActive}
                                onCheckedChange={(checked) =>
                                    setFormData({
                                        ...formData,
                                        isActive: checked,
                                    })
                                }
                            />
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                isLoading || (!isEditing && !selectedAdmin)
                            }
                            className="gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader className="h-4 w-4 animate-spin" />
                                    {isEditing ? 'Updating...' : 'Adding...'}
                                </>
                            ) : isEditing ? (
                                'Update Shareholder'
                            ) : (
                                'Add Shareholder'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
