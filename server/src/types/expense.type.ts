import { Document, Types } from 'mongoose';

export interface IExpenseCategory extends Document {
    name: string;
    description?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface IExpense extends Document {
    date: Date;
    title: string;
    categoryId: Types.ObjectId;
    branchId: Types.ObjectId;
    amount: number;
    status: 'pending' | 'paid' | 'partial_paid';
    note?: string;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

export interface ExpenseQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    month?: number;
    year?: number;
    startDate?: string;
    endDate?: string;
    filterType?: 'all' | 'today' | 'week' | 'month' | 'year' | 'range';
    branchId?: string;
    categoryId?: string;
    status?: string;
}

export interface ExpenseStats {
    today: number;
    thisMonth: number;
    thisYear: number;
    avgMonthly: number;
}
