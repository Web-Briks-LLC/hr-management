'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import {
    useCreateBranchMutation,
    useUpdateBranchMutation,
} from '@/redux/features/branch/branchApi';
import { IBranch } from '@/types/branch.type';

interface CreateBranchDialogProps {
    open: boolean;
    setOpen: (v: boolean) => void;
    editBranch?: IBranch | null;
}

export default function CreateBranchDialog({
    open,
    setOpen,
    editBranch,
}: CreateBranchDialogProps) {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [address, setAddress] = useState('');
    const [isActive, setIsActive] = useState(true);

    const [createBranch, { isLoading: isCreating }] =
        useCreateBranchMutation();
    const [updateBranch, { isLoading: isUpdating }] =
        useUpdateBranchMutation();

    const isLoading = isCreating || isUpdating;

    useEffect(() => {
        if (editBranch) {
            setName(editBranch.name || '');
            setCode(editBranch.code || '');
            setAddress(editBranch.address || '');
            setIsActive(editBranch.isActive ?? true);
        } else {
            setName('');
            setCode('');
            setAddress('');
            setIsActive(true);
        }
    }, [editBranch, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('Branch name is required');
            return;
        }
        if (!code.trim()) {
            toast.error('Branch code is required');
            return;
        }

        try {
            if (editBranch) {
                await updateBranch({
                    id: editBranch._id,
                    data: {
                        name: name.trim(),
                        code: code.trim().toUpperCase(),
                        address: address.trim(),
                        isActive,
                    },
                }).unwrap();
                toast.success('Branch updated successfully');
            } else {
                await createBranch({
                    name: name.trim(),
                    code: code.trim().toUpperCase(),
                    address: address.trim(),
                    isActive,
                }).unwrap();
                toast.success('Branch created successfully');
            }

            setOpen(false);
        } catch (err: any) {
            toast.error(err?.data?.message || 'Action failed');
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>
                        {editBranch ? 'Edit Branch' : 'Create New Branch'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="grid gap-2">
                        <Label htmlFor="branch-name">Branch Name *</Label>
                        <Input
                            id="branch-name"
                            placeholder="e.g. Dhaka Main Branch"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="branch-code">Code *</Label>
                        <Input
                            id="branch-code"
                            placeholder="e.g. DHK"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="branch-address">Address</Label>
                        <Textarea
                            id="branch-address"
                            placeholder="Branch location/address..."
                            rows={3}
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <Label htmlFor="branch-status" className="cursor-pointer">
                            Active Status
                        </Label>
                        <Switch
                            id="branch-status"
                            checked={isActive}
                            onCheckedChange={setIsActive}
                        />
                    </div>

                    <Button type="submit" disabled={isLoading} className="w-full">
                        {isLoading ? <Spinner /> : editBranch ? 'Save Changes' : 'Create Branch'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
