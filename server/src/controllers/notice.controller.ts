import type { Request, Response } from 'express';
import noticeService from '../services/notice.service.js';

// Create a new notice (draft)
async function createNotice(req: Request, res: Response) {
    try {
        const {
            title,
            content,
            priority,
            category,
            isPinned,
            expiresAt,
            attachments,
        } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!title || !content) {
            return res
                .status(400)
                .json({ message: 'Title and content are required' });
        }

        const notice = await noticeService.createNotice({
            title,
            content,
            priority,
            category,
            isPinned,
            ...(expiresAt && { expiresAt: new Date(expiresAt) }),
            attachments,
            createdBy: userId,
        });

        return res.status(201).json({
            message: 'Notice created successfully',
            data: notice,
        });
    } catch (error) {
        console.error('Error creating notice:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Update a notice
async function updateNotice(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const {
            title,
            content,
            priority,
            category,
            isPinned,
            expiresAt,
            attachments,
        } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!id) {
            return res.status(400).json({ message: 'Notice ID is required' });
        }

        const notice = await noticeService.updateNotice(id, {
            title,
            content,
            priority,
            category,
            isPinned,
            ...(expiresAt !== undefined && {
                expiresAt: expiresAt === null ? null : new Date(expiresAt),
            }),
            attachments,
            updatedBy: userId,
        });

        if (!notice) {
            return res.status(404).json({ message: 'Notice not found' });
        }

        return res.status(200).json({
            message: 'Notice updated successfully',
            data: notice,
        });
    } catch (error) {
        console.error('Error updating notice:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Publish a notice
async function publishNotice(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!id) {
            return res.status(400).json({ message: 'Notice ID is required' });
        }

        const notice = await noticeService.publishNotice(id, userId);

        return res.status(200).json({
            message: 'Notice published and notifications sent to all users',
            data: notice,
        });
    } catch (error) {
        console.error('Error publishing notice:', error);
        const message =
            error instanceof Error ? error.message : 'Internal server error';
        return res.status(400).json({ message });
    }
}

// Unpublish a notice
async function unpublishNotice(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!id) {
            return res.status(400).json({ message: 'Notice ID is required' });
        }

        const notice = await noticeService.unpublishNotice(id, userId);

        if (!notice) {
            return res.status(404).json({ message: 'Notice not found' });
        }

        return res.status(200).json({
            message: 'Notice unpublished successfully',
            data: notice,
        });
    } catch (error) {
        console.error('Error unpublishing notice:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Delete a notice
async function deleteNotice(req: Request, res: Response) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ message: 'Notice ID is required' });
        }

        const result = await noticeService.deleteNotice(id);

        if (!result) {
            return res.status(404).json({ message: 'Notice not found' });
        }

        return res.status(200).json({
            message: 'Notice deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting notice:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Get all notices (admin)
async function getAllNotices(req: Request, res: Response) {
    try {
        const { isPublished, category, priority, page, limit } = req.query;

        const result = await noticeService.getAllNotices({
            ...(isPublished !== undefined && {
                isPublished: isPublished === 'true',
            }),
            category: category as string,
            priority: priority as string,
            page: page ? parseInt(page as string) : 1,
            limit: limit ? parseInt(limit as string) : 20,
        });

        return res.status(200).json({
            message: 'Notices retrieved successfully',
            data: result.notices,
            meta: {
                total: result.total,
                page: result.page,
                totalPages: result.totalPages,
            },
        });
    } catch (error) {
        console.error('Error getting notices:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Get published notices (for all users)
async function getPublishedNotices(req: Request, res: Response) {
    try {
        const { category, page, limit } = req.query;

        const result = await noticeService.getPublishedNotices({
            category: category as string,
            page: page ? parseInt(page as string) : 1,
            limit: limit ? parseInt(limit as string) : 20,
        });

        return res.status(200).json({
            message: 'Notices retrieved successfully',
            data: result.notices,
            meta: {
                total: result.total,
                page: result.page,
                totalPages: result.totalPages,
            },
        });
    } catch (error) {
        console.error('Error getting published notices:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Get unread notices for floating popup
async function getUnreadNotices(req: Request, res: Response) {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const notices = await noticeService.getUnreadNotices(userId);

        return res.status(200).json({
            message: 'Unread notices retrieved successfully',
            data: notices,
        });
    } catch (error) {
        console.error('Error getting unread notices:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Get a single notice by ID
async function getNoticeById(req: Request, res: Response) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ message: 'Notice ID is required' });
        }

        const notice = await noticeService.getNoticeById(id);

        if (!notice) {
            return res.status(404).json({ message: 'Notice not found' });
        }

        return res.status(200).json({
            message: 'Notice retrieved successfully',
            data: notice,
        });
    } catch (error) {
        console.error('Error getting notice:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Mark notice as viewed
async function markAsViewed(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!id) {
            return res.status(400).json({ message: 'Notice ID is required' });
        }

        const notice = await noticeService.markAsViewed(id, userId);

        if (!notice) {
            return res.status(404).json({ message: 'Notice not found' });
        }

        return res.status(200).json({
            message: 'Notice marked as viewed',
            data: notice,
        });
    } catch (error) {
        console.error('Error marking notice as viewed:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Mark multiple notices as viewed
async function markMultipleAsViewed(req: Request, res: Response) {
    try {
        const { noticeIds } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!noticeIds || !Array.isArray(noticeIds)) {
            return res
                .status(400)
                .json({ message: 'noticeIds array is required' });
        }

        const result = await noticeService.markMultipleAsViewed(
            noticeIds,
            userId
        );

        return res.status(200).json({
            message: 'Notices marked as viewed',
            data: result,
        });
    } catch (error) {
        console.error('Error marking notices as viewed:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Get notice statistics (admin)
async function getNoticeStats(req: Request, res: Response) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ message: 'Notice ID is required' });
        }

        const stats = await noticeService.getNoticeStats(id);

        if (!stats) {
            return res.status(404).json({ message: 'Notice not found' });
        }

        return res.status(200).json({
            message: 'Notice stats retrieved successfully',
            data: stats,
        });
    } catch (error) {
        console.error('Error getting notice stats:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export default {
    createNotice,
    updateNotice,
    publishNotice,
    unpublishNotice,
    deleteNotice,
    getAllNotices,
    getPublishedNotices,
    getUnreadNotices,
    getNoticeById,
    markAsViewed,
    markMultipleAsViewed,
    getNoticeStats,
};
