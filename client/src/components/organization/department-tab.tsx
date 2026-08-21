'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Search, Plus, Pencil, Trash2, Building } from 'lucide-react';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import {
    useGetAllDepartmentsQuery,
    useUpdateDepartmentMutation,
    useDeleteDepartmentMutation,
} from '@/redux/features/department/departmentApi';
import { IDepartment } from '@/types/department.type';
import CreateDepartmentDialog from './create-department-dialog';
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

export default function DepartmentTab() {
    const [search, setSearch] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedDep, setSelectedDep] = useState<IDepartment | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const { data, isLoading } = useGetAllDepartmentsQuery(undefined);
    const departments: IDepartment[] = data?.departments || [];

    const [updateDepartment] = useUpdateDepartmentMutation();
    const [deleteDepartment, { isLoading: isDeleting }] = useDeleteDepartmentMutation();

    const filteredDepartments = departments.filter((d) =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        (d.code && d.code.toLowerCase().includes(search.toLowerCase()))
    );

    const handleToggleStatus = async (dep: IDepartment) => {
        try {
            await updateDepartment({
                id: dep._id,
                data: { isActive: !dep.isActive },
            }).unwrap();
            toast.success(`Department ${!dep.isActive ? 'activated' : 'deactivated'}`);
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to update status');
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteDepartment(deleteId).unwrap();
            toast.success('Department deleted successfully');
            setDeleteId(null);
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to delete department');
        }
    };

    return (
        <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search departments..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <Button
                    onClick={() => {
                        setSelectedDep(null);
                        setDialogOpen(true);
                    }}
                    className="w-full sm:w-auto"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Department
                </Button>
            </div>

            {/* Department List */}
            {isLoading ? (
                <div className="flex items-center justify-center min-h-[250px]">
                    <Spinner />
                </div>
            ) : filteredDepartments.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center bg-muted/20">
                    <Building className="h-10 w-10 text-muted-foreground/50 mb-3" />
                    <h3 className="font-semibold text-lg">No departments found</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
                        {search ? 'Try adjusting your search query.' : 'Get started by creating your first department.'}
                    </p>
                    {!search && (
                        <Button
                            onClick={() => {
                                setSelectedDep(null);
                                setDialogOpen(true);
                            }}
                            size="sm"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Create Department
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDepartments.map((dep) => (
                        <div
                            key={dep._id}
                            className="group relative flex flex-col justify-between p-4 rounded-xl border bg-card hover:shadow-md hover:border-primary/20 transition-all"
                        >
                            <div className="space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-base tracking-tight">
                                                {dep.name}
                                            </h4>
                                            {dep.code && (
                                                <Badge variant="outline" className="font-mono text-xs">
                                                    {dep.code}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <Badge variant={dep.isActive ? 'default' : 'secondary'}>
                                        {dep.isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>

                                {dep.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                        {dep.description}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-4 mt-4 border-t text-xs">
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={dep.isActive}
                                        onCheckedChange={() => handleToggleStatus(dep)}
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
                                            setSelectedDep(dep);
                                            setDialogOpen(true);
                                        }}
                                    >
                                        <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                    </Button>

                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                        onClick={() => setDeleteId(dep._id)}
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
            <CreateDepartmentDialog
                open={dialogOpen}
                setOpen={setDialogOpen}
                editDepartment={selectedDep}
            />

            {/* Delete Confirmation Alert */}
            <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the department. Staff members associated with this department may need to be updated.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? <Spinner /> : 'Delete Department'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
