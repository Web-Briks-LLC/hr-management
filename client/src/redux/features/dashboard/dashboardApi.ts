import { apiSlice } from '@/redux/api/apiSlice';

export const dashboardApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getAdminDashboard: builder.query({
            query: () => ({
                url: '/dashboard/admin',
                method: 'GET',
            }),
            transformResponse: (response: { data: any }) => response.data,
            providesTags: ['Staff', 'Attendance', 'Overtime'],
            // Refetch every 30 seconds
            keepUnusedDataFor: 30,
        }),
    }),
});

export const { useGetAdminDashboardQuery } = dashboardApi;
