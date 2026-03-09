import { Metadata } from 'next';
import BalancesClient from './BalancesClient';

export const metadata: Metadata = {
    title: 'Balances | Hr Management - Web Briks LLC',
    description: 'Manage staff wallets, commissions, and withdrawals.',
};

export default function BalancesPage() {
    return <BalancesClient />;
}
