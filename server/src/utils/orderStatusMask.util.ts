import { Role } from '../constants/role.js';

/**
 * Only admin / super_admin are allowed to see (and set) the final
 * `completed` and `delivered` order statuses. Everyone else sees these
 * as `ready_to_deliver`.
 */
export const canSeeFinalOrderStatus = (role?: string): boolean =>
    role === Role.ADMIN || role === Role.SUPER_ADMIN;

/**
 * Mutates the given order (plain object or lean doc): if the viewer is not
 * allowed to see final statuses, rewrites `completed` / `delivered` to
 * `ready_to_deliver`.
 */
export const maskFinalOrderStatus = <T extends { status?: string }>(
    order: T | null | undefined,
    role?: string
): T | null | undefined => {
    if (!order || canSeeFinalOrderStatus(role)) return order;
    if (order.status === 'completed' || order.status === 'delivered') {
        order.status = 'ready_to_deliver';
    }
    return order;
};
