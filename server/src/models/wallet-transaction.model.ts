import { model, Schema, Types } from "mongoose";

export enum TransactionType {
    COMMISSION = "commission",
    REWARD = "reward",
    WITHDRAWAL = "withdrawal",
    REFUND = "refund",
    ADJUSTMENT = "adjustment",
}

export interface IWalletTransaction {
    staffId: Types.ObjectId;
    amount: number;
    type: TransactionType;
    orderId?: Types.ObjectId;
    description: string;
    status: "pending" | "completed" | "failed" | "cancelled";
    metadata?: any;
    createdAt: Date;
    updatedAt: Date;
}

const WalletTransactionSchema = new Schema<IWalletTransaction>(
    {
        staffId: {
            type: Schema.Types.ObjectId,
            ref: "Staff",
            required: true,
            index: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        type: {
            type: String,
            enum: Object.values(TransactionType),
            required: true,
            index: true,
        },
        orderId: {
            type: Schema.Types.ObjectId,
            ref: "Order",
            index: true,
        },
        description: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "completed", "failed", "cancelled"],
            default: "completed",
            index: true,
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
    },
    {
        timestamps: true,
    },
);

const WalletTransactionModel = model<IWalletTransaction>(
    "WalletTransaction",
    WalletTransactionSchema,
);
export default WalletTransactionModel;
