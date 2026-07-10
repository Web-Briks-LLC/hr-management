import type { Types } from 'mongoose';

export default interface INotification {
    userId: Types.ObjectId;
    title: string;
    message: string;
    type: 'overtime' | 'leave' | 'attendance' | 'shift' | 'announcement';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    resourceType?: 'overtime' | 'leave' | 'staff' | 'attendance' | 'shift';
    resourceId?: Types.ObjectId;
    actionUrl?: string;
    actionLabel?: string;
    isRead: boolean;
    readAt?: Date;
    createdBy?: Types.ObjectId;
    expiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
