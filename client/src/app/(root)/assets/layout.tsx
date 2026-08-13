import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Assets | Hr Management - Web Briks LLC',
    description: 'Track and manage company physical and digital assets, equipment, and documents',
};

export default function AssetsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
