import { apiSlice } from '../../api/apiSlice';
import type {
    INotice,
    CreateNoticeInput,
    UpdateNoticeInput,
    NoticeFilters,
} from '@/types/notice.type';

interface NoticesResponse {
    message: string;
    data: INotice[];
    meta: {
        total: number;
        page: number;
        totalPages: number;
    };
}

interface NoticeResponse {
    message: string;
    data: INotice;
}

interface NoticeStatsResponse {
    message: string;
    data: {
        totalViews: number;
        viewedBy: { _id: string; name: string; email: string }[];
    };
}

export const noticeApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        // Get all notices (admin)
        getAllNotices: builder.query<NoticesResponse, NoticeFilters | void>({
            query: (filters) => {
                const params = new URLSearchParams();
                if (filters?.isPublished !== undefined)
                    params.append('isPublished', String(filters.isPublished));
                if (filters?.category)
                    params.append('category', filters.category);
                if (filters?.priority)
                    params.append('priority', filters.priority);
                if (filters?.page) params.append('page', String(filters.page));
                if (filters?.limit)
                    params.append('limit', String(filters.limit));
                return `/notices?${params.toString()}`;
            },
            providesTags: ['Notice'],
        }),

        // Get published notices (for all users)
        getPublishedNotices: builder.query<
            NoticesResponse,
            NoticeFilters | void
        >({
            query: (filters) => {
                const params = new URLSearchParams();
                if (filters?.category)
                    params.append('category', filters.category);
                if (filters?.page) params.append('page', String(filters.page));
                if (filters?.limit)
                    params.append('limit', String(filters.limit));
                return `/notices/published?${params.toString()}`;
            },
            providesTags: ['Notice'],
        }),

        // Get unread notices (for floating popup)
        getUnreadNotices: builder.query<{ data: INotice[] }, void>({
            query: () => '/notices/unread',
            providesTags: ['Notice'],
        }),

        // Get single notice
        getNoticeById: builder.query<NoticeResponse, string>({
            query: (id) => `/notices/${id}`,
            providesTags: (_result, _error, id) => [{ type: 'Notice', id }],
        }),

        // Create notice
        createNotice: builder.mutation<NoticeResponse, CreateNoticeInput>({
            query: (data) => ({
                url: '/notices',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Notice'],
        }),

        // Update notice
        updateNotice: builder.mutation<
            NoticeResponse,
            { id: string } & UpdateNoticeInput
        >({
            query: ({ id, ...data }) => ({
                url: `/notices/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Notice', id },
                'Notice',
            ],
        }),

        // Publish notice
        publishNotice: builder.mutation<NoticeResponse, string>({
            query: (id) => ({
                url: `/notices/${id}/publish`,
                method: 'POST',
            }),
            invalidatesTags: ['Notice'],
        }),

        // Unpublish notice
        unpublishNotice: builder.mutation<NoticeResponse, string>({
            query: (id) => ({
                url: `/notices/${id}/unpublish`,
                method: 'POST',
            }),
            invalidatesTags: ['Notice'],
        }),

        // Delete notice
        deleteNotice: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/notices/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Notice'],
        }),

        // Mark notice as viewed
        markNoticeAsViewed: builder.mutation<NoticeResponse, string>({
            query: (id) => ({
                url: `/notices/${id}/view`,
                method: 'POST',
            }),
            invalidatesTags: ['Notice'],
        }),

        // Mark multiple notices as viewed
        markMultipleNoticesAsViewed: builder.mutation<
            { message: string },
            string[]
        >({
            query: (noticeIds) => ({
                url: '/notices/mark-viewed',
                method: 'POST',
                body: { noticeIds },
            }),
            invalidatesTags: ['Notice'],
        }),

        // Get notice statistics
        getNoticeStats: builder.query<NoticeStatsResponse, string>({
            query: (id) => `/notices/${id}/stats`,
        }),
    }),
});

export const {
    useGetAllNoticesQuery,
    useGetPublishedNoticesQuery,
    useGetUnreadNoticesQuery,
    useGetNoticeByIdQuery,
    useCreateNoticeMutation,
    useUpdateNoticeMutation,
    usePublishNoticeMutation,
    useUnpublishNoticeMutation,
    useDeleteNoticeMutation,
    useMarkNoticeAsViewedMutation,
    useMarkMultipleNoticesAsViewedMutation,
    useGetNoticeStatsQuery,
} = noticeApi;
