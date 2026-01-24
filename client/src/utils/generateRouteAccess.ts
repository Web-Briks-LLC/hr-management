import { sidebarData } from '@/constants/sidebar';
import { Role } from '@/constants/role';

export function generateRouteAccess() {
    const map: Record<string, Role[]> = {};

    for (const item of sidebarData) {
        map[item.url] = item.access;
    }

    return map;
}
