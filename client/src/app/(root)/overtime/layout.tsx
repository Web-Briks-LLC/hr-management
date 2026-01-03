import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Overtime | Hr Management - Web Briks LLC',
    description: 'Manage staff overtime requests',
};

export default function OvertimeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
