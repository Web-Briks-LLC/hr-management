'use client';

import { useSession } from '@/lib/auth-client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { canAccess } from '@/utils/canAccess';
import { Role } from '@/consonants/role';

const publicRoutes = new Set([
    '/sign-in',
    '/forget-password',
    '/reset-password',
]);

export default function AuthGuard({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session, isPending } = useSession();
    const pathname = usePathname();
    const router = useRouter();

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
            router.replace('/sign-in');
            return;
        }

        // ✅ Logged in user on public route → dashboard
        if (isPublic || pathname === '/') {
            router.replace('/dashboard');
            return;
        }

        // 🔐 Role based access
        const role = session.user?.role as Role | undefined;
        if (role && !canAccess(role, pathname)) {
            router.replace('/dashboard');
        }
    }, [session, isPending, pathname, router]);

    // ⏳ Loading state
    if (isPending) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
        );
    }

    // 🚫 Block rendering while redirecting
    const isPublicRoute = publicRoutes.has(pathname) || pathname.startsWith('/sign-up');
    if (!session && !isPublicRoute) {
        return null;
    }

    return <>{children}</>;
}
