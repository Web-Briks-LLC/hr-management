import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Debit | Hr Management - Web Briks LLC',
    description: 'Manage debit transactions',
};

export default function DebitLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
