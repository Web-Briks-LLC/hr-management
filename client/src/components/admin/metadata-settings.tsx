'use client';

import { useState } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    useGetMetadataByTypeQuery,
    useCreateMetadataMutation,
    useDeleteMetadataMutation,
    type IMetadata,
} from '@/redux/features/metadata/metadataApi';
import { Loader, Plus, Trash2, Building2, Briefcase, Tag } from 'lucide-react';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';

export default function MetadataSettings() {
    const [activeTab, setActiveTab] = useState<'department' | 'designation'>(
        'department',
    );

    return (
        <Card>
            <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-primary/10 p-2">
                        <Tag className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <CardTitle>Departments & Designations</CardTitle>
                        <CardDescription className="mt-0.5">
                            Manage predefined options for employee invitations
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Tabs
                    value={activeTab}
                    onValueChange={(v) =>
                        setActiveTab(v as 'department' | 'designation')
                    }
                >
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="department" className="gap-2">
                            <Building2 className="h-4 w-4" />
                            Departments
                        </TabsTrigger>
                        <TabsTrigger value="designation" className="gap-2">
                            <Briefcase className="h-4 w-4" />
                            Designations
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="department" className="mt-4">
                        <MetadataList type="department" />
                    </TabsContent>

                    <TabsContent value="designation" className="mt-4">
                        <MetadataList type="designation" />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

function MetadataList({ type }: { type: 'department' | 'designation' }) {
    const { data, isLoading, isFetching } = useGetMetadataByTypeQuery(type);
    const [createMetadata, { isLoading: isCreating }] =
        useCreateMetadataMutation();
    const [deleteMetadata] = useDeleteMetadataMutation();

    const [newLabel, setNewLabel] = useState('');

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newLabel.trim()) {
            toast.error('Please enter a name');
            return;
        }

        try {
            await createMetadata({
                type,
                value: newLabel.trim().toLowerCase().replace(/\s+/g, '_'),
                label: newLabel.trim(),
            }).unwrap();

            toast.success(
                `${type === 'department' ? 'Department' : 'Designation'} added successfully`,
            );
            setNewLabel('');
        } catch (err: any) {
            toast.error(err?.data?.message || `Failed to add ${type}`);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteMetadata(id).unwrap();
            toast.success(
                `${type === 'department' ? 'Department' : 'Designation'} deleted`,
            );
        } catch (err: any) {
            toast.error(err?.data?.message || `Failed to delete ${type}`);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-2">
                    <Loader className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    const items = data?.data || [];
    const typeName = type === 'department' ? 'department' : 'designation';
    const typeNamePlural =
        type === 'department' ? 'departments' : 'designations';

    return (
        <div className="space-y-4">
            {/* Add New Form */}
            <form onSubmit={handleAdd} className="flex gap-2">
                <div className="flex-1">
                    <Label htmlFor={`${type}-label`} className="sr-only">
                        New {typeName}
                    </Label>
                    <Input
                        id={`${type}-label`}
                        placeholder={`Add new ${typeName}...`}
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        className="h-10"
                    />
                </div>
                <Button
                    type="submit"
                    disabled={isCreating || !newLabel.trim()}
                    className="gap-2 h-10"
                >
                    {isCreating ? (
                        <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                        <Plus className="h-4 w-4" />
                    )}
                    Add
                </Button>
            </form>

            {/* List */}
            <div className="rounded-lg border">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        {type === 'department' ? (
                            <Building2 className="h-10 w-10 text-muted-foreground/50 mb-3" />
                        ) : (
                            <Briefcase className="h-10 w-10 text-muted-foreground/50 mb-3" />
                        )}
                        <p className="text-muted-foreground font-medium">
                            No {typeNamePlural} yet
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Add your first {typeName} using the form above
                        </p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {items.map((item: IMetadata) => (
                            <div
                                key={item._id}
                                className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <Badge
                                        variant="secondary"
                                        className="font-normal"
                                    >
                                        {item.value}
                                    </Badge>
                                    <span className="font-medium">
                                        {item.label}
                                    </span>
                                </div>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>
                                                Delete{' '}
                                                {type === 'department'
                                                    ? 'Department'
                                                    : 'Designation'}
                                                ?
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to delete
                                                &quot;{item.label}&quot;? This
                                                action cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>
                                                Cancel
                                            </AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() =>
                                                    handleDelete(item._id)
                                                }
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                                Delete
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Count */}
            {items.length > 0 && (
                <p className="text-sm text-muted-foreground text-center">
                    {items.length}{' '}
                    {items.length === 1 ? typeName : typeNamePlural}
                </p>
            )}

            {isFetching && !isLoading && (
                <div className="text-sm text-muted-foreground text-center">
                    Refreshing...
                </div>
            )}
        </div>
    );
}
