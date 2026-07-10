import type { Request, Response, NextFunction } from 'express';
import { auth } from '../lib/auth.js';

export async function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const session = await auth.api.getSession({
            headers: req.headers,
        });

        if (!session || !session.user || !session.user.role) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized. Please login.',
            });
        }

        req.user = {
            ...session.user,
            role: session.user.role as string,
        };

        next();
        return;
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token.',
        });
    }
}
