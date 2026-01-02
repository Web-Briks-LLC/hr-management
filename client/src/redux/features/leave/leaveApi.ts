import { apiSlice } from '../../api/apiSlice';
import type {
    ILeaveApplication,
    ILeaveBalance,
    ApplyLeaveInput,
    ApproveLeaveInput,
    LeaveFilters,
} from '@/types/leave.type';

interface LeaveApplicationsResponse {
    message: string;
    data: ILeaveApplication[];
    meta: {
        total: number;
        page: number;
        totalPages: number;
    };
}

interface LeaveApplicationResponse {
    message: string;
    data: ILeaveApplication;
}

interface LeaveBalanceResponse {
    message: string;
    data: ILeaveBalance;
}

interface PendingLeavesResponse {
    message: string;
    data: ILeaveApplication[];
    count: number;
}

interface WorkingDaysResponse {
    message: string;
    data: {
        dates: string[];
        count: number;
    };
}

export const leaveApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        // Apply for leave
        applyForLeave: builder.mutation<
            LeaveApplicationResponse,
            ApplyLeaveInput
        >({
            query: (data) => ({
                url: '/leave',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: [
                { type: 'Leave', id: 'LIST' },
                { type: 'Leave', id: 'MY_LIST' },
                { type: 'Leave', id: 'PENDING' },
                { type: 'Leave', id: 'BALANCE' },
            ],
        }),

        // Get all leave applications (admin)
        getLeaveApplications: builder.query<
            LeaveApplicationsResponse,
            LeaveFilters | void
        >({
            query: (params) => ({
                url: '/leave',
                params: params || {},
            }),
            providesTags: (result) =>
                result
                    ? [
                          ...result.data.map(({ _id }) => ({
                              type: 'Leave' as const,
                              id: _id,
                          })),
                          { type: 'Leave', id: 'LIST' },
                      ]
                    : [{ type: 'Leave', id: 'LIST' }],
        }),

        // Get my leave applications
        getMyLeaveApplications: builder.query<
            LeaveApplicationsResponse,
            { page?: number; limit?: number } | void
        >({
            query: (params) => ({
                url: '/leave/my',
                params: params || {},
            }),
            providesTags: [{ type: 'Leave', id: 'MY_LIST' }],
        }),

        // Get pending leaves (admin notification)
        getPendingLeaves: builder.query<PendingLeavesResponse, void>({
            query: () => '/leave/pending',
            providesTags: [{ type: 'Leave', id: 'PENDING' }],
        }),

        // Get leave balance
        getLeaveBalance: builder.query<
            LeaveBalanceResponse,
            { staffId?: string; year?: number } | void
        >({
            query: (params) => ({
                url: params?.staffId
                    ? `/leave/balance/${params.staffId}`
                    : '/leave/balance',
                params: params?.year ? { year: params.year } : {},
            }),
            providesTags: [{ type: 'Leave', id: 'BALANCE' }],
        }),

        // Calculate working days
        calculateWorkingDays: builder.query<
            WorkingDaysResponse,
            { startDate: string; endDate: string }
        >({
            query: (params) => ({
                url: '/leave/calculate-days',
                params,
            }),
        }),

        // Get single leave application
        getLeaveApplicationById: builder.query<
            LeaveApplicationResponse,
            string
        >({
            query: (id) => `/leave/${id}`,
            providesTags: (_result, _error, id) => [{ type: 'Leave', id }],
        }),

        // Approve leave
        approveLeave: builder.mutation<
            LeaveApplicationResponse,
            { id: string; data: ApproveLeaveInput }
        >({
            query: ({ id, data }) => ({
                url: `/leave/${id}/approve`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Leave', id },
                { type: 'Leave', id: 'LIST' },
                { type: 'Leave', id: 'PENDING' },
                { type: 'Leave', id: 'BALANCE' },
            ],
        }),

        // Reject leave
        rejectLeave: builder.mutation<
            LeaveApplicationResponse,
            { id: string; comment?: string }
        >({
            query: ({ id, comment }) => ({
                url: `/leave/${id}/reject`,
                method: 'PATCH',
                body: { comment },
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Leave', id },
                { type: 'Leave', id: 'LIST' },
                { type: 'Leave', id: 'PENDING' },
            ],
        }),

        // Revoke approved leave
        revokeLeave: builder.mutation<
            LeaveApplicationResponse,
            { id: string; reason?: string }
        >({
            query: ({ id, reason }) => ({
                url: `/leave/${id}/revoke`,
                method: 'PATCH',
                body: { reason },
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Leave', id },
                { type: 'Leave', id: 'LIST' },
                { type: 'Leave', id: 'BALANCE' },
            ],
        }),

        // Cancel own application
        cancelLeaveApplication: builder.mutation<
            LeaveApplicationResponse,
            string
        >({
            query: (id) => ({
                url: `/leave/${id}/cancel`,
                method: 'PATCH',
            }),
            invalidatesTags: (_result, _error, id) => [
                { type: 'Leave', id },
                { type: 'Leave', id: 'MY_LIST' },
                { type: 'Leave', id: 'PENDING' },
            ],
        }),

        // Upload medical document
        uploadMedicalDocument: builder.mutation<
            { message: string; data: any },
            { id: string; file: File }
        >({
            query: ({ id, file }) => {
                const formData = new FormData();
                formData.append('document', file);
                return {
                    url: `/leave/${id}/upload-document`,
                    method: 'POST',
                    body: formData,
                };
            },
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Leave', id },
                { type: 'Leave', id: 'MY_LIST' },
            ],
        }),
    }),
});

export const {
    useApplyForLeaveMutation,
    useGetLeaveApplicationsQuery,
    useGetMyLeaveApplicationsQuery,
    useGetPendingLeavesQuery,
    useGetLeaveBalanceQuery,
    useCalculateWorkingDaysQuery,
    useLazyCalculateWorkingDaysQuery,
    useGetLeaveApplicationByIdQuery,
    useApproveLeaveMutation,
    useRejectLeaveMutation,
    useRevokeLeaveMutation,
    useCancelLeaveApplicationMutation,
    useUploadMedicalDocumentMutation,
} = leaveApi;
