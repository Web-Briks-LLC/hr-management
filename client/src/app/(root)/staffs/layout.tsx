import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Staff | Hr Management - Web Briks LLC',
    description: 'Manage staff members and profiles',
};

export default function StaffsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
