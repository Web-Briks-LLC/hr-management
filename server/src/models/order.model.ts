import { model, Schema } from 'mongoose';
import type { IOrder } from '../types/order.type.js';

const revisionInstructionSchema = new Schema(
    {
        instruction: {
            type: String,
            required: true,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    { _id: false }
);

const timelineEntrySchema = new Schema(
    {
        status: {
            type: String,
            enum: [
                'pending',
                'in_progress',
                'quality_check',
                'revision',
                'ready_to_deliver',
                'completed',
                'delivered',
                'cancelled',
            ],
            required: true,
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
        changedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        note: {
            type: String,
        },
    },
    { _id: false }
);

const orderRequiredStepSchema = new Schema(
    {
        stepId: {
            type: String,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        code: {
            type: String,
            required: true,
            trim: true,
        },
        serviceId: {
            type: Schema.Types.ObjectId,
            ref: 'Service',
        },
        order: {
            type: Number,
            default: 0,
        },
    },
    { _id: false }
);

const orderSchema = new Schema<IOrder>(
    {
        orderName: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        clientId: {
            type: Schema.Types.ObjectId,
            ref: 'Client',
            required: true,
            index: true,
        },
        orderDate: {
            type: Date,
            required: true,
            index: true,
        },
        deadline: {
            type: Date,
            required: true,
            index: true,
        },
        originalDeadline: {
            type: Date,
        },
        imageQuantity: {
            type: Number,
            required: true,
            min: 1,
        },
        perImagePrice: {
            type: Number,
            required: true,
            min: 0,
        },
        totalPrice: {
            type: Number,
            required: true,
            min: 0,
        },
        services: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Service',
                required: true,
            },
        ],
        requiredSteps: [orderRequiredStepSchema],

        returnFileFormat: {
            type: Schema.Types.ObjectId,
            ref: 'ReturnFileFormat',
            required: true,
        },
        instruction: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
            enum: [
                'pending',
                'in_progress',
                'quality_check',
                'revision',
                'ready_to_deliver',
                'completed',
                'delivered',
                'cancelled',
            ],
            default: 'pending',
            index: true,
        },
        priority: {
            type: String,
            enum: ['low', 'normal', 'high', 'urgent'],
            default: 'normal',
            index: true,
        },
        contactPersonId: {
            type: Schema.Types.ObjectId,
            index: true,
        },
        notes: {
            type: String,
            trim: true,
        },
        revisionCount: {
            type: Number,
            default: 0,
        },
        isLegacy: {
            type: Boolean,
            default: false,
            index: true,
        },
        revisionInstructions: [revisionInstructionSchema],
        timeline: [timelineEntrySchema],
        completedAt: {
            type: Date,
        },
        deliveredAt: {
            type: Date,
        },
        invoiceNumber: {
            type: String,
            index: true,
        },
        isPaid: {
            type: Boolean,
            default: false,
            index: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual for Earning
orderSchema.virtual('earning', {
    ref: 'Earning',
    localField: '_id',
    foreignField: 'orderId',
    justOne: true,
});

// Compound indexes for common queries
orderSchema.index({ clientId: 1, orderDate: -1 });
orderSchema.index({ status: 1, deadline: 1 });

// Text search index
orderSchema.index({ orderName: 'text' });

/**
 * Auto-complete: once an order is paid (isPaid becomes true) it moves to
 * "completed", unless it is already completed, delivered or cancelled.
 * Covers save() and updateOne/updateMany/findOneAndUpdate, so every payment
 * path (earnings, invoices, withdrawals) triggers it.
 */
const AUTO_COMPLETE_SKIP = ['completed', 'delivered', 'cancelled'];
const AUTO_COMPLETE_NOTE = 'Order marked completed automatically because payment was received';

orderSchema.pre('save', function () {
    if (this.isModified('isPaid') && this.isPaid && !AUTO_COMPLETE_SKIP.includes(this.status)) {
        this.status = 'completed';
        this.completedAt = this.completedAt || new Date();
        this.timeline.push({
            status: 'completed',
            timestamp: new Date(),
            changedBy: this.createdBy,
            note: AUTO_COMPLETE_NOTE,
        } as any);
    }
});

const setsPaid = (update: any): boolean => {
    if (!update) return false;
    if (Array.isArray(update)) return update.some(setsPaid);
    return update.isPaid === true || update.$set?.isPaid === true;
};

for (const op of ['updateOne', 'updateMany', 'findOneAndUpdate'] as const) {
    orderSchema.pre(op, function (this: any) {
        // Remember the filter so the post hook can find the orders that were just paid.
        this._autoCompleteFilter = setsPaid(this.getUpdate()) ? { ...this.getFilter() } : null;
    });
    orderSchema.post(op, async function (this: any) {
        const filter = this._autoCompleteFilter;
        if (!filter) return;
        const session = this.getOptions?.().session || null;
        const paid = await this.model
            .find({ ...filter, isPaid: true, status: { $nin: AUTO_COMPLETE_SKIP } })
            .select('_id createdBy')
            .session(session)
            .lean();
        if (!paid.length) return;
        const now = new Date();
        await this.model.bulkWrite(
            paid.map((order: any) => ({
                updateOne: {
                    filter: { _id: order._id },
                    update: {
                        $set: { status: 'completed', completedAt: now },
                        $push: {
                            timeline: {
                                status: 'completed',
                                timestamp: now,
                                changedBy: order.createdBy,
                                note: AUTO_COMPLETE_NOTE,
                            },
                        },
                    },
                },
            })),
            { session }
        );
    });
}

const OrderModel = model<IOrder>('Order', orderSchema);
export default OrderModel;
