import type { Request, Response, NextFunction } from 'express';
import { Role } from '../constants/role.js';
import { isTelemarketer } from '../utils/telemarketer.util.js';

/**
 * Middleware to authorize access for the Production & Shift Management Module:
 * 1. Admin roles (super_admin, admin, hr_manager) -> Always authorized.
 * 2. Team Leader -> Authorized ONLY if their designation is NOT 'telemarketer'.
 * 3. Telemarketers / Unauthorized users -> Forbidden (403).
 */
export const authorizeProductionAccess = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = req.user;

        if (!user || !user.role || !user.id) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized. Please login.',
            });
        }

        const role = user.role as Role;

        // 1. Admin roles have full access
        const adminRoles = [Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER];
        if (adminRoles.includes(role)) {
            return next();
        }

        // 2. Team Leader access (must NOT be a telemarketer)
        if (role === Role.TEAM_LEADER) {
            const isTM = await isTelemarketer(user.id);
            if (!isTM) {
                return next();
            }
        }

        // 3. Otherwise, Forbidden
        return res.status(403).json({
            success: false,
            message: 'Forbidden: You do not have permission to access the production management system.',
        });
    } catch (error) {
        console.error('authorizeProductionAccess error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authorization failed',
        });
    }
};
