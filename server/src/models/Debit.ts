import { model, Schema, Types } from 'mongoose';

export enum DebitType {
    BORROW = 'Borrow',
    RETURN = 'Return',
}

export interface IDebit {
    personId: Types.ObjectId | string;
    amount: number;
    date: Date;
    type: DebitType;
    description?: string;
    createdBy: Types.ObjectId | string;
}

const DebitSchema = new Schema<IDebit>(
    {
        personId: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            required: true,
            index: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        date: {
            type: Date,
            required: true,
            default: Date.now,
        },
        type: {
            type: String,
            enum: Object.values(DebitType),
            required: true,
        },
        description: { type: String, trim: true },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    { timestamps: true }
);

const DebitModel = model<IDebit>('Debit', DebitSchema);
export default DebitModel;
