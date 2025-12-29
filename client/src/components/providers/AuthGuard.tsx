'use client';

import { useSession } from '@/lib/auth-client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { canAccess } from '@/utils/canAccess';
import { Role } from '@/consonants/role';

const publicRoutes = new Set([
    '/sign-in',
    '/forget-password',
    '/reset-password',
]);

// Loading spinner component
const LoadingSpinner = () => (
    <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
);

export default function AuthGuard({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session, isPending } = useSession();
    const pathname = usePathname();
    const router = useRouter();
    const [isRedirecting, setIsRedirecting] = useState(false);

    useEffect(() => {
        if (isPending) return;

        // Allow next static / assets automatically
        if (
            pathname.startsWith('/_next') ||
            pathname.startsWith('/api') ||
            pathname === '/favicon.ico' ||
            pathname === '/robots.txt' ||
            pathname.startsWith('/assets')
        ) {
            return;
        }

        const isPublic =
            publicRoutes.has(pathname) || pathname.startsWith('/sign-up');

        // ❌ Not logged in
        if (!session) {
            if (isPublic) return;
            setIsRedirecting(true);
            router.replace('/sign-in');
            return;
        }

        // ✅ Logged in user on public route → dashboard
        if (isPublic || pathname === '/') {
            setIsRedirecting(true);
            router.replace('/dashboard');
            return;
        }

        // 🔐 Role based access
        const role = session.user?.role as Role | undefined;
        if (role && !canAccess(role, pathname)) {
            setIsRedirecting(true);
            router.replace('/dashboard');
            return;
        }

        // ✅ Access granted
        setIsRedirecting(false);
    }, [session, isPending, pathname, router]);

    // ⏳ Loading or redirecting state
    if (isPending || isRedirecting) {
        return <LoadingSpinner />;
    }

    // 🚫 Block rendering for unauthorized access (fallback)
    const isPublicRoute = publicRoutes.has(pathname) || pathname.startsWith('/sign-up');
    if (!session && !isPublicRoute) {
        return <LoadingSpinner />;
    }

    return <>{children}</>;
}
