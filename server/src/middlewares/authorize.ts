import type { Request, Response, NextFunction } from 'express';

export const authorize =
    (...allowedRoles: string[]) =>
    (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user;

            if (!user || !user.role) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized',
                });
            }

            if (!allowedRoles.includes(user.role)) {
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden: You do not have permission',
                });
            }

            next();
            return;
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Authorization failed',
            });
        }
    };
