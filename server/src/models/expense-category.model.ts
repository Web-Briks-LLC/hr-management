import { model, Schema } from 'mongoose';
import type { IExpenseCategory } from '../types/expense.type.js';

const expenseCategorySchema = new Schema<IExpenseCategory>(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

const ExpenseCategoryModel = model<IExpenseCategory>(
    'ExpenseCategory',
    expenseCategorySchema
);
export default ExpenseCategoryModel;
