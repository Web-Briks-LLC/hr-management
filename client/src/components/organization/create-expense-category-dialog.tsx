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
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import {
    useCreateExpenseCategoryMutation,
    useUpdateExpenseCategoryMutation,
    type ExpenseCategory,
} from '@/redux/features/expense/expenseApi';

interface CreateExpenseCategoryDialogProps {
    open: boolean;
    setOpen: (v: boolean) => void;
    editCategory?: ExpenseCategory | null;
}

export default function CreateExpenseCategoryDialog({
    open,
    setOpen,
    editCategory,
}: CreateExpenseCategoryDialogProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const [createCategory, { isLoading: isCreating }] =
        useCreateExpenseCategoryMutation();
    const [updateCategory, { isLoading: isUpdating }] =
        useUpdateExpenseCategoryMutation();

    const isLoading = isCreating || isUpdating;

    useEffect(() => {
        if (editCategory) {
            setName(editCategory.name || '');
            setDescription(editCategory.description || '');
        } else {
            setName('');
            setDescription('');
        }
    }, [editCategory, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('Category name is required');
            return;
        }

        try {
            if (editCategory) {
                await updateCategory({
                    id: editCategory._id,
                    name: name.trim(),
                    description: description.trim(),
                }).unwrap();
                toast.success('Category updated successfully');
            } else {
                await createCategory({
                    name: name.trim(),
                    description: description.trim(),
                }).unwrap();
                toast.success('Category created successfully');
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
                        {editCategory ? 'Edit Category' : 'Create New Category'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="grid gap-2">
                        <Label htmlFor="cat-name">Category Name *</Label>
                        <Input
                            id="cat-name"
                            placeholder="e.g. Office Supplies"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="cat-desc">Description</Label>
                        <Textarea
                            id="cat-desc"
                            placeholder="Brief description..."
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <Button type="submit" disabled={isLoading} className="w-full">
                        {isLoading ? <Spinner /> : editCategory ? 'Save Changes' : 'Create Category'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
