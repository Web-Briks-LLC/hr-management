'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Search, Plus, Pencil, Trash2, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import {
    useGetAllDesignationsQuery,
    useUpdateDesignationMutation,
    useDeleteDesignationMutation,
} from '@/redux/features/designation/designationApi';
import { IDesignation } from '@/types/designation.type';
import CreateDesignationDialog from './create-designation-dialog';
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

export default function DesignationTab() {
    const [search, setSearch] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedDes, setSelectedDes] = useState<IDesignation | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const { data, isLoading } = useGetAllDesignationsQuery(undefined);
    const designations: IDesignation[] = data?.designations || [];

    const [updateDesignation] = useUpdateDesignationMutation();
    const [deleteDesignation, { isLoading: isDeleting }] = useDeleteDesignationMutation();

    const filteredDesignations = designations.filter((d) =>
        d.title.toLowerCase().includes(search.toLowerCase()) ||
        (d.code && d.code.toLowerCase().includes(search.toLowerCase()))
    );

    const handleToggleStatus = async (des: IDesignation) => {
        try {
            await updateDesignation({
                id: des._id,
                data: { isActive: !des.isActive },
            }).unwrap();
            toast.success(`Designation ${!des.isActive ? 'activated' : 'deactivated'}`);
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to update status');
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteDesignation(deleteId).unwrap();
            toast.success('Designation deleted successfully');
            setDeleteId(null);
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to delete designation');
        }
    };

    return (
        <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search designations..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <Button
                    onClick={() => {
                        setSelectedDes(null);
                        setDialogOpen(true);
                    }}
                    className="w-full sm:w-auto"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Designation
                </Button>
            </div>

            {/* Designation List */}
            {isLoading ? (
                <div className="flex items-center justify-center min-h-[250px]">
                    <Spinner />
                </div>
            ) : filteredDesignations.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center bg-muted/20">
                    <Briefcase className="h-10 w-10 text-muted-foreground/50 mb-3" />
                    <h3 className="font-semibold text-lg">No designations found</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
                        {search ? 'Try adjusting your search query.' : 'Get started by creating your first designation.'}
                    </p>
                    {!search && (
                        <Button
                            onClick={() => {
                                setSelectedDes(null);
                                setDialogOpen(true);
                            }}
                            size="sm"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Create Designation
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDesignations.map((des) => {
                        const depName = typeof des.departmentId === 'object' ? des.departmentId?.name : null;

                        return (
                            <div
                                key={des._id}
                                className="group relative flex flex-col justify-between p-4 rounded-xl border bg-card hover:shadow-md hover:border-primary/20 transition-all"
                            >
                                <div className="space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold text-base tracking-tight">
                                                    {des.title}
                                                </h4>
                                                {des.code && (
                                                    <Badge variant="outline" className="font-mono text-xs">
                                                        {des.code}
                                                    </Badge>
                                                )}
                                            </div>
                                            {depName && (
                                                <Badge variant="secondary" className="text-[10px]">
                                                    {depName}
                                                </Badge>
                                            )}
                                        </div>
                                        <Badge variant={des.isActive ? 'default' : 'secondary'}>
                                            {des.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>

                                    {des.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            {des.description}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-4 mt-4 border-t text-xs">
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={des.isActive}
                                            onCheckedChange={() => handleToggleStatus(des)}
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
                                                setSelectedDes(des);
                                                setDialogOpen(true);
                                            }}
                                        >
                                            <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                        </Button>

                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                            onClick={() => setDeleteId(des._id)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create / Edit Dialog */}
            <CreateDesignationDialog
                open={dialogOpen}
                setOpen={setDialogOpen}
                editDesignation={selectedDes}
            />

            {/* Delete Confirmation Alert */}
            <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the designation. Staff members associated with this designation may need to be updated.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? <Spinner /> : 'Delete Designation'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
