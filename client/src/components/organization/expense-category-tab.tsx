'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, Pencil, Trash2, Tags } from 'lucide-react';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import {
    useGetExpenseCategoriesQuery,
    useDeleteExpenseCategoryMutation,
    type ExpenseCategory,
} from '@/redux/features/expense/expenseApi';
import CreateExpenseCategoryDialog from './create-expense-category-dialog';
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

export default function ExpenseCategoryTab() {
    const [search, setSearch] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const { data, isLoading } = useGetExpenseCategoriesQuery(undefined);
    const categories: ExpenseCategory[] = data || [];

    const [deleteCategory, { isLoading: isDeleting }] = useDeleteExpenseCategoryMutation();

    const filteredCategories = categories.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteCategory(deleteId).unwrap();
            toast.success('Category deleted successfully');
            setDeleteId(null);
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to delete category');
        }
    };

    return (
        <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search categories..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <Button
                    onClick={() => {
                        setSelectedCategory(null);
                        setDialogOpen(true);
                    }}
                    className="w-full sm:w-auto"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                </Button>
            </div>

            {/* Category List */}
            {isLoading ? (
                <div className="flex items-center justify-center min-h-[250px]">
                    <Spinner />
                </div>
            ) : filteredCategories.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center bg-muted/20">
                    <Tags className="h-10 w-10 text-muted-foreground/50 mb-3" />
                    <h3 className="font-semibold text-lg">No categories found</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
                        {search ? 'Try adjusting your search query.' : 'Get started by creating your first expense category.'}
                    </p>
                    {!search && (
                        <Button
                            onClick={() => {
                                setSelectedCategory(null);
                                setDialogOpen(true);
                            }}
                            size="sm"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Create Category
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCategories.map((cat) => (
                        <div
                            key={cat._id}
                            className="group relative flex flex-col justify-between p-4 rounded-xl border bg-card hover:shadow-md hover:border-primary/20 transition-all"
                        >
                            <div className="space-y-2">
                                <h4 className="font-semibold text-base tracking-tight">
                                    {cat.name}
                                </h4>
                                {cat.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                        {cat.description}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center justify-end pt-4 mt-4 border-t text-xs">
                                <div className="flex items-center gap-1">
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8"
                                        onClick={() => {
                                            setSelectedCategory(cat);
                                            setDialogOpen(true);
                                        }}
                                    >
                                        <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                    </Button>

                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                        onClick={() => setDeleteId(cat._id)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create / Edit Dialog */}
            <CreateExpenseCategoryDialog
                open={dialogOpen}
                setOpen={setDialogOpen}
                editCategory={selectedCategory}
            />

            {/* Delete Confirmation Alert */}
            <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove the category from the active list. Expenses already recorded under it are not affected.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? <Spinner /> : 'Delete Category'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
