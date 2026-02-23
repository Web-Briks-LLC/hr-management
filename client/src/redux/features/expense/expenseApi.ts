import { apiSlice } from "@/redux/api/apiSlice";

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
    status: "pending" | "paid" | "partial_paid";
    paymentMethod?: string;
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
    sortOrder?: "asc" | "desc";
    month?: number;
    year?: number;
    startDate?: string;
    endDate?: string;
    filterType?: "all" | "today" | "week" | "month" | "year" | "range";
    branchId?: string;
    categoryId?: string;
    staffId?: string;
    status?: string;
}

export const expenseApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getExpenses: builder.query({
            query: (params: ExpenseQueryParams) => ({
                url: "/expenses",
                method: "GET",
                params,
            }),
            transformResponse: (response: {
                data: {
                    expenses: Expense[];
                    pagination: {
                        page: number;
                        limit: number;
                        total: number;
                        pages: number;
                    };
                };
            }) => response.data,
            providesTags: ["Expense"],
        }),
        getExpenseStats: builder.query({
            query: (params?: {
                branchId?: string;
                year?: number;
                month?: number;
            }) => ({
                url: "/expenses/stats",
                method: "GET",
                params: params || {},
            }),
            transformResponse: (response: { data: ExpenseStats }) =>
                response.data,
            providesTags: ["Expense"],
        }),
        createExpense: builder.mutation({
            query: (body) => ({
                url: "/expenses",
                method: "POST",
                body,
            }),
            invalidatesTags: ["Expense"],
        }),
        updateExpense: builder.mutation({
            query: ({ id, ...body }) => ({
                url: `/expenses/${id}`,
                method: "PATCH",
                body,
            }),
            invalidatesTags: ["Expense"],
        }),
        deleteExpense: builder.mutation({
            query: (id: string) => ({
                url: `/expenses/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Expense"],
        }),
        getExpenseCategories: builder.query({
            query: () => ({
                url: "/expenses/categories",
                method: "GET",
            }),
            transformResponse: (response: { data: ExpenseCategory[] }) =>
                response.data,
            providesTags: ["ExpenseCategory"],
        }),
        createExpenseCategory: builder.mutation({
            query: (body: { name: string; description?: string }) => ({
                url: "/expenses/categories",
                method: "POST",
                body,
            }),
            invalidatesTags: ["ExpenseCategory"],
        }),
        getExpenseYears: builder.query({
            query: () => ({
                url: "/expenses/years",
                method: "GET",
            }),
            transformResponse: (response: { data: number[] }) => response.data,
            // Don't provide specific tags, but maybe invalidate on expense creation?
            // For now, caching is fine as years don't change often.
            providesTags: ["Expense"],
        }),
    }),
});

export const {
    useGetExpensesQuery,
    useLazyGetExpensesQuery,
    useGetExpenseStatsQuery,
    useCreateExpenseMutation,
    useUpdateExpenseMutation,
    useDeleteExpenseMutation,
    useGetExpenseCategoriesQuery,
    useCreateExpenseCategoryMutation,
    useGetExpenseYearsQuery,
} = expenseApi;
