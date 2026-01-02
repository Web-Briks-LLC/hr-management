export type NoticePriority = 'low' | 'medium' | 'high' | 'urgent';
export type NoticeCategory =
    | 'general'
    | 'policy'
    | 'event'
    | 'holiday'
    | 'maintenance'
    | 'other';

export interface NoticeAttachment {
    url: string;
    fileName: string;
    publicId?: string;
}

export interface INotice {
    _id: string;
    title: string;
    content: string;
    priority: NoticePriority;
    category: NoticeCategory;
    isPublished: boolean;
    publishedAt?: string;
    expiresAt?: string;
    isPinned: boolean;
    attachments?: NoticeAttachment[];
    createdBy: {
        _id: string;
        name: string;
        email: string;
    };
    updatedBy?: {
        _id: string;
        name: string;
        email: string;
    };
    viewedBy?: string[];
    createdAt: string;
    updatedAt: string;
}

export interface CreateNoticeInput {
    title: string;
    content: string;
    priority?: NoticePriority;
    category?: NoticeCategory;
    isPinned?: boolean;
    expiresAt?: string;
    attachments?: NoticeAttachment[];
}

export interface UpdateNoticeInput extends Partial<CreateNoticeInput> {}

export interface NoticeFilters {
    isPublished?: boolean;
    category?: NoticeCategory;
    priority?: NoticePriority;
    page?: number;
    limit?: number;
}

export const NOTICE_PRIORITY_LABELS: Record<NoticePriority, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',
};

export const NOTICE_CATEGORY_LABELS: Record<NoticeCategory, string> = {
    general: 'General',
    policy: 'Policy Update',
    event: 'Event',
    holiday: 'Holiday',
    maintenance: 'Maintenance',
    other: 'Other',
};

export const NOTICE_PRIORITY_COLORS: Record<NoticePriority, string> = {
    low: 'bg-slate-100 text-slate-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
};

export const NOTICE_CATEGORY_COLORS: Record<NoticeCategory, string> = {
    general: 'bg-gray-100 text-gray-800',
    policy: 'bg-purple-100 text-purple-800',
    event: 'bg-green-100 text-green-800',
    holiday: 'bg-pink-100 text-pink-800',
    maintenance: 'bg-yellow-100 text-yellow-800',
    other: 'bg-teal-100 text-teal-800',
};
