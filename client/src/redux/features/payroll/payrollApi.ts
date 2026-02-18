import { apiSlice } from "@/redux/api/apiSlice";

export const payrollApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getPayrollPreview: builder.query({
            query: ({ month, branchId }) => ({
                url: `/payroll/preview`,
                method: "GET",
                params: { month, branchId },
            }),
            providesTags: ["Payroll"],
        }),
        processPayment: builder.mutation({
            query: (data) => ({
                url: `/payroll/process`,
                method: "POST",
                body: data,
            }),
            invalidatesTags: ["Payroll", "Expense"],
            async onQueryStarted(arg, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    payrollApi.util.updateQueryData(
                        "getPayrollPreview",
                        { month: arg.month, branchId: arg.branchId },
                        (draft) => {
                            const staff = draft.find(
                                (d: any) => d._id === arg.staffId,
                            );
                            if (staff) {
                                if (arg.paymentType === "overtime") {
                                    staff.otStatus = "paid";
                                    staff.otPaidAmount = arg.amount;
                                } else {
                                    staff.status = "paid";
                                    staff.paidAmount = arg.amount;
                                }
                            }
                        },
                    ),
                );
                try {
                    await queryFulfilled;
                } catch {
                    patchResult.undo();
                }
            },
        }),
        graceAttendance: builder.mutation({
            query: (data) => ({
                url: `/payroll/grace`,
                method: "POST",
                body: data,
            }),
            invalidatesTags: ["Payroll", "Attendance"],
        }),
        bulkProcessPayment: builder.mutation({
            query: (data) => ({
                url: `/payroll/bulk-process`,
                method: "POST",
                body: data,
            }),
            invalidatesTags: ["Payroll", "Expense"],
        }),
        getAbsentDates: builder.query({
            query: ({ staffId, month }) => ({
                url: `/payroll/absent-dates`,
                method: "GET",
                params: { staffId, month },
            }),
        }),
        undoPayment: builder.mutation({
            query: (data) => ({
                url: "/payroll/undo",
                method: "POST",
                body: data,
            }),
            invalidatesTags: ["Payroll", "Expense"],
            async onQueryStarted(arg, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    payrollApi.util.updateQueryData(
                        "getPayrollPreview",
                        { month: arg.month, branchId: arg.branchId },
                        (draft) => {
                            const staff = draft.find(
                                (d: any) => d._id === arg.staffId,
                            );
                            if (staff) {
                                if (arg.paymentType === "overtime") {
                                    staff.otStatus = "pending";
                                    staff.otPaidAmount = 0;
                                } else {
                                    staff.status = "pending";
                                    staff.paidAmount = 0;
                                }
                            }
                        },
                    ),
                );
                try {
                    await queryFulfilled;
                } catch {
                    patchResult.undo();
                }
            },
        }),
    }),
});

export const {
    useGetPayrollPreviewQuery,
    useProcessPaymentMutation,
    useGraceAttendanceMutation,
    useBulkProcessPaymentMutation,
    useGetAbsentDatesQuery,
    useUndoPaymentMutation,
} = payrollApi;
