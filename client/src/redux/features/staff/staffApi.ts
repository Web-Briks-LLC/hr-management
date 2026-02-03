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
    }),
});

export const {
    useGetStaffsQuery,
    useGetMeQuery,
    useCreateStaffMutation,
    useCompleteProfileMutation,
    useUpdateProfileMutation,
} = staffApi;
