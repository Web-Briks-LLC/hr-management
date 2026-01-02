import { Router } from 'express';
import NoticeController from '../controllers/notice.controller.js';

const router = Router();

// Public routes (requires auth but not admin)
router.get('/published', NoticeController.getPublishedNotices);
router.get('/unread', NoticeController.getUnreadNotices);
router.get('/:id', NoticeController.getNoticeById);
router.post('/:id/view', NoticeController.markAsViewed);
router.post('/mark-viewed', NoticeController.markMultipleAsViewed);

// Admin routes
router.get('/', NoticeController.getAllNotices);
router.post('/', NoticeController.createNotice);
router.put('/:id', NoticeController.updateNotice);
router.post('/:id/publish', NoticeController.publishNotice);
router.post('/:id/unpublish', NoticeController.unpublishNotice);
router.delete('/:id', NoticeController.deleteNotice);
router.get('/:id/stats', NoticeController.getNoticeStats);

export const noticeRoute = router;
