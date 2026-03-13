import { apiSlice } from "@/redux/api/apiSlice";
import { IPayrollItem, IPayrollLock, IAttendanceRecord } from "@/types/payroll.type";

export interface IPayrollPreviewResponse {
    success: boolean;
    data: {
        staffs: IPayrollItem[];
    };
}

export interface IProcessPaymentRequest {
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

export interface IBulkProcessPaymentRequest {
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

export interface IUndoPaymentRequest {
    staffId: string;
    month: string;
    paymentType: string;
    branchId?: string;
}

export interface ISetAttendanceRequest {
    staffId: string;
    date: string;
    status: string;
    month: string;
    branchId?: string;
}

export const payrollApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getPayrollPreview: builder.query<
            IPayrollPreviewResponse,
            { month: string; branchId?: string }
        >({
            query: ({ month, branchId }) => ({
                url: `/payroll/preview`,
                params: { month, branchId: branchId || "all" },
            }),
            providesTags: (_result, _error, { month, branchId }) => [
                { type: "Payroll", id: `${month}-${branchId || "all"}` },
            ],
        }),

        processPayment: builder.mutation<
            { success: boolean; message: string },
            IProcessPaymentRequest
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
                        (draft) => {
                            const staffs = draft?.data?.staffs;
                            if (!Array.isArray(staffs)) return;
                            const item = staffs.find(
                                (s) =>
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
            { success: boolean; message: string },
            IBulkProcessPaymentRequest
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
                        (draft) => {
                            const staffs = draft?.data?.staffs;
                            if (!Array.isArray(staffs)) return;
                            arg.payments.forEach((payment) => {
                                const item = staffs.find(
                                    (s) =>
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
            { success: boolean; message: string },
            IUndoPaymentRequest
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
                        (draft) => {
                            const staffs = draft?.data?.staffs;
                            if (!Array.isArray(staffs)) return;
                            const item = staffs.find(
                                (s) =>
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
            { success: boolean; message: string },
            {
                staffId: string;
                dates: string[];
                note?: string;
                month: string;
                branchId?: string;
            }
        >({
            query: (data) => ({
                url: "/payroll/grace",
                method: "POST",
                body: { staffId: data.staffId, dates: data.dates, note: data.note },
            }),
            invalidatesTags: (_result, _error, { month, branchId }) => [
                { type: "Payroll", id: `${month}-${branchId || "all"}` },
            ],
        }),

        getAbsentDates: builder.query<
            { success: boolean; data: string[] },
            { staffId: string; month: string }
        >({
            query: ({ staffId, month }) => ({
                url: "/payroll/absent-dates",
                params: { staffId, month },
            }),
        }),

        // ─── Payroll Lock ────────────────────────────────────────────

        getLockStatus: builder.query<
            { success: boolean; data: { isLocked: boolean; lock: IPayrollLock | null } },
            { month: string }
        >({
            query: ({ month }) => ({
                url: "/payroll/lock-status",
                params: { month },
            }),
            providesTags: (_result, _error, { month }) => [
                { type: "PayrollLock", id: month },
            ],
        }),

        lockMonth: builder.mutation<{ success: boolean; data: IPayrollLock }, { month: string }>({
            query: (data) => ({
                url: "/payroll/lock",
                method: "POST",
                body: data,
            }),
            invalidatesTags: (_result, _error, { month }) => [
                { type: "PayrollLock", id: month },
                { type: "Payroll" },
            ],
        }),

        unlockMonth: builder.mutation<{ success: boolean; data: IPayrollLock }, { month: string }>({
            query: (data) => ({
                url: "/payroll/unlock",
                method: "POST",
                body: data,
            }),
            invalidatesTags: (_result, _error, { month }) => [
                { type: "PayrollLock", id: month },
                { type: "Payroll" },
            ],
        }),

        setAttendance: builder.mutation<
            { success: boolean; data: IAttendanceRecord },
            ISetAttendanceRequest
        >({
            query: ({ staffId, date, status }) => ({
                url: "/payroll/set-attendance",
                method: "POST",
                body: { staffId, date, status },
            }),
            async onQueryStarted(
                { staffId, date, status, month, branchId },
                { dispatch, queryFulfilled },
            ) {
                const cacheKey = {
                    month,
                    branchId: branchId || "all",
                };
                // Optimistic update: patch calendar cell + recalculate counts
                const patchResult = dispatch(
                    payrollApi.util.updateQueryData(
                        "getPayrollPreview",
                        cacheKey,
                        (draft) => {
                            const staffs = draft?.data?.staffs;
                            if (!Array.isArray(staffs)) return;
                            const staff = staffs.find(
                                (s) =>
                                    (s._id || s.staffId)?.toString() ===
                                    staffId,
                            );
                            if (!staff?.calendar) return;

                            // Patch the day cell
                            const day = staff.calendar.find(
                                (d) => d.date === date,
                            );
                            if (day) {
                                day.status = status;
                            }

                            // Recalculate counts from calendar
                            let present = 0,
                                absent = 0,
                                late = 0;
                            for (const d of staff.calendar) {
                                if (
                                    d.status === "present" ||
                                    d.status === "early_exit"
                                )
                                    present++;
                                else if (d.status === "late") late++;
                                else if (d.status === "absent") absent++;
                            }
                            staff.present = present + late; // late counts as present for payment
                            staff.absent = absent;
                            staff.late = late;

                            // Recalculate payable salary
                            const grossSalary = staff.salary || 0;
                            const perDaySalary = grossSalary / 30; // Fixed divider
                            staff.payableSalary = Math.round(
                                Math.max(0, grossSalary - (absent * perDaySalary))
                            );
                        },
                    ),
                );
                try {
                    await queryFulfilled;
                } catch {
                    patchResult.undo();
                }
            },
            invalidatesTags: (_result, _error, { month, branchId }) => [
                {
                    type: "Payroll",
                    id: `${month}-${branchId || "all"}`,
                },
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
    useSetAttendanceMutation,
} = payrollApi;
