import NoticeModel from '../models/notice.model.js';
import NotificationModel from '../models/notification.model.js';
import { Types } from 'mongoose';

interface CreateNoticeInput {
    title: string;
    content: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    category?:
        | 'general'
        | 'policy'
        | 'event'
        | 'holiday'
        | 'maintenance'
        | 'other';
    isPinned?: boolean;
    expiresAt?: Date;
    attachments?: { url: string; fileName: string; publicId?: string }[];
    createdBy: string;
}

interface UpdateNoticeInput {
    title?: string;
    content?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    category?:
        | 'general'
        | 'policy'
        | 'event'
        | 'holiday'
        | 'maintenance'
        | 'other';
    isPinned?: boolean;
    expiresAt?: Date | null;
    attachments?: { url: string; fileName: string; publicId?: string }[];
    updatedBy: string;
}

interface GetNoticesFilters {
    isPublished?: boolean;
    category?: string;
    priority?: string;
    page?: number;
    limit?: number;
}

// Create a notice (draft by default)
const createNotice = async (data: CreateNoticeInput) => {
    const notice = await NoticeModel.create({
        title: data.title,
        content: data.content,
        priority: data.priority || 'medium',
        category: data.category || 'general',
        isPinned: data.isPinned || false,
        ...(data.expiresAt && { expiresAt: data.expiresAt }),
        attachments: data.attachments || [],
        createdBy: new Types.ObjectId(data.createdBy),
        isPublished: false,
        viewedBy: [],
    });

    return notice;
};

// Update a notice
const updateNotice = async (noticeId: string, data: UpdateNoticeInput) => {
    const updateData: any = {
        updatedBy: new Types.ObjectId(data.updatedBy),
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.isPinned !== undefined) updateData.isPinned = data.isPinned;
    if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt;
    if (data.attachments !== undefined)
        updateData.attachments = data.attachments;

    const notice = await NoticeModel.findByIdAndUpdate(noticeId, updateData, {
        new: true,
    });

    return notice;
};

// Publish a notice and notify all users
const publishNotice = async (noticeId: string, publishedBy: string) => {
    const notice = await NoticeModel.findByIdAndUpdate(
        noticeId,
        {
            isPublished: true,
            publishedAt: new Date(),
            updatedBy: new Types.ObjectId(publishedBy),
        },
        { new: true }
    );

    if (!notice) {
        throw new Error('Notice not found');
    }

    // Get all users and send notifications
    // UserModel is a MongoDB collection (not mongoose model) because better-auth manages it
    const { default: UserCollection } = await import('../models/user.model.js');
    const users = await UserCollection.find({}).toArray();

    // Create notifications for all users
    const notifications = users.map((user: any) => ({
        userId: user._id,
        title: '📢 New Notice',
        message: notice.title,
        type: 'announcement' as const,
        priority:
            notice.priority === 'urgent'
                ? ('urgent' as const)
                : ('high' as const),
        resourceType: 'staff' as const,
        resourceId: notice._id,
        actionUrl: `/notices`,
        actionLabel: 'View Notice',
        createdBy: new Types.ObjectId(publishedBy),
    }));

    if (notifications.length > 0) {
        await NotificationModel.insertMany(notifications);
    }

    return notice;
};

// Unpublish a notice
const unpublishNotice = async (noticeId: string, unpublishedBy: string) => {
    const notice = await NoticeModel.findByIdAndUpdate(
        noticeId,
        {
            isPublished: false,
            updatedBy: new Types.ObjectId(unpublishedBy),
        },
        { new: true }
    );

    return notice;
};

// Delete a notice
const deleteNotice = async (noticeId: string) => {
    const result = await NoticeModel.findByIdAndDelete(noticeId);
    return result;
};

// Get all notices (admin view)
const getAllNotices = async (filters: GetNoticesFilters) => {
    const query: any = {};

    if (filters.isPublished !== undefined) {
        query.isPublished = filters.isPublished;
    }
    if (filters.category) {
        query.category = filters.category;
    }
    if (filters.priority) {
        query.priority = filters.priority;
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [notices, total] = await Promise.all([
        NoticeModel.find(query)
            .sort({ isPinned: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        NoticeModel.countDocuments(query),
    ]);

    return {
        notices,
        total,
        page,
        totalPages: Math.ceil(total / limit),
    };
};

// Get published notices (for staff view)
const getPublishedNotices = async (filters: GetNoticesFilters) => {
    const query: any = {
        isPublished: true,
        $or: [
            { expiresAt: null },
            { expiresAt: { $exists: false } },
            { expiresAt: { $gt: new Date() } },
        ],
    };

    if (filters.category) {
        query.category = filters.category;
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [notices, total] = await Promise.all([
        NoticeModel.find(query)
            .sort({ isPinned: -1, publishedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        NoticeModel.countDocuments(query),
    ]);

    return {
        notices,
        total,
        page,
        totalPages: Math.ceil(total / limit),
    };
};

// Get unread notices for a user (for floating popup)
const getUnreadNotices = async (userId: string) => {
    const notices = await NoticeModel.find({
        isPublished: true,
        viewedBy: { $ne: new Types.ObjectId(userId) },
        $or: [
            { expiresAt: null },
            { expiresAt: { $exists: false } },
            { expiresAt: { $gt: new Date() } },
        ],
    })
        .sort({ isPinned: -1, publishedAt: -1 })
        .lean();

    return notices;
};

// Get a single notice by ID
const getNoticeById = async (noticeId: string) => {
    const notice = await NoticeModel.findById(noticeId).lean();

    return notice;
};

// Mark notice as viewed by user
const markAsViewed = async (noticeId: string, userId: string) => {
    const notice = await NoticeModel.findByIdAndUpdate(
        noticeId,
        {
            $addToSet: { viewedBy: new Types.ObjectId(userId) },
        },
        { new: true }
    );

    return notice;
};

// Mark multiple notices as viewed by user
const markMultipleAsViewed = async (noticeIds: string[], userId: string) => {
    const result = await NoticeModel.updateMany(
        { _id: { $in: noticeIds.map((id) => new Types.ObjectId(id)) } },
        { $addToSet: { viewedBy: new Types.ObjectId(userId) } }
    );

    return result;
};

// Get view statistics for a notice
const getNoticeStats = async (noticeId: string) => {
    const notice = await NoticeModel.findById(noticeId).lean();

    if (!notice) {
        return null;
    }

    return {
        totalViews: notice.viewedBy.length,
        viewedBy: notice.viewedBy,
    };
};

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
