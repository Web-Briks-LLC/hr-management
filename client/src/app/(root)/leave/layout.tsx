import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Leave | Hr Management - Web Briks LLC',
    description: 'Manage staff leave applications',
};

export default function LeaveLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
