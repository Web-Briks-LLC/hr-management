import { apiSlice } from "@/redux/api/apiSlice";
import type { IInvitation, IInvitationCreate } from "@/types/invitation.type";

export const invitationApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        createInvitation: builder.mutation<
            { success: boolean; data: IInvitation },
            IInvitationCreate
        >({
            query: (data) => ({
                url: "/invitations/create",
                method: "POST",
                body: data,
            }),
            invalidatesTags: ["Invitation"],
        }),

        getInvitations: builder.query<
            { success: boolean; data: IInvitation[] },
            { isUsed?: boolean; email?: string } | undefined
        >({
            query: (params) => ({
                url: "/invitations",
                params,
            }),
            providesTags: ["Invitation"],
        }),

        validateToken: builder.query<
            { success: boolean; data: IInvitation },
            string
        >({
            query: (token) => `/invitations/${token}/validate`,
        }),

        acceptInvitation: builder.mutation({
            query: ({ token, data }) => ({
                url: `/invitations/${token}/accept`,
                method: "POST",
                body: data,
            }),
        }),

        createBulkInvitations: builder.mutation({
            query: (data) => ({
                url: "/invitations/bulk",
                method: "POST",
                body: data,
            }),
            invalidatesTags: ["Invitation"],
        }),

        resendInvitation: builder.mutation<
            { success: boolean; data: IInvitation },
            string
        >({
            query: (id) => ({
                url: `/invitations/${id}/resend`,
                method: "POST",
                body: {},
            }),
            invalidatesTags: ["Invitation"],
        }),

        cancelInvitation: builder.mutation<
            { success: boolean; message: string },
            string
        >({
            query: (id) => ({
                url: `/invitations/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Invitation"],
        }),
    }),
});

export const {
    useCreateInvitationMutation,
    useGetInvitationsQuery,
    useValidateTokenQuery,
    useAcceptInvitationMutation,
    useCreateBulkInvitationsMutation,
    useResendInvitationMutation,
    useCancelInvitationMutation,
} = invitationApi;
