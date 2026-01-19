import { apiSlice } from '@/redux/api/apiSlice';

export interface ExpenseCategory {
    _id: string;
    name: string;
    description?: string;
    isActive: boolean;
}

export interface Expense {
    _id: string;
    date: string;
    title: string;
    category: ExpenseCategory;
    branch: { _id: string; name: string };
    amount: number;
    status: 'pending' | 'paid' | 'partial_paid';
    note?: string;
    createdBy: { _id: string; name: string };
    createdAt: string;
    updatedAt: string;
}

export interface ExpenseStats {
    today: number;
    thisMonth: number;
    thisYear: number;
    avgMonthly: number;
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

export const expenseApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getExpenses: builder.query({
            query: (params: ExpenseQueryParams) => ({
                url: '/expenses',
                method: 'GET',
                params,
            }),
            transformResponse: (response: { data: any }) => response.data,
            providesTags: ['Expense'],
        }),
        getExpenseStats: builder.query({
            query: (branchId?: string) => ({
                url: '/expenses/stats',
                method: 'GET',
                params: branchId ? { branchId } : {},
            }),
            transformResponse: (response: { data: ExpenseStats }) =>
                response.data,
            providesTags: ['Expense'],
        }),
        createExpense: builder.mutation({
            query: (body) => ({
                url: '/expenses',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Expense'],
        }),
        updateExpense: builder.mutation({
            query: ({ id, ...body }) => ({
                url: `/expenses/${id}`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: ['Expense'],
        }),
        deleteExpense: builder.mutation({
            query: (id: string) => ({
                url: `/expenses/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Expense'],
        }),
        getExpenseCategories: builder.query({
            query: () => ({
                url: '/expenses/categories',
                method: 'GET',
            }),
            transformResponse: (response: { data: ExpenseCategory[] }) =>
                response.data,
            providesTags: ['ExpenseCategory'],
        }),
        createExpenseCategory: builder.mutation({
            query: (body: { name: string; description?: string }) => ({
                url: '/expenses/categories',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['ExpenseCategory'],
        }),
    }),
});

export const {
    useGetExpensesQuery,
    useGetExpenseStatsQuery,
    useCreateExpenseMutation,
    useUpdateExpenseMutation,
    useDeleteExpenseMutation,
    useGetExpenseCategoriesQuery,
    useCreateExpenseCategoryMutation,
} = expenseApi;
