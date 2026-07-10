import type { Request, Response } from 'express';
import NotificationServices from '../services/notification.service.js';

const getMyNotifications = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) throw new Error('Unauthorized');

        const { isRead, type, limit, skip } = req.query;

        // Build filters object conditionally to avoid passing undefined values
        const filters: {
            isRead?: boolean;
            type?: string;
            limit?: number;
            skip?: number;
        } = {};

        if (isRead === 'true') {
            filters.isRead = true;
        } else if (isRead === 'false') {
            filters.isRead = false;
        }

        if (type) {
            filters.type = type as string;
        }

        if (limit) {
            filters.limit = parseInt(limit as string);
        }

        if (skip) {
            filters.skip = parseInt(skip as string);
        }

        const notifications = await NotificationServices.getUserNotifications(userId, filters);

        res.status(200).json({
            success: true,
            data: notifications,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch notifications',
        });
    }
};

const getUnreadCount = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) throw new Error('Unauthorized');

        const count = await NotificationServices.getUnreadCount(userId);

        res.status(200).json({
            success: true,
            data: { count },
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get unread count',
        });
    }
};

const markAsRead = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) throw new Error('Unauthorized');

        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Notification ID is required',
            });
        }

        const notification = await NotificationServices.markAsRead(id, userId);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found',
            });
        }

        return res.status(200).json({
            success: true,
            data: notification,
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to mark notification as read',
        });
    }
};

const markAllAsRead = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) throw new Error('Unauthorized');

        const result = await NotificationServices.markAllAsRead(userId);

        res.status(200).json({
            success: true,
            data: { modifiedCount: result.modifiedCount },
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to mark all as read',
        });
    }
};

const deleteNotification = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) throw new Error('Unauthorized');

        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Notification ID is required',
            });
        }

        const result = await NotificationServices.deleteNotification(id, userId);

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Notification deleted',
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete notification',
        });
    }
};

const deleteAllNotifications = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) throw new Error('Unauthorized');

        const result = await NotificationServices.deleteAllNotifications(userId);

        res.status(200).json({
            success: true,
            data: { deletedCount: result.deletedCount },
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete all notifications',
        });
    }
};

const NotificationController = {
    getMyNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
};

export default NotificationController;
