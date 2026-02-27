import { model, Schema, Types } from "mongoose";

export interface INotification {
    userId: Types.ObjectId;
    title: string;
    message: string;
    type:
        | "overtime"
        | "leave"
        | "attendance"
        | "shift"
        | "announcement"
        | "earning";
    priority: "low" | "medium" | "high" | "urgent";
    resourceType?:
        | "overtime"
        | "leave"
        | "staff"
        | "attendance"
        | "shift"
        | "earning";
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

const notificationSchema = new Schema<INotification>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        title: {
            type: String,
            required: true,
            maxlength: 200,
        },
        message: {
            type: String,
            required: true,
            maxlength: 500,
        },
        type: {
            type: String,
            enum: [
                "overtime",
                "leave",
                "attendance",
                "shift",
                "announcement",
                "earning",
            ],
            required: true,
            index: true,
        },
        priority: {
            type: String,
            enum: ["low", "medium", "high", "urgent"],
            default: "medium",
        },
        resourceType: {
            type: String,
            enum: [
                "overtime",
                "leave",
                "staff",
                "attendance",
                "shift",
                "earning",
            ],
        },
        resourceId: {
            type: Schema.Types.ObjectId,
        },
        actionUrl: {
            type: String,
        },
        actionLabel: {
            type: String,
            maxlength: 50,
        },
        isRead: {
            type: Boolean,
            default: false,
            index: true,
        },
        readAt: {
            type: Date,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        expiresAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    },
);

// Compound indexes for efficient queries
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1 });

// Auto-delete expired notifications
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const NotificationModel = model<INotification>(
    "Notification",
    notificationSchema,
);

export default NotificationModel;
