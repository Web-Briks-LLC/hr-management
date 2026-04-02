import { apiSlice } from "../../api/apiSlice";
import { IPolicy, CreatePolicyData, TogglePolicyStatusData } from "../../../types/policy.type";

export const policyApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getPolicies: builder.query<{ success: boolean; policies: IPolicy[] }, void>({
            query: () => "/policies",
            providesTags: ["Policy"],
        }),
        getPendingPolicies: builder.query<{ success: boolean; policies: IPolicy[] }, void>({
            query: () => "/policies/pending",
            providesTags: ["PendingPolicy"],
        }),
        createPolicy: builder.mutation<{ success: boolean; policy: IPolicy }, CreatePolicyData>({
            query: (data) => ({
                url: "/policies",
                method: "POST",
                body: data,
            }),
            invalidatesTags: ["Policy", "PendingPolicy"],
        }),
        acceptPolicy: builder.mutation<{ success: boolean; message: string }, string>({
            query: (id) => ({
                url: `/policies/${id}/accept`,
                method: "POST",
            }),
            invalidatesTags: ["PendingPolicy", "Policy"],
        }),
        togglePolicyStatus: builder.mutation<{ success: boolean; policy: IPolicy }, { id: string; data: TogglePolicyStatusData }>({
            query: ({ id, data }) => ({
                url: `/policies/${id}/status`,
                method: "PATCH",
                body: data,
            }),
            invalidatesTags: ["Policy", "PendingPolicy"],
        }),
        deletePolicy: builder.mutation<{ success: boolean; message: string }, string>({
            query: (id) => ({
                url: `/policies/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Policy", "PendingPolicy"],
        }),
        updatePolicy: builder.mutation<{ success: boolean; policy: IPolicy }, { id: string; data: Partial<CreatePolicyData> }>({
            query: ({ id, data }) => ({
                url: `/policies/${id}`,
                method: "PUT",
                body: data,
            }),
            invalidatesTags: ["Policy", "PendingPolicy"],
        }),
    }),
});

export const {
    useGetPoliciesQuery,
    useGetPendingPoliciesQuery,
    useCreatePolicyMutation,
    useAcceptPolicyMutation,
    useTogglePolicyStatusMutation,
    useDeletePolicyMutation,
    useUpdatePolicyMutation,
} = policyApi;
