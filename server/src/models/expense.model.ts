import { model, Schema } from "mongoose";
import type { IExpense } from "../types/expense.type.js";

const expenseSchema = new Schema<IExpense>(
    {
        date: {
            type: Date,
            required: true,
            index: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        categoryId: {
            type: Schema.Types.ObjectId,
            ref: "ExpenseCategory",
            required: true,
            index: true,
        },
        branchId: {
            type: Schema.Types.ObjectId,
            ref: "Branch",
            required: true,
            index: true,
        },
        staffId: {
            type: Schema.Types.ObjectId,
            ref: "Staff",
            index: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        status: {
            type: String,
            enum: ["pending", "paid", "partial_paid"],
            default: "pending",
            index: true,
        },
        paymentMethod: {
            type: String,
            default: "cash",
        },
        note: {
            type: String,
            trim: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true },
);

// Compound index for efficient date range queries
expenseSchema.index({ date: -1, branchId: 1 });

// Prevent duplicate payroll payments for same staff + category + month
expenseSchema.index({ staffId: 1, categoryId: 1, date: 1 }, { sparse: true });

const ExpenseModel = model<IExpense>("Expense", expenseSchema);
export default ExpenseModel;
