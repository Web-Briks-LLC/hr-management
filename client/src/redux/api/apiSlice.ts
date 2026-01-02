import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const apiSlice = createApi({
    reducerPath: 'api',
    baseQuery: fetchBaseQuery({
        baseUrl: `${process.env.NEXT_PUBLIC_APP_URL!}/api`,
        credentials: 'include',
    }),
    tagTypes: [
        'Staff',
        'User',
        'Shift',
        'Branch',
        'Attendance',
        'ShiftAssignment',
        'Overtime',
        'Notification',
        'Invitation',
        'Expense',
        'ExpenseCategory',
        'Client',
        'Order',
        'Service',
        'ReturnFileFormat',
        'Earning',
        'Metadata',
        'Shareholder',
        'ProfitSummary',
        'Distribution',
        'Leave',
        'DebitPerson',
        'Debit',
        'DebitStats',
        'Notice',
    ],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    endpoints: (_builder) => ({}),
});
