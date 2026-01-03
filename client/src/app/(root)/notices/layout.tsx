import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Notices | Hr Management - Web Briks LLC',
    description: 'View company notices and announcements',
};

export default function NoticesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
