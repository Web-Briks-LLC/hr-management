import { apiSlice } from "@/redux/api/apiSlice";

export const payrollApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getPayrollPreview: builder.query<
            any,
            { month: string; branchId?: string }
        >({
            query: ({ month, branchId }) => ({
                url: `/payroll/preview`,
                params: { month, branchId: branchId || "all" },
            }),
            providesTags: (_result, _error, { month, branchId }) => [
                { type: "Payroll" as any, id: `${month}-${branchId || "all"}` },
            ],
        }),

        processPayment: builder.mutation<
            any,
            {
                staffId: string;
                month: string;
                amount: number;
                paymentMethod: string;
                paymentType: string;
                branchId?: string;
                note?: string;
                bonus?: number;
                deduction?: number;
                createdBy: string;
            }
        >({
            query: (data) => ({
                url: "/payroll/process",
                method: "POST",
                body: data,
            }),
            async onQueryStarted(arg, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    payrollApi.util.updateQueryData(
                        "getPayrollPreview",
                        { month: arg.month, branchId: arg.branchId },
                        (draft: any) => {
                            const data = draft?.data || draft;
                            if (!Array.isArray(data)) return;
                            const item = data.find(
                                (s: any) =>
                                    (s._id || s.staffId)?.toString() ===
                                    arg.staffId,
                            );
                            if (item) {
                                if (arg.paymentType === "overtime") {
                                    item.otStatus = "paid";
                                    item.otPaidAmount = arg.amount;
                                } else {
                                    item.status = "paid";
                                    item.paidAmount = arg.amount;
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

        bulkProcessPayment: builder.mutation<
            any,
            {
                month: string;
                payments: {
                    staffId: string;
                    amount: number;
                    bonus?: number;
                    deduction?: number;
                    note?: string;
                }[];
                paymentMethod: string;
                paymentType: string;
                createdBy: string;
                branchId?: string;
            }
        >({
            query: (data) => ({
                url: "/payroll/bulk-process",
                method: "POST",
                body: data,
            }),
            async onQueryStarted(arg, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    payrollApi.util.updateQueryData(
                        "getPayrollPreview",
                        { month: arg.month, branchId: arg.branchId },
                        (draft: any) => {
                            const data = draft?.data || draft;
                            if (!Array.isArray(data)) return;
                            arg.payments.forEach((payment) => {
                                const item = data.find(
                                    (s: any) =>
                                        (s._id || s.staffId)?.toString() ===
                                        payment.staffId,
                                );
                                if (item) {
                                    if (arg.paymentType === "overtime") {
                                        item.otStatus = "paid";
                                        item.otPaidAmount = payment.amount;
                                    } else {
                                        item.status = "paid";
                                        item.paidAmount = payment.amount;
                                    }
                                }
                            });
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

        undoPayment: builder.mutation<
            any,
            {
                staffId: string;
                month: string;
                paymentType: string;
                branchId?: string;
            }
        >({
            query: (data) => ({
                url: "/payroll/undo",
                method: "POST",
                body: data,
            }),
            async onQueryStarted(arg, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    payrollApi.util.updateQueryData(
                        "getPayrollPreview",
                        { month: arg.month, branchId: arg.branchId },
                        (draft: any) => {
                            const data = draft?.data || draft;
                            if (!Array.isArray(data)) return;
                            const item = data.find(
                                (s: any) =>
                                    (s._id || s.staffId)?.toString() ===
                                    arg.staffId,
                            );
                            if (item) {
                                if (arg.paymentType === "overtime") {
                                    item.otStatus = "pending";
                                    item.otPaidAmount = 0;
                                } else {
                                    item.status = "pending";
                                    item.paidAmount = 0;
                                    item.expenseId = null;
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

        graceAttendance: builder.mutation<
            any,
            {
                staffId: string;
                date: string;
                note?: string;
            }
        >({
            query: (data) => ({
                url: "/payroll/grace",
                method: "POST",
                body: data,
            }),
            invalidatesTags: ["Payroll" as any],
        }),

        getAbsentDates: builder.query<any, { staffId: string; month: string }>({
            query: ({ staffId, month }) => ({
                url: "/payroll/absent-dates",
                params: { staffId, month },
            }),
        }),

        // ─── Payroll Lock ────────────────────────────────────────────

        getLockStatus: builder.query<
            { success: boolean; data: { isLocked: boolean; lock: any } },
            { month: string }
        >({
            query: ({ month }) => ({
                url: "/payroll/lock-status",
                params: { month },
            }),
            providesTags: (_result, _error, { month }) => [
                { type: "PayrollLock" as any, id: month },
            ],
        }),

        lockMonth: builder.mutation<any, { month: string }>({
            query: (data) => ({
                url: "/payroll/lock",
                method: "POST",
                body: data,
            }),
            invalidatesTags: (_result, _error, { month }) => [
                { type: "PayrollLock" as any, id: month },
            ],
        }),

        unlockMonth: builder.mutation<any, { month: string }>({
            query: (data) => ({
                url: "/payroll/unlock",
                method: "POST",
                body: data,
            }),
            invalidatesTags: (_result, _error, { month }) => [
                { type: "PayrollLock" as any, id: month },
            ],
        }),
    }),
});

export const {
    useGetPayrollPreviewQuery,
    useProcessPaymentMutation,
    useBulkProcessPaymentMutation,
    useUndoPaymentMutation,
    useGraceAttendanceMutation,
    useGetAbsentDatesQuery,
    useGetLockStatusQuery,
    useLockMonthMutation,
    useUnlockMonthMutation,
} = payrollApi;
