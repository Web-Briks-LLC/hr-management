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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import {
    useCreateDesignationMutation,
    useUpdateDesignationMutation,
} from '@/redux/features/designation/designationApi';
import { useGetAllDepartmentsQuery } from '@/redux/features/department/departmentApi';
import { IDesignation } from '@/types/designation.type';
import { IDepartment } from '@/types/department.type';

interface CreateDesignationDialogProps {
    open: boolean;
    setOpen: (v: boolean) => void;
    editDesignation?: IDesignation | null;
}

export default function CreateDesignationDialog({
    open,
    setOpen,
    editDesignation,
}: CreateDesignationDialogProps) {
    const [title, setTitle] = useState('');
    const [code, setCode] = useState('');
    const [departmentId, setDepartmentId] = useState('');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(true);

    const { data: depData } = useGetAllDepartmentsQuery(undefined);
    const departments: IDepartment[] = depData?.departments || [];

    const [createDesignation, { isLoading: isCreating }] =
        useCreateDesignationMutation();
    const [updateDesignation, { isLoading: isUpdating }] =
        useUpdateDesignationMutation();

    const isLoading = isCreating || isUpdating;

    useEffect(() => {
        if (editDesignation) {
            setTitle(editDesignation.title || '');
            setCode(editDesignation.code || '');
            const dep = typeof editDesignation.departmentId === 'object'
                ? editDesignation.departmentId?._id
                : editDesignation.departmentId;
            setDepartmentId(dep || '');
            setDescription(editDesignation.description || '');
            setIsActive(editDesignation.isActive ?? true);
        } else {
            setTitle('');
            setCode('');
            setDepartmentId('');
            setDescription('');
            setIsActive(true);
        }
    }, [editDesignation, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            toast.error('Designation title is required');
            return;
        }

        try {
            const payload: any = {
                title: title.trim(),
                code: code.trim().toUpperCase(),
                description: description.trim(),
                isActive,
            };
            if (departmentId) {
                payload.departmentId = departmentId;
            }

            if (editDesignation) {
                await updateDesignation({
                    id: editDesignation._id,
                    data: payload,
                }).unwrap();
                toast.success('Designation updated successfully');
            } else {
                await createDesignation(payload).unwrap();
                toast.success('Designation created successfully');
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
                        {editDesignation ? 'Edit Designation' : 'Create New Designation'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="grid gap-2">
                        <Label htmlFor="des-title">Designation Title *</Label>
                        <Input
                            id="des-title"
                            placeholder="e.g. Senior Software Engineer"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="des-code">Code</Label>
                        <Input
                            id="des-code"
                            placeholder="e.g. SWE"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="des-department">Department (Optional)</Label>
                        <Select value={departmentId} onValueChange={setDepartmentId}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None / Global</SelectItem>
                                {departments.map((d) => (
                                    <SelectItem key={d._id} value={d._id}>
                                        {d.name} {d.code ? `(${d.code})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="des-desc">Description</Label>
                        <Textarea
                            id="des-desc"
                            placeholder="Brief description..."
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <Label htmlFor="des-status" className="cursor-pointer">
                            Active Status
                        </Label>
                        <Switch
                            id="des-status"
                            checked={isActive}
                            onCheckedChange={setIsActive}
                        />
                    </div>

                    <Button type="submit" disabled={isLoading} className="w-full">
                        {isLoading ? <Spinner /> : editDesignation ? 'Save Changes' : 'Create Designation'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
