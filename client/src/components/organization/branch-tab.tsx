'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Search, Plus, Pencil, Trash2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import {
    useGetAllBranchesQuery,
    useUpdateBranchMutation,
    useDeleteBranchMutation,
} from '@/redux/features/branch/branchApi';
import { IBranch } from '@/types/branch.type';
import CreateBranchDialog from './create-branch-dialog';
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

export default function BranchTab() {
    const [search, setSearch] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState<IBranch | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const { data, isLoading } = useGetAllBranchesQuery(undefined);
    const branches: IBranch[] = data?.branches || [];

    const [updateBranch] = useUpdateBranchMutation();
    const [deleteBranch, { isLoading: isDeleting }] = useDeleteBranchMutation();

    const filteredBranches = branches.filter((b) =>
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        (b.code && b.code.toLowerCase().includes(search.toLowerCase())) ||
        (b.address && b.address.toLowerCase().includes(search.toLowerCase()))
    );

    const handleToggleStatus = async (branch: IBranch) => {
        try {
            await updateBranch({
                id: branch._id,
                data: { isActive: !branch.isActive },
            }).unwrap();
            toast.success(`Branch ${!branch.isActive ? 'activated' : 'deactivated'}`);
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to update status');
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteBranch(deleteId).unwrap();
            toast.success('Branch deleted successfully');
            setDeleteId(null);
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to delete branch');
        }
    };

    return (
        <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search branches..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <Button
                    onClick={() => {
                        setSelectedBranch(null);
                        setDialogOpen(true);
                    }}
                    className="w-full sm:w-auto"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Branch
                </Button>
            </div>

            {/* Branch List */}
            {isLoading ? (
                <div className="flex items-center justify-center min-h-[250px]">
                    <Spinner />
                </div>
            ) : filteredBranches.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center bg-muted/20">
                    <MapPin className="h-10 w-10 text-muted-foreground/50 mb-3" />
                    <h3 className="font-semibold text-lg">No branches found</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
                        {search ? 'Try adjusting your search query.' : 'Get started by creating your first branch.'}
                    </p>
                    {!search && (
                        <Button
                            onClick={() => {
                                setSelectedBranch(null);
                                setDialogOpen(true);
                            }}
                            size="sm"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Create Branch
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredBranches.map((branch) => (
                        <div
                            key={branch._id}
                            className="group relative flex flex-col justify-between p-4 rounded-xl border bg-card hover:shadow-md hover:border-primary/20 transition-all"
                        >
                            <div className="space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-base tracking-tight">
                                                {branch.name}
                                            </h4>
                                            {branch.code && (
                                                <Badge variant="outline" className="font-mono text-xs">
                                                    {branch.code}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <Badge variant={branch.isActive ? 'default' : 'secondary'}>
                                        {branch.isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>

                                {branch.address && (
                                    <div className="flex items-start gap-1.5 text-xs text-muted-foreground pt-1">
                                        <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                        <span className="line-clamp-2">{branch.address}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-4 mt-4 border-t text-xs">
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={branch.isActive}
                                        onCheckedChange={() => handleToggleStatus(branch)}
                                        className="scale-75 origin-left"
                                    />
                                    <span className="text-muted-foreground font-medium">Status</span>
                                </div>

                                <div className="flex items-center gap-1">
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8"
                                        onClick={() => {
                                            setSelectedBranch(branch);
                                            setDialogOpen(true);
                                        }}
                                    >
                                        <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                    </Button>

                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                        onClick={() => setDeleteId(branch._id)}
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
            <CreateBranchDialog
                open={dialogOpen}
                setOpen={setDialogOpen}
                editBranch={selectedBranch}
            />

            {/* Delete Confirmation Alert */}
            <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the branch. Shifts and staff associated with this branch may be affected.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? <Spinner /> : 'Delete Branch'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
