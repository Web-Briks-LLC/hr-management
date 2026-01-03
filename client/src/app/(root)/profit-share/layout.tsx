import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Profit Share | Hr Management - Web Briks LLC',
    description: 'Manage profit sharing and transfers',
};

export default function ProfitShareLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
