import { model, Schema, Types } from 'mongoose';

export interface INotice {
    title: string;
    content: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    category:
        | 'general'
        | 'policy'
        | 'event'
        | 'holiday'
        | 'maintenance'
        | 'other';
    isPublished: boolean;
    publishedAt?: Date;
    expiresAt?: Date;
    isPinned: boolean;
    attachments?: { url: string; fileName: string; publicId?: string }[];
    createdBy: Types.ObjectId;
    updatedBy?: Types.ObjectId;
    viewedBy: Types.ObjectId[]; // Users who have viewed/dismissed this notice
    createdAt: Date;
    updatedAt: Date;
}

const noticeSchema = new Schema<INotice>(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },
        content: {
            type: String,
            required: true,
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'urgent'],
            default: 'medium',
        },
        category: {
            type: String,
            enum: [
                'general',
                'policy',
                'event',
                'holiday',
                'maintenance',
                'other',
            ],
            default: 'general',
        },
        isPublished: {
            type: Boolean,
            default: false,
        },
        publishedAt: {
            type: Date,
        },
        expiresAt: {
            type: Date,
        },
        isPinned: {
            type: Boolean,
            default: false,
        },
        attachments: [
            {
                url: { type: String, required: true },
                fileName: { type: String, required: true },
                publicId: { type: String },
            },
        ],
        createdBy: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
        },
        viewedBy: [
            {
                type: Schema.Types.ObjectId,
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Indexes
noticeSchema.index({ isPublished: 1, publishedAt: -1 });
noticeSchema.index({ isPublished: 1, isPinned: -1, publishedAt: -1 });
noticeSchema.index({ expiresAt: 1 });

const NoticeModel = model<INotice>('Notice', noticeSchema);

export default NoticeModel;
