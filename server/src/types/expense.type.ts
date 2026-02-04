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
    staffId?: Types.ObjectId;
    amount: number;
    status: 'pending' | 'paid' | 'partial_paid';
    paymentMethod?: string;
    note?: string;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

export interface ExpenseQueryParams {
    page?: number | undefined;
    limit?: number | undefined;
    search?: string | undefined;
    sortBy?: string | undefined;
    sortOrder?: 'asc' | 'desc' | undefined;
    month?: number | undefined;
    year?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    filterType?:
        | 'all'
        | 'today'
        | 'week'
        | 'month'
        | 'year'
        | 'range'
        | undefined;
    branchId?: string | undefined;
    categoryId?: string | undefined;
    status?: string | undefined;
}

export interface ExpenseStats {
    today: number;
    thisMonth: number;
    thisYear: number;
    avgMonthly: number;
}
