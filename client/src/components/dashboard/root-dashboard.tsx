'use client';

import { useSession } from '@/lib/auth-client';
import { Spinner } from '../ui/spinner';
import { Role } from '@/constants/role';
import StaffDashboard from './staff-dashboard/staff-dashboard';
import AdminDashboard from './admin-dashboard/admin-dashboard';

export default function RootDashboard() {
    const { data: session, isPending, isRefetching } = useSession();

    const isLoading = isPending || isRefetching;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Spinner />
            </div>
        );
    }

    if (!session) {
        return null;
    }

    const userRole = session.user.role as Role;

    // Admin Dashboard for Admin, Super Admin, HR Manager
    if ([Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER].includes(userRole)) {
        return <AdminDashboard />;
    }

    // Staff Dashboard for Staff and Team Leader
    if ([Role.STAFF, Role.TEAM_LEADER].includes(userRole)) {
        return <StaffDashboard user={session.user} />;
    }

    return <div>No dashboard available for your role</div>;
}
