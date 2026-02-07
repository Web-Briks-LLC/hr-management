import { apiSlice } from '@/redux/api/apiSlice';

export const shiftApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        createShift: builder.mutation({
            query: (data) => ({
                url: '/shifts',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Shift'],
        }),

        getAllShifts: builder.query({
            query: () => ({
                url: '/shifts',
                method: 'GET',
            }),
            providesTags: ['Shift'],
        }),

        getMyShift: builder.query({
            query: () => ({
                url: '/shifts/my-shift',
                method: 'GET',
            }),
            providesTags: ['Shift'],
        }),

        updateShift: builder.mutation({
            query: ({ id, data }) => ({
                url: `/shifts/${id}`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: ['Shift'],
        }),

        deleteShift: builder.mutation({
            query: (id) => ({
                url: `/shifts/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Shift'],
        }),

        // Shift Off Dates
        getShiftOffDates: builder.query({
            query: (shiftId: string) => ({
                url: `/shift-off-dates/${shiftId}/off-dates`,
                method: 'GET',
            }),
            providesTags: ['ShiftOffDates'],
        }),

        getMyShiftOffDates: builder.query({
            query: () => ({
                url: '/shift-off-dates/my-off-dates',
                method: 'GET',
            }),
            providesTags: ['ShiftOffDates'],
        }),

        addShiftOffDates: builder.mutation({
            query: ({
                shiftId,
                dates,
                reason,
            }: {
                shiftId: string;
                dates: string[];
                reason?: string;
            }) => ({
                url: `/shift-off-dates/${shiftId}/off-dates`,
                method: 'PUT',
                body: { dates, reason },
            }),
            invalidatesTags: ['ShiftOffDates'],
        }),

        removeShiftOffDates: builder.mutation({
            query: ({
                shiftId,
                dates,
            }: {
                shiftId: string;
                dates: string[];
            }) => ({
                url: `/shift-off-dates/${shiftId}/off-dates`,
                method: 'DELETE',
                body: { dates },
            }),
            invalidatesTags: ['ShiftOffDates'],
        }),
    }),
});

export const {
    useGetMyShiftQuery,
    useCreateShiftMutation,
    useGetAllShiftsQuery,
    useUpdateShiftMutation,
    useDeleteShiftMutation,
    useGetShiftOffDatesQuery,
    useGetMyShiftOffDatesQuery,
    useAddShiftOffDatesMutation,
    useRemoveShiftOffDatesMutation,
} = shiftApi;
