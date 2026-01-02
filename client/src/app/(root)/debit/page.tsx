'use client';

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/redux/store';
import { fetchPersons, fetchDebitStats, fetchDebits } from '@/redux/slices/debitSlice';
import { AddPersonDialog } from '@/components/debit/AddPersonDialog';
import { AddTransactionDialog } from '@/components/debit/AddTransactionDialog';
import { PersonTabs } from '@/components/debit/PersonTabs';
import { DebitStatsCards } from '@/components/debit/DebitStatsCards';

export default function DebitPage() {
    const dispatch = useDispatch<AppDispatch>();

    useEffect(() => {
        dispatch(fetchPersons());
        dispatch(fetchDebitStats());
        dispatch(fetchDebits(undefined));
    }, [dispatch]);

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Debit Management</h1>
                    <p className="text-muted-foreground mt-1">
                        Track borrowings and returns with ease
                    </p>
                </div>
                <div className="flex gap-3">
                    <AddPersonDialog />
                    <AddTransactionDialog />
                </div>
            </div>

            {/* Stats Cards */}
            <DebitStatsCards />

            <PersonTabs />
        </div>
    );
}
