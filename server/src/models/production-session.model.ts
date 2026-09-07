import { model, Schema } from 'mongoose';
import type { IProductionWorkSession } from '../types/production-session.type.js';

const productionWorkSessionSchema = new Schema<IProductionWorkSession>(
    {
        staffId: {
            type: Schema.Types.ObjectId,
            ref: 'Staff',
            required: true,
            index: true,
        },
        orderId: {
            type: Schema.Types.ObjectId,
            ref: 'Order',
            required: true,
            index: true,
        },
        shiftId: {
            type: Schema.Types.ObjectId,
            ref: 'Shift',
            index: true,
        },
        branchId: {
            type: Schema.Types.ObjectId,
            ref: 'Branch',
            index: true,
        },
        imageNames: [
            {
                type: String,
                trim: true,
            },
        ],
        imageCount: {
            type: Number,
            required: true,
            min: 1,
            default: 1,
        },
        startTime: {
            type: Date,
            required: true,
            default: Date.now,
        },
        endTime: {
            type: Date,
        },
        durationSeconds: {
            type: Number,
            default: 0,
            min: 0,
        },
        status: {
            type: String,
            enum: ['active', 'completed', 'cancelled', 'paused', 'reassigned'],
            default: 'active',
            index: true,
        },
        completedSteps: [
            {
                type: String,
                trim: true,
            },
        ],
        notes: {
            type: String,
            trim: true,
        },

        // --- Hold / Resume tracking ---
        // When the session is currently on hold, `pausedAt` is the moment it was
        // held. `totalPausedSeconds` accumulates every completed hold interval so
        // effective work time = (end|now - start) - totalPausedSeconds - (open hold).
        pausedAt: {
            type: Date,
            default: null,
        },
        totalPausedSeconds: {
            type: Number,
            default: 0,
            min: 0,
        },
        pauseHistory: [
            {
                _id: false,
                pausedAt: { type: Date, required: true },
                resumedAt: { type: Date, default: null },
                byUserId: { type: Schema.Types.ObjectId, ref: 'User' },
            },
        ],

        // --- Reassignment chain ---
        // On reassign the old session is closed with status 'reassigned' (its
        // effective duration is still recorded and still counts in analytics),
        // and a fresh session is created for the new editor. The new session
        // carries `priorAccumulatedSeconds` so the UI can show cumulative time
        // spent on this image batch across every editor who touched it.
        priorAccumulatedSeconds: {
            type: Number,
            default: 0,
            min: 0,
        },
        reassignedFromSessionId: {
            type: Schema.Types.ObjectId,
            ref: 'ProductionWorkSession',
            default: null,
        },
        reassignedToSessionId: {
            type: Schema.Types.ObjectId,
            ref: 'ProductionWorkSession',
            default: null,
        },

        // Admin / Team Leader who force-finished, force-cancelled or reassigned
        // this session (null when the owning editor closed it themselves).
        closedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        closeReason: {
            type: String,
            trim: true,
        },
    },
    { timestamps: true }
);

productionWorkSessionSchema.index({ staffId: 1, status: 1 });
productionWorkSessionSchema.index({ orderId: 1, createdAt: -1 });
productionWorkSessionSchema.index({ staffId: 1, startTime: -1 });

const ProductionWorkSessionModel = model<IProductionWorkSession>(
    'ProductionWorkSession',
    productionWorkSessionSchema
);

export default ProductionWorkSessionModel;
