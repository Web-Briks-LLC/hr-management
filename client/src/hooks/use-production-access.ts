'use client';

import { useSession } from '@/lib/auth-client';
import { useGetMeQuery } from '@/redux/features/staff/staffApi';
import { Role } from '@/constants/role';

/**
 * Single source of truth for who can see the Production floor and who can
 * perform Quality Check actions (Approve / Reject / Accept All / Bulk Revision).
 * Keeping this in one place avoids the production tab and the order Inspect
 * page drifting apart on what counts as "QC access".
 */
export function useProductionAccess() {
    const { data: session, isPending: isSessionLoading } = useSession();
    const { data: meData, isLoading: isMeLoading } = useGetMeQuery({});

    const userRole = session?.user?.role as Role | undefined;
    const staff = meData?.staff;
    const isTelemarketer = staff?.designation?.toLowerCase() === 'telemarketer';

    const isAdmin = [Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER].includes(
        userRole as Role
    );
    const canDoQC = isAdmin || userRole === Role.TEAM_LEADER;

    return {
        userRole,
        staff,
        isTelemarketer,
        isAdmin,
        canDoQC,
        isLoading: isSessionLoading || isMeLoading,
    };
}
