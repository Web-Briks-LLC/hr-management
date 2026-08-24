'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import { Role } from '@/constants/role';
import { Loader2 } from 'lucide-react';

export default function LeaveRootPage() {
    const router = useRouter();
    const { data: session, isPending } = useSession();

    useEffect(() => {
        if (!isPending) {
            const userRole = session?.user?.role;
            if (
                userRole === Role.SUPER_ADMIN ||
                userRole === Role.ADMIN ||
                userRole === Role.HR_MANAGER
            ) {
                router.replace('/leave/manage');
            } else {
                router.replace('/leave/apply');
            }
        }
    }, [session, isPending, router]);

    return (
        <div className="flex min-h-[60vh] items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="size-6 animate-spin text-primary" />
                <p className="text-sm">Redirecting to leave portal...</p>
            </div>
        </div>
    );
}
