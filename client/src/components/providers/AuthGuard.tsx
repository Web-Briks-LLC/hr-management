'use client';

import { useSession } from '@/lib/auth-client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { canAccess } from '@/utils/canAccess';
import { Role } from '@/constants/role';
import { useGetMeQuery } from '@/redux/features/staff/staffApi';

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

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { data: session, isPending: isSessionPending } = useSession();
    const { data: meData, isLoading: isMeLoading } = useGetMeQuery(
        {},
        { skip: !session }
    );
    const pathname = usePathname();
    const router = useRouter();

    const isPending = isSessionPending || (!!session && isMeLoading);

    // Memoize route checks to avoid unnecessary recalculations
    const isStaticRoute = useMemo(() => {
        return (
            pathname.startsWith('/_next') ||
            pathname.startsWith('/api') ||
            pathname === '/favicon.ico' ||
            pathname === '/robots.txt' ||
            pathname.startsWith('/assets')
        );
    }, [pathname]);

    const isPublicRoute = useMemo(() => {
        return publicRoutes.has(pathname) || pathname.startsWith('/sign-up');
    }, [pathname]);

    useEffect(() => {
        // Skip if still pending or static route
        if (isPending || isStaticRoute) return;

        // ❌ Not logged in
        if (!session) {
            if (isPublicRoute) return;
            router.replace('/sign-in');
            return;
        }

        // ✅ Logged in user on public route → dashboard
        if (isPublicRoute || pathname === '/') {
            router.replace('/dashboard');
            return;
        }

        // 🔐 Role based access
        const role = session.user?.role as Role | undefined;
        const designation = meData?.staff?.designation as string | undefined;
        if (role && !canAccess(role, pathname, designation)) {
            router.replace('/dashboard');
            return;
        }
    }, [session, isPending, pathname, router, isPublicRoute, isStaticRoute, meData]);

    // Allow static routes immediately
    if (isStaticRoute) {
        return <>{children}</>;
    }

    // ⏳ Only show loading while session is being fetched
    if (isPending) {
        return <LoadingSpinner />;
    }

    // 🚫 Not logged in and not on public route - show loading while redirect happens
    if (!session && !isPublicRoute) {
        return <LoadingSpinner />;
    }

    // ✅ Logged in on public route - show loading while redirect happens
    if (session && (isPublicRoute || pathname === '/')) {
        return <LoadingSpinner />;
    }

    return <>{children}</>;
}
