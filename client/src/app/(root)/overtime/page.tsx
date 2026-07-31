'use client';

import { useSession } from '@/lib/auth-client';
import { Role } from '@/constants/role';
import MyOvertime from '@/components/dashboard/overtime/my-overtime';
import OvertimeList from '@/components/dashboard/overtime/overtime-list';
import OvertimeLogs from '@/components/dashboard/overtime/overtime-logs';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function OvertimeManagementTabs() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const currentTab = searchParams.get('tab') || 'overview';

    const handleTabChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === 'overview') {
            params.delete('tab');
        } else {
            params.set('tab', value);
        }
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <div className="space-y-6 p-1">
            <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="mb-4 bg-muted/50 w-fit inline-flex justify-start rounded-md h-12 p-1 border">
                    <TabsTrigger value="overview" className="h-full px-8 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-sm">Overview</TabsTrigger>
                    <TabsTrigger value="logs" className="h-full px-8 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-sm">Audit Logs</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="m-0 border-none p-0 outline-none">
                    <OvertimeList />
                </TabsContent>
                <TabsContent value="logs" className="m-0 border-none p-0 outline-none">
                    <div className="space-y-6">
                        <div className="flex flex-col gap-2">
                            <h2 className="text-3xl font-bold tracking-tight">
                                Overtime Logs
                            </h2>
                            <p className="text-muted-foreground mt-1">
                                Detailed audit trail of all overtime modifications and approvals.
                            </p>
                        </div>
                        <OvertimeLogs />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

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
        <Suspense fallback={<div className="flex justify-center p-8"><Spinner /></div>}>
            <OvertimeManagementTabs />
        </Suspense>
    );
}
