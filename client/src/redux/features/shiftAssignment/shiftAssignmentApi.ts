import { apiSlice } from '@/redux/api/apiSlice';

export const shiftAssignmentApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        assignShift: builder.mutation({
            query: (data) => ({
                url: '/shift-assignments/assign',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['ShiftAssignment'],
        }),
    }),
});

export const { useAssignShiftMutation } = shiftAssignmentApi;
