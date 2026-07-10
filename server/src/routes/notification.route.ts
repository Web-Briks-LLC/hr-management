import { Router } from 'express';
import NotificationController from '../controllers/notification.controller.js';

const router: Router = Router();

// Get all notifications for current user
router.get('/', NotificationController.getMyNotifications);

// Get unread count
router.get('/unread-count', NotificationController.getUnreadCount);

// Mark notification as read
router.patch('/:id/read', NotificationController.markAsRead);

// Mark all as read
router.post('/read-all', NotificationController.markAllAsRead);

// Delete notification
router.delete('/:id', NotificationController.deleteNotification);

// Delete all notifications
router.delete('/', NotificationController.deleteAllNotifications);

export const notificationRoute = router;
