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
    useCreateDepartmentMutation,
    useUpdateDepartmentMutation,
} from '@/redux/features/department/departmentApi';
import { IDepartment } from '@/types/department.type';

interface CreateDepartmentDialogProps {
    open: boolean;
    setOpen: (v: boolean) => void;
    editDepartment?: IDepartment | null;
}

export default function CreateDepartmentDialog({
    open,
    setOpen,
    editDepartment,
}: CreateDepartmentDialogProps) {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(true);

    const [createDepartment, { isLoading: isCreating }] =
        useCreateDepartmentMutation();
    const [updateDepartment, { isLoading: isUpdating }] =
        useUpdateDepartmentMutation();

    const isLoading = isCreating || isUpdating;

    useEffect(() => {
        if (editDepartment) {
            setName(editDepartment.name || '');
            setCode(editDepartment.code || '');
            setDescription(editDepartment.description || '');
            setIsActive(editDepartment.isActive ?? true);
        } else {
            setName('');
            setCode('');
            setDescription('');
            setIsActive(true);
        }
    }, [editDepartment, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('Department name is required');
            return;
        }

        try {
            if (editDepartment) {
                await updateDepartment({
                    id: editDepartment._id,
                    data: {
                        name: name.trim(),
                        code: code.trim().toUpperCase(),
                        description: description.trim(),
                        isActive,
                    },
                }).unwrap();
                toast.success('Department updated successfully');
            } else {
                await createDepartment({
                    name: name.trim(),
                    code: code.trim().toUpperCase(),
                    description: description.trim(),
                    isActive,
                }).unwrap();
                toast.success('Department created successfully');
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
                        {editDepartment ? 'Edit Department' : 'Create New Department'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="grid gap-2">
                        <Label htmlFor="dep-name">Department Name *</Label>
                        <Input
                            id="dep-name"
                            placeholder="e.g. Information Technology"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="dep-code">Code</Label>
                        <Input
                            id="dep-code"
                            placeholder="e.g. IT"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="dep-desc">Description</Label>
                        <Textarea
                            id="dep-desc"
                            placeholder="Brief description..."
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <Label htmlFor="dep-status" className="cursor-pointer">
                            Active Status
                        </Label>
                        <Switch
                            id="dep-status"
                            checked={isActive}
                            onCheckedChange={setIsActive}
                        />
                    </div>

                    <Button type="submit" disabled={isLoading} className="w-full">
                        {isLoading ? <Spinner /> : editDepartment ? 'Save Changes' : 'Create Department'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
