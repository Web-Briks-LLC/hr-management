import { apiSlice } from '@/redux/api/apiSlice';

export const payrollApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getPayrollPreview: builder.query({
            query: ({ month, branchId }) => ({
                url: `/payroll/preview`,
                method: 'GET',
                params: { month, branchId },
            }),
            providesTags: ['Payroll'],
        }),
        processPayment: builder.mutation({
            query: (data) => ({
                url: `/payroll/process`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Payroll', 'Expense'],
        }),
        graceAttendance: builder.mutation({
            query: (data) => ({
                url: `/payroll/grace`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Payroll', 'Attendance'],
        }),
        bulkProcessPayment: builder.mutation({
            query: (data) => ({
                url: `/payroll/bulk-process`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Payroll', 'Expense'],
        }),
        getAbsentDates: builder.query({
            query: ({ staffId, month }) => ({
                url: `/payroll/absent-dates`,
                method: 'GET',
                params: { staffId, month },
            }),
        }),
    }),
});

export const {
    useGetPayrollPreviewQuery,
    useProcessPaymentMutation,
    useGraceAttendanceMutation,
    useBulkProcessPaymentMutation,
    useGetAbsentDatesQuery,
} = payrollApi;
