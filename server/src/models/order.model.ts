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
 * If that payment is later reversed (isPaid becomes false) and nobody has
 * touched the status since, the order returns to the status it had before.
 * Covers save() and updateOne/updateMany/findOneAndUpdate, so every payment
 * path (earnings, invoices, withdrawals) triggers it.
 */
const AUTO_COMPLETE_SKIP = ['completed', 'delivered', 'cancelled'];
export const AUTO_COMPLETE_NOTE =
    'Order marked completed automatically because payment was received';
const AUTO_REVERT_NOTE =
    'Order moved back automatically because the payment was reversed';

const lastTimeline = (order: any) => order.timeline?.[order.timeline.length - 1];
/** True when the last thing that happened to the order was our own auto-complete. */
const isAutoCompleted = (order: any) =>
    order.status === 'completed' && lastTimeline(order)?.note === AUTO_COMPLETE_NOTE;
/** The status the order had right before it was auto-completed. */
const statusBeforeAutoComplete = (order: any) => {
    const entries = order.timeline || [];
    const previous = entries[entries.length - 2];
    return previous?.status && previous.status !== 'completed'
        ? previous.status
        : 'in_progress';
};

orderSchema.pre('save', function () {
    if (!this.isModified('isPaid')) return;
    if (this.isPaid && !AUTO_COMPLETE_SKIP.includes(this.status)) {
        this.status = 'completed';
        this.completedAt = this.completedAt || new Date();
        this.timeline.push({
            status: 'completed',
            timestamp: new Date(),
            changedBy: this.createdBy,
            note: AUTO_COMPLETE_NOTE,
        } as any);
    } else if (!this.isPaid && !this.isNew && isAutoCompleted(this)) {
        const back = statusBeforeAutoComplete(this);
        this.status = back;
        this.set('completedAt', undefined);
        this.timeline.push({
            status: back,
            timestamp: new Date(),
            changedBy: this.createdBy,
            note: AUTO_REVERT_NOTE,
        } as any);
    }
});

/** The isPaid value an update sets, or undefined when it does not touch isPaid. */
const paidValueOf = (update: any): boolean | undefined => {
    if (!update) return undefined;
    if (Array.isArray(update)) {
        for (const stage of update) {
            const value = paidValueOf(stage?.$set ?? stage?.$addFields);
            if (typeof value === 'boolean') return value;
        }
        return undefined;
    }
    const direct = update.isPaid ?? update.$set?.isPaid;
    return typeof direct === 'boolean' ? direct : undefined;
};

for (const op of ['updateOne', 'updateMany', 'findOneAndUpdate'] as const) {
    orderSchema.pre(op, async function (this: any) {
        this._autoPaidChange = null;
        const paid = paidValueOf(this.getUpdate());
        if (paid === undefined) return;
        // Remember exactly which orders this update touches: the update itself can
        // change the fields the filter looked at.
        const session = this.getOptions?.().session || null;
        let query = this.model.find(this.getFilter()).select('_id').session(session);
        if (op !== 'updateMany') query = query.limit(1);
        const ids = (await query.lean()).map((doc: any) => doc._id);
        this._autoPaidChange = { paid, ids };
    });
    orderSchema.post(op, async function (this: any) {
        const change = this._autoPaidChange;
        if (!change?.ids.length) return;
        const session = this.getOptions?.().session || null;
        const orders = await this.model
            .find({ _id: { $in: change.ids }, isPaid: change.paid })
            .select('_id status createdBy timeline')
            .session(session)
            .lean();
        const now = new Date();
        const operations = orders.flatMap((order: any) => {
            if (change.paid && !AUTO_COMPLETE_SKIP.includes(order.status)) {
                return [
                    {
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
                    },
                ];
            }
            if (!change.paid && isAutoCompleted(order)) {
                const back = statusBeforeAutoComplete(order);
                return [
                    {
                        updateOne: {
                            filter: { _id: order._id },
                            update: {
                                $set: { status: back },
                                $unset: { completedAt: '' },
                                $push: {
                                    timeline: {
                                        status: back,
                                        timestamp: now,
                                        changedBy: order.createdBy,
                                        note: AUTO_REVERT_NOTE,
                                    },
                                },
                            },
                        },
                    },
                ];
            }
            return [];
        });
        if (operations.length) await this.model.bulkWrite(operations, { session });
    });
}

const OrderModel = model<IOrder>('Order', orderSchema);
export default OrderModel;
