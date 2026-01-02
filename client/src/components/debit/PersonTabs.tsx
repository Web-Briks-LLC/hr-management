'use client';

import { useState } from 'react';
import {
    useGetPersonsQuery,
    useGetDebitsQuery,
    useGetDebitStatsQuery,
    useDeleteDebitMutation,
    useDeletePersonMutation,
} from '@/redux/features/debit/debitApi';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Pencil, Trash2, Users, ArrowLeftRight, Phone, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { EditTransactionDialog } from './EditTransactionDialog';
import { EditPersonDialog } from './EditPersonDialog';

interface Debit {
    _id: string;
    personId: {
        _id: string;
        name: string;
    };
    amount: number;
    date: string;
    type: 'Borrow' | 'Return';
    description?: string;
    createdAt: string;
}

interface Person {
    _id: string;
    name: string;
    phone?: string;
    address?: string;
    description?: string;
    createdAt: string;
}

export function PersonTabs() {
    const { data: persons = [] } = useGetPersonsQuery();
    const { data: debits = [] } = useGetDebitsQuery();
    const { data: stats = [] } = useGetDebitStatsQuery();

    const [deleteDebit] = useDeleteDebitMutation();
    const [deletePerson] = useDeletePersonMutation();

    const [editingDebit, setEditingDebit] = useState<Debit | null>(null);
    const [editingPerson, setEditingPerson] = useState<Person | null>(null);
    const [deleteDebitId, setDeleteDebitId] = useState<string | null>(null);
    const [deletePersonId, setDeletePersonId] = useState<string | null>(null);

    const handleDeleteDebit = async () => {
        if (!deleteDebitId) return;

        try {
            await deleteDebit(deleteDebitId).unwrap();
            toast.success('Debit deleted');
            setDeleteDebitId(null);
        } catch (err: any) {
            toast.error(`Failed to delete: ${err?.data?.message || err.message}`);
        }
    };

    const handleDeletePerson = async () => {
        if (!deletePersonId) return;

        try {
            await deletePerson(deletePersonId).unwrap();
            toast.success('Person deleted');
            setDeletePersonId(null);
        } catch (err: any) {
            toast.error(`Failed to delete: ${err?.data?.message || err.message}`);
        }
    };

    const getPersonBalance = (personId: string) => {
        const stat = stats.find((s) => s._id === personId);
        return stat?.netBalance || 0;
    };

    return (
        <>
            <Tabs defaultValue="debits" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                    <TabsTrigger value="debits" className="gap-2">
                        <ArrowLeftRight className="h-4 w-4" />
                        Debits
                    </TabsTrigger>
                    <TabsTrigger value="persons" className="gap-2">
                        <Users className="h-4 w-4" />
                        Persons
                    </TabsTrigger>
                </TabsList>

                {/* Debits Tab */}
                <TabsContent value="debits" className="space-y-4">
                    {debits.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <ArrowLeftRight className="h-12 w-12 text-muted-foreground/50 mb-4" />
                            <h3 className="text-lg font-medium">No debits yet</h3>
                            <p className="text-muted-foreground text-sm mt-1">
                                Add a debit to get started
                            </p>
                        </div>
                    ) : (
                        <div className="border bg-card">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-b">
                                        <TableHead className="font-semibold border-r">Person</TableHead>
                                        <TableHead className="font-semibold border-r">Date</TableHead>
                                        <TableHead className="font-semibold border-r">Type</TableHead>
                                        <TableHead className="font-semibold text-right border-r">Amount</TableHead>
                                        <TableHead className="font-semibold border-r">Note</TableHead>
                                        <TableHead className="font-semibold text-right w-24">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {debits.map((debit) => (
                                        <TableRow key={debit._id} className="group border-b">
                                            <TableCell className="font-medium border-r">
                                                {debit.personId?.name || 'Unknown Person'}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground border-r">
                                                {format(new Date(debit.date), 'MMM d, yyyy')}
                                            </TableCell>
                                            <TableCell className="border-r">
                                                <span className={`font-medium ${debit.type === 'Borrow'
                                                    ? 'text-red-500'
                                                    : 'text-emerald-500'
                                                    }`}>
                                                    {debit.type}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-medium border-r">
                                                {debit.amount.toLocaleString('en-US', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                })}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground max-w-[200px] truncate border-r">
                                                {debit.description || '—'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => setEditingDebit(debit as Debit)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                                        onClick={() => setDeleteDebitId(debit._id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </TabsContent>

                {/* Persons Tab */}
                <TabsContent value="persons" className="space-y-4">
                    {persons.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                            <h3 className="text-lg font-medium">No persons added</h3>
                            <p className="text-muted-foreground text-sm mt-1">
                                Add a person to track their debits
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {persons.map((person) => {
                                const balance = getPersonBalance(person._id);
                                return (
                                    <div
                                        key={person._id}
                                        className="group relative rounded-xl border bg-card p-5 transition-all hover:shadow-md hover:border-primary/20"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                                                    {person.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold">{person.name}</h3>
                                                    {person.phone && (
                                                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                            <Phone className="h-3 w-3" />
                                                            {person.phone}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => setEditingPerson(person as Person)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                                    onClick={() => setDeletePersonId(person._id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        {person.address && (
                                            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                                                <MapPin className="h-3 w-3 shrink-0" />
                                                <span className="truncate">{person.address}</span>
                                            </div>
                                        )}

                                        <div className="pt-3 border-t">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-muted-foreground">Balance</span>
                                                <span
                                                    className={`font-mono font-semibold ${balance > 0
                                                        ? 'text-red-500'
                                                        : balance < 0
                                                            ? 'text-emerald-500'
                                                            : 'text-muted-foreground'
                                                        }`}
                                                >
                                                    {balance > 0 ? '+' : ''}
                                                    {balance.toLocaleString('en-US', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Edit Debit Dialog */}
            {editingDebit && (
                <EditTransactionDialog
                    transaction={editingDebit}
                    open={!!editingDebit}
                    onOpenChange={(open) => !open && setEditingDebit(null)}
                />
            )}

            {/* Edit Person Dialog */}
            {editingPerson && (
                <EditPersonDialog
                    person={editingPerson}
                    open={!!editingPerson}
                    onOpenChange={(open) => !open && setEditingPerson(null)}
                />
            )}

            {/* Delete Debit Confirmation */}
            <AlertDialog
                open={!!deleteDebitId}
                onOpenChange={(open) => !open && setDeleteDebitId(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete debit?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteDebit}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Person Confirmation */}
            <AlertDialog
                open={!!deletePersonId}
                onOpenChange={(open) => !open && setDeletePersonId(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete person?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will also delete all their debits. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeletePerson}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
