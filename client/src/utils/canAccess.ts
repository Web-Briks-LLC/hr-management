import { Role } from '@/constants/role';
import { generateRouteAccess } from './generateRouteAccess';
import { blockedRoute } from '@/constants/blocked-route';

export function canAccess(userRole: Role, pathname: string): boolean {
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

    return routeAccessMap[matchedRoute].includes(userRole);
}
