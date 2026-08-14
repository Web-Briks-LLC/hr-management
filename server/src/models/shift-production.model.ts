import { model, Schema } from 'mongoose';
import type { IShiftProduction } from '../types/production.type.js';

const productionStaffAssignmentSchema = new Schema(
    {
        staffId: {
            type: Schema.Types.ObjectId,
            ref: 'Staff',
            required: true,
        },
        imageCount: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        notes: {
            type: String,
            trim: true,
        },
    },
    { _id: false }
);

const productionQCSchema = new Schema(
    {
        checkedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        passedCount: {
            type: Number,
            min: 0,
            default: 0,
        },
        rejectedCount: {
            type: Number,
            min: 0,
            default: 0,
        },
        qcNotes: {
            type: String,
            trim: true,
        },
        checkedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false }
);

const productionRevisionSchema = new Schema(
    {
        isRevision: {
            type: Boolean,
            default: false,
        },
        revisionCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        instructions: {
            type: String,
            trim: true,
        },
        resolvedCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        previousLogId: {
            type: Schema.Types.ObjectId,
            ref: 'ShiftProduction',
        },
    },
    { _id: false }
);

const shiftProductionSchema = new Schema<IShiftProduction>(
    {
        orderId: {
            type: Schema.Types.ObjectId,
            ref: 'Order',
            required: true,
            index: true,
        },
        shiftId: {
            type: Schema.Types.ObjectId,
            ref: 'Shift',
            required: true,
            index: true,
        },
        branchId: {
            type: Schema.Types.ObjectId,
            ref: 'Branch',
            required: true,
            index: true,
        },
        date: {
            type: Date,
            required: true,
            default: Date.now,
            index: true,
        },
        teamLeaderId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        serviceId: {
            type: Schema.Types.ObjectId,
            ref: 'Service',
            index: true,
        },
        stage: {
            type: String,
            enum: [
                'clipping_path',
                'masking',
                'retouching',
                'ghost_mannequin',
                'color_correction',
                'neck_joint',
                'shadow_creation',
                'vector_conversion',
                'other',
            ],
            default: 'clipping_path',
            index: true,
        },
        customStageName: {
            type: String,
            trim: true,
        },
        targetQuantity: {
            type: Number,
            min: 0,
            default: 0,
        },
        completedQuantity: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        status: {
            type: String,
            enum: [
                'in_progress',
                'partially_completed',
                'completed',
                'quality_check',
                'revision_required',
            ],
            default: 'in_progress',
            index: true,
        },
        assignedStaffs: [productionStaffAssignmentSchema],
        qc: productionQCSchema,
        revision: productionRevisionSchema,
        handoverNotes: {
            type: String,
            trim: true,
        },
        bottlenecks: {
            type: String,
            trim: true,
        },
        isVerifiedByAdmin: {
            type: Boolean,
            default: false,
            index: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// High-performance compound indexes for dashboard and report queries
shiftProductionSchema.index({ orderId: 1, date: -1 });
shiftProductionSchema.index({ shiftId: 1, date: -1 });
shiftProductionSchema.index({ branchId: 1, date: -1 });
shiftProductionSchema.index({ status: 1, date: -1 });
shiftProductionSchema.index({ orderId: 1, serviceId: 1, stage: 1 });

const ShiftProductionModel = model<IShiftProduction>(
    'ShiftProduction',
    shiftProductionSchema
);

export default ShiftProductionModel;
