import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Expense | Hr Management - Web Briks LLC',
    description: 'Manage business expenses',
};

export default function ExpenseLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
