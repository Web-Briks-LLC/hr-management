import type { Request, Response, NextFunction } from 'express';
import { Role } from '../constants/role.js';
import { isTelemarketer } from '../utils/telemarketer.util.js';

/**
 * Middleware to authorize access for:
 * 1. Admin roles (super_admin, admin, hr_manager)
 * 2. Team Leader (any team leader can create orders and view clients, though with masked data if not TM)
 * 3. Staff roles ONLY if they have the 'Telemarketer' designation
 */
export const authorizeOrderAccess = async (
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

        // 2. Check if Team Leader
        if (role === Role.TEAM_LEADER) {
            return next();
        }

        // 3. Check if Staff is a Telemarketer
        if (role === Role.STAFF) {
            const isTM = await isTelemarketer(user.id);
            if (isTM) {
                return next();
            }
        }

        // 4. Otherwise, Forbidden
        return res.status(403).json({
            success: false,
            message: 'Forbidden: You do not have permission',
        });
    } catch (error) {
        console.error('authorizeOrderAccess error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authorization failed',
        });
    }
};
