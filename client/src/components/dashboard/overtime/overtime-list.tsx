'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    useDeleteOvertimeMutation,
    useGetAllOvertimeQuery,
} from '@/redux/features/overtime/overtimeApi';
import { CloudCog, Edit, MoreHorizontal, Plus, Trash } from 'lucide-react';
import { OvertimeDialog } from './overtime-dialog';
import { IOvertime } from '@/types/overtime.type';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function OvertimeList() {
    const {
        data: overtimeData,
        isLoading,
        isError,
        error,
    } = useGetAllOvertimeQuery({});
    const [deleteOvertime] = useDeleteOvertimeMutation();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedOvertime, setSelectedOvertime] = useState<IOvertime | null>(
        null,
    );

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this record?')) return;
        try {
            await deleteOvertime(id).unwrap();
            toast.success('Overtime deleted');
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    const handleEdit = (ot: IOvertime) => {
        setSelectedOvertime(ot);
        setIsDialogOpen(true);
    };

    const handleCreate = () => {
        setSelectedOvertime(null);
        setIsDialogOpen(true);
    };

    if (isLoading) return <div>Loading overtime records...</div>;
    if (isError)
        return <div className="text-red-500">Error loading records.</div>;

    const records = (overtimeData as IOvertime[]) || [];

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">
                    Overtime Management
                </h2>
                <Button onClick={handleCreate}>
                    <Plus className="h-4 w-4" /> Add Overtime
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Overtime Records</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Staff</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {records.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="text-center py-4"
                                        >
                                            No records found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    records.map((ot) => (
                                        <TableRow key={ot._id}>
                                            <TableCell>
                                                <div className="font-medium">
                                                    {ot.staffId?.name || 'N/A'}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {ot.staffId?.staffId}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {format(
                                                    new Date(ot.date),
                                                    'MMM dd, yyyy',
                                                )}
                                            </TableCell>
                                            <TableCell className="capitalize">
                                                {ot.type.replace('_', ' ')}
                                            </TableCell>
                                            <TableCell>
                                                {Math.floor(
                                                    ot.durationMinutes / 60,
                                                )}
                                                h {ot.durationMinutes % 60}m
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        ot.status === 'approved'
                                                            ? 'default'
                                                            : 'secondary'
                                                    }
                                                >
                                                    {ot.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                        asChild
                                                    >
                                                        <Button
                                                            variant="ghost"
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            <span className="sr-only">
                                                                Open menu
                                                            </span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>
                                                            Actions
                                                        </DropdownMenuLabel>
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                handleEdit(ot)
                                                            }
                                                        >
                                                            <Edit className=" h-4 w-4" />{' '}
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                handleDelete(
                                                                    ot._id,
                                                                )
                                                            }
                                                            className="text-red-600"
                                                        >
                                                            <Trash className=" h-4 w-4" />{' '}
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <OvertimeDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                data={selectedOvertime}
            />
        </div>
    );
}
