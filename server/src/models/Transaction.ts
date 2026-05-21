import { model, Schema, Types } from 'mongoose';

export interface ITransaction {
    sourceId: Types.ObjectId | string;
    sourceType: 'earning' | 'expense' | 'debit' | 'wallet' | 'profit_share' | 'profit_transfer';
    title: string;
    amount: number;
    currency: string;
    amountInBDT: number;
    flow: 'inflow' | 'outflow';
    date: Date;
    status: string;
    referenceId?: Types.ObjectId | string;
    createdBy?: Types.ObjectId | string;
    note?: string;
    branchId?: Types.ObjectId | string;
}

const TransactionSchema = new Schema<ITransaction>(
    {
        sourceId: {
            type: Schema.Types.ObjectId,
            required: true,
            index: true,
        },
        sourceType: {
            type: String,
            required: true,
            enum: ['earning', 'expense', 'debit', 'wallet', 'profit_share', 'profit_transfer'],
            index: true,
        },
        title: { type: String, required: true, trim: true },
        amount: { type: Number, required: true, min: 0 },
        currency: { type: String, required: true, default: 'BDT' },
        amountInBDT: { type: Number, required: true, min: 0 },
        flow: { type: String, required: true, enum: ['inflow', 'outflow'] },
        date: { type: Date, required: true, index: true },
        status: { type: String, required: true },
        referenceId: { type: Schema.Types.ObjectId, index: true },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
        note: { type: String, trim: true },
        branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true }
    },
    { timestamps: true }
);

const TransactionModel = model<ITransaction>('Transaction', TransactionSchema);
export default TransactionModel;
