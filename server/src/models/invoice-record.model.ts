import { Schema, model } from "mongoose";

export interface IInvoiceRecord {
    invoiceNumber: string;
    clientName: string;
    clientId: string; // Add the string clientId for query purposes
    clientAddress: string;
    totalAmount: number;
    currency: string;
    dueDate: Date;
    paymentStatus: "pending" | "paid" | "failed";
    items: Array<{
        name: string;
        price: number;
        quantity: number;
    }>;
    month?: number;
    year?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

const invoiceRecordSchema = new Schema<IInvoiceRecord>(
    {
        invoiceNumber: { type: String, required: true, unique: true },
        clientName: { type: String, required: true },
        clientId: { type: String, required: true },
        clientAddress: { type: String, required: true },
        totalAmount: { type: Number, required: true },
        currency: { type: String, required: true, default: "USD" },
        dueDate: { type: Date, required: true },
        paymentStatus: {
            type: String,
            enum: ["pending", "paid", "failed"],
            default: "pending",
        },
        items: [
            {
                name: { type: String, required: true },
                price: { type: Number, required: true },
                quantity: { type: Number, required: true, default: 1 },
            },
        ],
        month: { type: Number },
        year: { type: Number },
    },
    { timestamps: true },
);

export const InvoiceRecord = model<IInvoiceRecord>(
    "InvoiceRecord",
    invoiceRecordSchema,
);
