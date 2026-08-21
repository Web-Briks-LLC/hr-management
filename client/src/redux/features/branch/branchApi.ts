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

        updateBranch: builder.mutation({
            query: ({ id, data }) => ({
                url: `/branches/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['Branch'],
        }),

        deleteBranch: builder.mutation({
            query: (id) => ({
                url: `/branches/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Branch'],
        }),
    }),
});

export const {
    useGetAllBranchesQuery,
    useCreateBranchMutation,
    useUpdateBranchMutation,
    useDeleteBranchMutation,
} = branchApi;
