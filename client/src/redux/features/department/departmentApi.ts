import { apiSlice } from "@/redux/api/apiSlice";

export const departmentApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getAllDepartments: builder.query({
            query: () => ({
                url: "/departments",
                method: "GET",
            }),
            providesTags: ["Department"],
        }),

        createDepartment: builder.mutation({
            query: (data) => ({
                url: "/departments",
                method: "POST",
                body: data,
            }),
            invalidatesTags: ["Department"],
        }),

        updateDepartment: builder.mutation({
            query: ({ id, data }) => ({
                url: `/departments/${id}`,
                method: "PUT",
                body: data,
            }),
            invalidatesTags: ["Department"],
        }),

        deleteDepartment: builder.mutation({
            query: (id) => ({
                url: `/departments/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Department"],
        }),
    }),
});

export const {
    useGetAllDepartmentsQuery,
    useCreateDepartmentMutation,
    useUpdateDepartmentMutation,
    useDeleteDepartmentMutation,
} = departmentApi;
