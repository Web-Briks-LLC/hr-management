import { apiSlice } from '@/redux/api/apiSlice';

export const branchApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getAllBranches: builder.query({
            query: () => ({
                url: '/branches',
                method: 'GET',
            }),
            providesTags: ['Branch'],
        }),

        createBranch: builder.mutation({
            query: (data) => ({
                url: '/branches',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Branch'],
        }),
    }),
});

export const { useGetAllBranchesQuery, useCreateBranchMutation } = branchApi;
