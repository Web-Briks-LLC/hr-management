'use client';

import { useSession } from '@/lib/auth-client';
import { Role } from '@/constants/role';
import MyOvertime from '@/components/dashboard/overtime/my-overtime';
import OvertimeList from '@/components/dashboard/overtime/overtime-list';
import { Spinner } from '@/components/ui/spinner';

export default function OvertimePage() {
    const { data: session, isPending } = useSession();

    if (isPending) {
        return (
            <div className="flex items-center justify-center p-8">
                <Spinner />
            </div>
        );
    }

    if (!session) {
        return <div>Please log in to view overtime records.</div>;
    }

    const { role } = session.user;

    if (role === Role.STAFF) {
        return (
            <div className="p-4 sm:p-6 space-y-6">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">
                        Overtime
                    </h1>
                    <p className="text-muted-foreground">
                        View your overtime history.
                    </p>
                </div>
                <MyOvertime />
            </div>
        );
    }

    // Admins, HR, Team Leaders see the management list
    return (
        <div className="space-y-6">
            <OvertimeList />
        </div>
    );
}
