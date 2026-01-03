import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Orders | Hr Management - Web Briks LLC',
    description: 'Manage customer orders',
};

export default function OrdersLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
