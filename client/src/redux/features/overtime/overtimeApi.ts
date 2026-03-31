import { apiSlice } from '@/redux/api/apiSlice';

export const overtimeApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        createOvertime: builder.mutation({
            query: (body) => ({
                url: '/overtime/create',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Overtime'],
        }),
        getAllOvertime: builder.query({
            query: (params) => ({
                url: '/overtime',
                method: 'GET',
                params,
            }),
            transformResponse: (response: { data: any }) => response.data,
            providesTags: ['Overtime'],
        }),
        getMyOvertime: builder.query({
            query: () => ({
                url: '/overtime/my-overtime',
                method: 'GET',
            }),
            transformResponse: (response: { data: any }) => response.data,
            providesTags: ['Overtime'],
        }),
        getOvertimeById: builder.query({
            query: (id) => ({
                url: `/overtime/${id}`,
                method: 'GET',
            }),
            providesTags: ['Overtime'],
        }),
        updateOvertime: builder.mutation({
            query: ({ id, ...body }) => ({
                url: `/overtime/${id}`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: ['Overtime'],
        }),
        deleteOvertime: builder.mutation({
            query: (id) => ({
                url: `/overtime/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Overtime'],
        }),
        startOvertime: builder.mutation({
            query: () => ({
                url: '/overtime/start',
                method: 'POST',
            }),
            invalidatesTags: ['Overtime'],
        }),
        stopOvertime: builder.mutation({
            query: () => ({
                url: '/overtime/stop',
                method: 'POST',
            }),
            invalidatesTags: ['Overtime'],
        }),
        extendOvertime: builder.mutation({
            query: ({ id, additionalMinutes }) => ({
                url: `/overtime/extend/${id}`,
                method: 'PATCH',
                body: { additionalMinutes },
            }),
            invalidatesTags: ['Overtime'],
        }),
        getScheduledOvertimeToday: builder.query({
            query: () => ({
                url: '/overtime/scheduled-today',
                method: 'GET',
            }),
            transformResponse: (response: { data: any }) => response.data,
            providesTags: ['Overtime'],
        }),
    }),
});

export const {
    useCreateOvertimeMutation,
    useGetAllOvertimeQuery,
    useGetMyOvertimeQuery,
    useGetOvertimeByIdQuery,
    useUpdateOvertimeMutation,
    useDeleteOvertimeMutation,
    useStartOvertimeMutation,
    useStopOvertimeMutation,
    useExtendOvertimeMutation,
    useGetScheduledOvertimeTodayQuery,
} = overtimeApi;
