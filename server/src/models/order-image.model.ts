import { model, Schema } from 'mongoose';
import type { IOrderImage } from '../types/order-image.type.js';

const imageCompletedStepSchema = new Schema(
    {
        stepName: {
            type: String,
            required: true,
            trim: true,
        },
        completedBy: {
            type: Schema.Types.ObjectId,
            ref: 'Staff',
            required: true,
        },
        shiftId: {
            type: Schema.Types.ObjectId,
            ref: 'Shift',
        },
        completedAt: {
            type: Date,
            default: Date.now,
        },
        durationSeconds: {
            type: Number,
            default: 0,
        },
        sessionId: {
            type: Schema.Types.ObjectId,
            ref: 'ProductionWorkSession',
        },
    },
    { _id: false }
);

const imageRevisionEntrySchema = new Schema(
    {
        instruction: {
            type: String,
            required: true,
            trim: true,
        },
        requestedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
        resolvedAt: {
            type: Date,
        },
        resolvedBy: {
            type: Schema.Types.ObjectId,
            ref: 'Staff',
        },
    },
    { _id: false }
);

const orderImageSchema = new Schema<IOrderImage>(
    {
        orderId: {
            type: Schema.Types.ObjectId,
            ref: 'Order',
            required: true,
            index: true,
        },
        imageName: {
            type: String,
            required: true,
            trim: true,
        },
        status: {
            type: String,
            enum: [
                'unassigned',
                'in_progress',
                'partially_completed',
                'pending_qc',
                'completed',
                'in_revision',
            ],
            default: 'unassigned',
            index: true,
        },
        requiredSteps: [
            {
                type: String,
                trim: true,
            },
        ],
        completedSteps: [imageCompletedStepSchema],
        currentAssignedStaffId: {
            type: Schema.Types.ObjectId,
            ref: 'Staff',
            index: true,
            default: null,
        },
        currentSessionId: {
            type: Schema.Types.ObjectId,
            ref: 'ProductionWorkSession',
            default: null,
        },
        lockedAt: {
            type: Date,
            default: null,
        },
        isRevision: {
            type: Boolean,
            default: false,
            index: true,
        },
        revisionHistory: [imageRevisionEntrySchema],
        qcApprovedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        qcApprovedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

// Compound unique index: no duplicate image name within the same order
orderImageSchema.index({ orderId: 1, imageName: 1 }, { unique: true });
orderImageSchema.index({ orderId: 1, status: 1 });
orderImageSchema.index({ currentAssignedStaffId: 1, status: 1 });
orderImageSchema.index({ 'completedSteps.completedBy': 1, 'completedSteps.completedAt': -1 });

const OrderImageModel = model<IOrderImage>('OrderImage', orderImageSchema);
export default OrderImageModel;
