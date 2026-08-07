import { Role } from '@/constants/role';
import { generateRouteAccess } from './generateRouteAccess';
import { blockedRoute } from '@/constants/blocked-route';
import { sidebarData } from '@/constants/sidebar';

export function canAccess(userRole: Role, pathname: string, designation?: string): boolean {
    const autoMap = generateRouteAccess();

    const routeAccessMap = {
        ...autoMap,
        ...blockedRoute,
    };

    const matchedRoute = Object.keys(routeAccessMap)
        .sort((a, b) => b.length - a.length)
        .find(
            (route) => pathname === route || pathname.startsWith(route + '/'),
        );

    if (!matchedRoute) return true;

    // Basic role check
    if (!routeAccessMap[matchedRoute].includes(userRole)) {
        return false;
    }

    // Advanced designation check based on sidebar configuration
    const sidebarItem = sidebarData.find(item => item.url === matchedRoute);
    if (sidebarItem && sidebarItem.requiredDesignation) {
        if (
            (userRole === Role.STAFF || userRole === Role.TEAM_LEADER)
        ) {
            if (userRole === Role.TEAM_LEADER && matchedRoute === "/orders") {
                // Team Leaders can always see Orders
                return true;
            } else if (
                designation?.toLowerCase() !==
                sidebarItem.requiredDesignation.toLowerCase()
            ) {
                return false;
            }
        }
    }

    return true;
}
