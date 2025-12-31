import { model, Schema, Types } from 'mongoose';

export enum TransactionType {
    BORROW = 'Borrow',
    RETURN = 'Return',
}

export interface ITransaction {
    personId: Types.ObjectId | string;
    amount: number;
    date: Date;
    type: TransactionType;
    description?: string;
    createdBy: Types.ObjectId | string;
}

const TransactionSchema = new Schema<ITransaction>(
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
            enum: Object.values(TransactionType),
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

const TransactionModel = model<ITransaction>('Transaction', TransactionSchema);
export default TransactionModel;
