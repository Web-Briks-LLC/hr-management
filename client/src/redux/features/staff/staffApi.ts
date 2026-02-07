import { apiSlice } from '@/redux/api/apiSlice';

export const staffApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getStaffs: builder.query({
            query: (params) => ({
                url: '/staffs/',
                method: 'GET',
                params,
            }),
            providesTags: ['Staff'],
        }),
        getStaffById: builder.query({
            query: (id) => ({
                url: `/staffs/${id}`,
                method: 'GET',
            }),
            providesTags: (_result, _error, id) => [{ type: 'Staff', id }],
        }),
        getMe: builder.query({
            query: () => ({
                url: '/staffs/me',
                method: 'GET',
            }),
            providesTags: ['Staff'],
        }),
        createStaff: builder.mutation({
            query: (body) => ({
                url: '/staffs/create',
                method: 'POST',
                body,
                headers: {
                    'Content-Type': 'application/json',
                },
            }),
            invalidatesTags: ['Staff'],
        }),
        completeProfile: builder.mutation({
            query: (body) => ({
                url: '/staffs/complete-profile',
                method: 'PUT',
                body,
                headers: {
                    'Content-Type': 'application/json',
                },
            }),
            invalidatesTags: ['Staff'],
        }),
        updateProfile: builder.mutation({
            query: (body) => ({
                url: '/staffs/update-profile',
                method: 'PUT',
                body,
                headers: {
                    'Content-Type': 'application/json',
                },
            }),
            invalidatesTags: ['Staff'],
        }),
        updateStaff: builder.mutation({
            query: ({ id, data }) => ({
                url: `/staffs/${id}`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                'Staff',
                { type: 'Staff', id },
            ],
        }),
        setSalaryPin: builder.mutation({
            query: ({ staffId, pin }) => ({
                url: `/staffs/${staffId}/pin/set`,
                method: 'POST',
                body: { pin },
            }),
            invalidatesTags: (_result, _error, { staffId }) => [
                'Staff',
                { type: 'Staff', id: staffId }, // Invalidate specific staff
                { type: 'Staff', id: 'LIST' }, // Optional: invalidate list if needed, but likely strict invalidation on ID is enough
            ],
        }),
        verifySalaryPin: builder.mutation({
            query: ({ staffId, pin }) => ({
                url: `/staffs/${staffId}/pin/verify`,
                method: 'POST',
                body: { pin },
            }),
            // No invalidation needed for verification
        }),
        forgotSalaryPin: builder.mutation({
            query: ({ staffId }) => ({
                url: `/staffs/pin/forgot`,
                method: 'POST',
                body: { staffId },
            }),
        }),
        resetSalaryPin: builder.mutation({
            query: ({ token, pin }) => ({
                url: `/staffs/pin/reset`,
                method: 'POST',
                body: { token, pin },
            }),
        }),
    }),
});

export const {
    useGetStaffsQuery,
    useGetStaffByIdQuery,
    useGetMeQuery,
    useCreateStaffMutation,
    useCompleteProfileMutation,
    useUpdateProfileMutation,
    useUpdateStaffMutation,
    useSetSalaryPinMutation,
    useVerifySalaryPinMutation,
    useForgotSalaryPinMutation,
    useResetSalaryPinMutation,
} = staffApi;
