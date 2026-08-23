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
    useCreateReturnFileFormatMutation,
    useUpdateReturnFileFormatMutation,
} from '@/redux/features/returnFileFormat/returnFileFormatApi';
import type { IReturnFileFormat } from '@/types/order.type';

interface CreateReturnFileFormatDialogProps {
    open: boolean;
    setOpen: (v: boolean) => void;
    editFormat?: IReturnFileFormat | null;
}

export default function CreateReturnFileFormatDialog({
    open,
    setOpen,
    editFormat,
}: CreateReturnFileFormatDialogProps) {
    const [name, setName] = useState('');
    const [extension, setExtension] = useState('');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(true);

    const [createFormat, { isLoading: isCreating }] =
        useCreateReturnFileFormatMutation();
    const [updateFormat, { isLoading: isUpdating }] =
        useUpdateReturnFileFormatMutation();

    const isLoading = isCreating || isUpdating;

    useEffect(() => {
        if (editFormat) {
            setName(editFormat.name || '');
            setExtension(editFormat.extension || '');
            setDescription(editFormat.description || '');
            setIsActive(editFormat.isActive ?? true);
        } else {
            setName('');
            setExtension('');
            setDescription('');
            setIsActive(true);
        }
    }, [editFormat, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !extension.trim()) {
            toast.error('Format name and extension are required');
            return;
        }

        try {
            if (editFormat) {
                await updateFormat({
                    id: editFormat._id,
                    data: {
                        name: name.trim(),
                        extension: extension.trim().replace(/^\./, ''),
                        description: description.trim(),
                        isActive,
                    },
                }).unwrap();
                toast.success('File format updated successfully');
            } else {
                await createFormat({
                    name: name.trim(),
                    extension: extension.trim().replace(/^\./, ''),
                    description: description.trim(),
                }).unwrap();
                toast.success('File format created successfully');
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
                        {editFormat ? 'Edit File Format' : 'Create New File Format'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="grid gap-2">
                        <Label htmlFor="fmt-name">Format Name *</Label>
                        <Input
                            id="fmt-name"
                            placeholder="e.g. JPEG Image"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="fmt-ext">Extension *</Label>
                        <Input
                            id="fmt-ext"
                            placeholder="e.g. jpg"
                            value={extension}
                            onChange={(e) => setExtension(e.target.value.toLowerCase())}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="fmt-desc">Description</Label>
                        <Textarea
                            id="fmt-desc"
                            placeholder="Brief description..."
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    {editFormat && (
                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <Label htmlFor="fmt-status" className="cursor-pointer">
                                Active Status
                            </Label>
                            <Switch
                                id="fmt-status"
                                checked={isActive}
                                onCheckedChange={setIsActive}
                            />
                        </div>
                    )}

                    <Button type="submit" disabled={isLoading} className="w-full">
                        {isLoading ? <Spinner /> : editFormat ? 'Save Changes' : 'Create File Format'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
