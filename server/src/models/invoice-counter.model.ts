import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoiceCounter extends Document<string> {
    _id: string;
    seq: number;
}

const InvoiceCounterSchema: Schema = new Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
});

export const InvoiceCounter = mongoose.model<IInvoiceCounter>(
    'InvoiceCounter',
    InvoiceCounterSchema
);
