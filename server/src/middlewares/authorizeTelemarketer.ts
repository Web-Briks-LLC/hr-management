import type { Request, Response, NextFunction } from 'express';
import { Role } from '../constants/role.js';
import { isTelemarketer } from '../utils/telemarketer.util.js';

/**
 * Middleware to authorize access for:
 * 1. Admin roles (super_admin, admin, hr_manager)
 * 2. Staff/Team Leader roles ONLY if they have the 'Telemarketer' designation
 */
export const authorizeTelemarketer = async (
    req: Request,
    res: Response,
    next: NextFunction,
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

        // 1. Check for Admin roles
        const adminRoles = [Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER];
        if (adminRoles.includes(role)) {
            return next();
        }

        // 2. Check if Staff/Team Leader is a Telemarketer
        if (role === Role.STAFF || role === Role.TEAM_LEADER) {
            const isTM = await isTelemarketer(user.id);
            if (isTM) {
                return next();
            }
        }

        // 3. Otherwise, Forbidden
        return res.status(403).json({
            success: false,
            message: 'Forbidden: You do not have permission',
        });
    } catch (error) {
        console.error('authorizeTelemarketer error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authorization failed',
        });
    }
};
