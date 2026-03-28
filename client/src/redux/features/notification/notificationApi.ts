import { apiSlice } from '@/redux/api/apiSlice';

export interface Notification {
    _id: string;
    userId: string;
    title: string;
    message: string;
    type:
        | "overtime"
        | "leave"
        | "attendance"
        | "shift"
        | "announcement"
        | "earning";
    priority: "low" | "medium" | "high" | "urgent";
    resourceType?:
        | "overtime"
        | "leave"
        | "staff"
        | "attendance"
        | "shift"
        | "earning";
    resourceId?: string;
    actionUrl?: string;
    actionLabel?: string;
    isRead: boolean;
    readAt?: string;
    createdAt: string;
    updatedAt: string;
}

interface NotificationsParams {
    limit?: number;
    skip?: number;
    isRead?: boolean;
    type?: string;
}

export const notificationApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getNotifications: builder.query<Notification[], NotificationsParams | void>({
            query: (params) => ({
                url: '/notifications',
                method: 'GET',
                params: params || {},
            }),
            transformResponse: (response: { data: Notification[] }) => response.data,
            providesTags: ['Notification'],
        }),
        getUnreadCount: builder.query<{ count: number }, void>({
            query: () => ({
                url: '/notifications/unread-count',
                method: 'GET',
            }),
            transformResponse: (response: { data: { count: number } }) => response.data,
            providesTags: ['Notification'],
        }),
        markAsRead: builder.mutation<Notification, string>({
            query: (id) => ({
                url: `/notifications/${id}/read`,
                method: 'PATCH',
            }),
            invalidatesTags: ['Notification'],
        }),
        markAllAsRead: builder.mutation<{ modifiedCount: number }, any>({
            query: () => ({
                url: '/notifications/read-all',
                method: 'POST',
            }),
            invalidatesTags: ['Notification'],
        }),
        deleteNotification: builder.mutation<{ success: boolean; message: string }, string>({
            query: (id) => ({
                url: `/notifications/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Notification'],
        }),
        deleteAllNotifications: builder.mutation<{ deletedCount: number }, void>({
            query: () => ({
                url: '/notifications',
                method: 'DELETE',
            }),
            invalidatesTags: ['Notification'],
        }),
    }),
});

export const {
    useGetNotificationsQuery,
    useGetUnreadCountQuery,
    useMarkAsReadMutation,
    useMarkAllAsReadMutation,
    useDeleteNotificationMutation,
    useDeleteAllNotificationsMutation,
} = notificationApi;
