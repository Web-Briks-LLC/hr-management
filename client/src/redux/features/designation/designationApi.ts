import { apiSlice } from "@/redux/api/apiSlice";

export const designationApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getAllDesignations: builder.query({
            query: () => ({
                url: "/designations",
                method: "GET",
            }),
            providesTags: ["Designation"],
        }),

        createDesignation: builder.mutation({
            query: (data) => ({
                url: "/designations",
                method: "POST",
                body: data,
            }),
            invalidatesTags: ["Designation"],
        }),

        updateDesignation: builder.mutation({
            query: ({ id, data }) => ({
                url: `/designations/${id}`,
                method: "PUT",
                body: data,
            }),
            invalidatesTags: ["Designation"],
        }),

        deleteDesignation: builder.mutation({
            query: (id) => ({
                url: `/designations/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Designation"],
        }),
    }),
});

export const {
    useGetAllDesignationsQuery,
    useCreateDesignationMutation,
    useUpdateDesignationMutation,
    useDeleteDesignationMutation,
} = designationApi;
