import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Clients | Hr Management - Web Briks LLC',
    description: 'Manage client information',
};

export default function ClientsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
