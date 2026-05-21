import { Metadata } from 'next';
import TransactionsClient from './TransactionsClient';

export const metadata: Metadata = {
    title: 'Unified Transaction Ledger | Hr Management - Web Briks LLC',
    description: 'Centralized office financial ledger with chronological running balances, date-range analysis, and PDF exporting.',
};

export default function TransactionsPage() {
    return <TransactionsClient />;
}
