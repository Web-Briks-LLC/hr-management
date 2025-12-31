'use client';

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/redux/store';
import {
    deleteTransaction,
    deletePerson,
    fetchDebitStats,
    fetchPersons,
    fetchTransactions,
} from '@/redux/slices/debitSlice';
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

interface Transaction {
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
    const dispatch = useDispatch<AppDispatch>();
    const { persons, transactions, stats } = useSelector(
        (state: RootState) => state.debit
    );

    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [editingPerson, setEditingPerson] = useState<Person | null>(null);
    const [deleteTransactionId, setDeleteTransactionId] = useState<string | null>(null);
    const [deletePersonId, setDeletePersonId] = useState<string | null>(null);

    const handleDeleteTransaction = () => {
        if (!deleteTransactionId) return;

        dispatch(deleteTransaction(deleteTransactionId))
            .unwrap()
            .then(() => {
                toast.success('Transaction deleted');
                dispatch(fetchDebitStats());
                dispatch(fetchTransactions(undefined));
                setDeleteTransactionId(null);
            })
            .catch((err) => {
                toast.error(`Failed to delete: ${err}`);
            });
    };

    const handleDeletePerson = () => {
        if (!deletePersonId) return;

        dispatch(deletePerson(deletePersonId))
            .unwrap()
            .then(() => {
                toast.success('Person deleted');
                dispatch(fetchDebitStats());
                dispatch(fetchPersons());
                setDeletePersonId(null);
            })
            .catch((err) => {
                toast.error(`Failed to delete: ${err}`);
            });
    };

    const getPersonBalance = (personId: string) => {
        const stat = stats.find((s) => s._id === personId);
        return stat?.netBalance || 0;
    };

    return (
        <>
            <Tabs defaultValue="transactions" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                    <TabsTrigger value="transactions" className="gap-2">
                        <ArrowLeftRight className="h-4 w-4" />
                        Transactions
                    </TabsTrigger>
                    <TabsTrigger value="persons" className="gap-2">
                        <Users className="h-4 w-4" />
                        Persons
                    </TabsTrigger>
                </TabsList>

                {/* Transactions Tab */}
                <TabsContent value="transactions" className="space-y-4">
                    {transactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <ArrowLeftRight className="h-12 w-12 text-muted-foreground/50 mb-4" />
                            <h3 className="text-lg font-medium">No transactions yet</h3>
                            <p className="text-muted-foreground text-sm mt-1">
                                Add a transaction to get started
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
                                    {transactions.map((transaction) => (
                                        <TableRow key={transaction._id} className="group border-b">
                                            <TableCell className="font-medium border-r">
                                                {transaction.personId?.name || 'Unknown Person'}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground border-r">
                                                {format(new Date(transaction.date), 'MMM d, yyyy')}
                                            </TableCell>
                                            <TableCell className="border-r">
                                                <span className={`font-medium ${transaction.type === 'Borrow'
                                                    ? 'text-red-500'
                                                    : 'text-emerald-500'
                                                    }`}>
                                                    {transaction.type}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-medium border-r">
                                                {transaction.amount.toLocaleString('en-US', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                })}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground max-w-[200px] truncate border-r">
                                                {transaction.description || '—'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => setEditingTransaction(transaction)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                                        onClick={() => setDeleteTransactionId(transaction._id)}
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
                                                    onClick={() => setEditingPerson(person)}
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

            {/* Edit Transaction Dialog */}
            {editingTransaction && (
                <EditTransactionDialog
                    transaction={editingTransaction}
                    open={!!editingTransaction}
                    onOpenChange={(open) => !open && setEditingTransaction(null)}
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

            {/* Delete Transaction Confirmation */}
            <AlertDialog
                open={!!deleteTransactionId}
                onOpenChange={(open) => !open && setDeleteTransactionId(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteTransaction}
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
                            This will also delete all their transactions. This action cannot be undone.
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
