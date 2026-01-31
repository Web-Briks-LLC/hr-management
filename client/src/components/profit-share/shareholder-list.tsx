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
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    useGetShareholdersQuery,
    useDeleteShareholderMutation,
    type IShareholder,
} from '@/redux/features/profitShare/profitShareApi';
import { Loader, Plus, Trash2, Edit, Users, Percent } from 'lucide-react';
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
import { Progress } from '@/components/ui/progress';
import AddShareholderDialog from './add-shareholder-dialog';

export default function ShareholderList() {
    const { data, isLoading, isFetching } = useGetShareholdersQuery();
    const [deleteShareholder] = useDeleteShareholderMutation();
    const [editingShareholder, setEditingShareholder] =
        useState<IShareholder | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    const handleDelete = async (id: string) => {
        try {
            await deleteShareholder(id).unwrap();
            toast.success('Shareholder removed successfully');
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to remove shareholder');
        }
    };

    const handleEdit = (shareholder: IShareholder) => {
        setEditingShareholder(shareholder);
        setDialogOpen(true);
    };

    const handleDialogClose = () => {
        setEditingShareholder(null);
        setDialogOpen(false);
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-16">
                    <div className="flex flex-col items-center gap-2">
                        <Loader className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">
                            Loading shareholders...
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const shareholders = data?.data || [];
    const totalPercentage = data?.meta?.totalPercentage || 0;
    const remainingPercentage = data?.meta?.remainingPercentage || 100;

    return (
        <Card>
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Shareholders
                        </CardTitle>
                        <CardDescription className="mt-1">
                            Manage profit share percentages for each shareholder
                        </CardDescription>
                    </div>
                    <AddShareholderDialog
                        open={dialogOpen}
                        onOpenChange={setDialogOpen}
                        editingShareholder={editingShareholder}
                        onClose={handleDialogClose}
                        remainingPercentage={remainingPercentage}
                    />
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Percentage Allocation Overview */}
                <div className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Percent className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                                Total Allocation
                            </span>
                        </div>
                        <span
                            className={`font-bold ${totalPercentage === 100 ? 'text-green-600' : 'text-amber-600'}`}
                        >
                            {totalPercentage.toFixed(2)}%
                        </span>
                    </div>
                    <Progress value={totalPercentage} className="h-2" />
                    <p className="text-sm text-muted-foreground">
                        {totalPercentage < 100 ? (
                            <span className="text-amber-600">
                                {remainingPercentage.toFixed(2)}% remaining to
                                allocate
                            </span>
                        ) : (
                            <span className="text-green-600">
                                Fully allocated
                            </span>
                        )}
                    </p>
                </div>

                {/* Shareholders Table */}
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="font-semibold">
                                    Shareholder
                                </TableHead>
                                <TableHead className="font-semibold">
                                    Percentage
                                </TableHead>
                                <TableHead className="font-semibold">
                                    Status
                                </TableHead>
                                <TableHead className="text-right font-semibold">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {shareholders.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={4}
                                        className="h-32 text-center"
                                    >
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            <Users className="h-8 w-8 opacity-50" />
                                            <p>No shareholders added</p>
                                            <p className="text-sm">
                                                Add shareholders to distribute
                                                profits
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                shareholders.map((shareholder) => (
                                    <TableRow
                                        key={shareholder._id}
                                        className="hover:bg-muted/30"
                                    >
                                        <TableCell>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-medium">
                                                    {shareholder.name}
                                                </span>
                                                <span className="text-sm text-muted-foreground">
                                                    {shareholder.email}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="secondary"
                                                className="font-mono"
                                            >
                                                {shareholder.percentage.toFixed(
                                                    2,
                                                )}
                                                %
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    shareholder.isActive
                                                        ? 'default'
                                                        : 'outline'
                                                }
                                                className={
                                                    shareholder.isActive
                                                        ? 'bg-green-500'
                                                        : ''
                                                }
                                            >
                                                {shareholder.isActive
                                                    ? 'Active'
                                                    : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() =>
                                                        handleEdit(shareholder)
                                                    }
                                                    className="h-8 w-8"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>
                                                                Remove
                                                                Shareholder?
                                                            </AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Are you sure you
                                                                want to remove
                                                                &quot;
                                                                {
                                                                    shareholder.name
                                                                }
                                                                &quot;? This
                                                                will free up{' '}
                                                                {
                                                                    shareholder.percentage
                                                                }
                                                                % for
                                                                reallocation.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>
                                                                Cancel
                                                            </AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() =>
                                                                    handleDelete(
                                                                        shareholder._id,
                                                                    )
                                                                }
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                Remove
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {isFetching && !isLoading && (
                    <div className="text-sm text-muted-foreground text-center">
                        Refreshing...
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
