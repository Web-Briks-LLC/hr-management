import { Schema, model } from 'mongoose';

// Append-only application audit: events commit in the same transaction as the work.
const schema = new Schema(
    {
        orderId: {
            type: Schema.Types.ObjectId,
            ref: 'Order',
            required: true,
            index: true,
        },
        sessionId: {
            type: Schema.Types.ObjectId,
            ref: 'ProductionWorkSession',
        },
        action: { type: String, required: true },
        actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        fromStaffId: { type: Schema.Types.ObjectId, ref: 'Staff' },
        toStaffId: { type: Schema.Types.ObjectId, ref: 'Staff' },
        imageNames: [String],
        note: String,
        completedSteps: [String],
        previousImages: { type: [Schema.Types.Mixed], default: undefined },
    },
    { timestamps: { createdAt: true, updatedAt: false } },
);
schema.index({ orderId: 1, createdAt: -1, _id: -1 });
export default model('ProductionEvent', schema);
