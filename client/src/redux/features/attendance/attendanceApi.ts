import { apiSlice } from '@/redux/api/apiSlice';
import type { IAttendanceDay, AttendanceStatus, IMonthlyAttendanceStats } from '@/types/attendance.type';

export const attendanceApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        checkIn: builder.mutation({
            query: (body) => ({
                url: '/attendance/check-in',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Attendance'],
        }),
        checkOut: builder.mutation({
            query: (body) => ({
                url: '/attendance/check-out',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Attendance'],
        }),
        getTodayAttendance: builder.query({
            query: () => ({
                url: '/attendance/today',
                method: 'GET',
            }),
            providesTags: ['Attendance'],
        }),
        getMonthlyStats: builder.query<IMonthlyAttendanceStats, void>({
            query: () => ({
                url: '/attendance/monthly-stats',
                method: 'GET',
            }),
            transformResponse: (response: { data: IMonthlyAttendanceStats }) => response.data,
            providesTags: ['Attendance', 'Overtime'],
        }),
        getMyAttendanceHistory: builder.query<IAttendanceDay[], number | void>({
            query: (days = 7) => ({
                url: `/attendance/my-history?days=${days}`,
                method: 'GET',
            }),
            transformResponse: (response: { data: IAttendanceDay[] }) => response.data,
            providesTags: ['Attendance'],
        }),
        getAllAttendance: builder.query({
            query: (filters) => ({
                url: '/attendance/admin/all',
                params: filters,
            }),
            providesTags: ['Attendance'],
        }),
        updateAttendanceStatus: builder.mutation<void, { id: string; status: AttendanceStatus; notes?: string }>({
            query: ({ id, status, notes }) => ({
                url: `/attendance/admin/${id}`,
                method: 'PATCH',
                body: { status, notes },
            }),
            invalidatesTags: ['Attendance'],
        }),
        bulkUpdateAttendanceStatus: builder.mutation<void, { staffIds: string[]; date: string; status: AttendanceStatus; notes?: string; shiftId?: string }>({
            query: (body) => ({
                url: `/attendance/admin/bulk-update`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: ['Attendance'],
        }),
    }),
});

export const {
    useCheckInMutation,
    useCheckOutMutation,
    useGetTodayAttendanceQuery,
    useGetMonthlyStatsQuery,
    useGetMyAttendanceHistoryQuery,
    useGetAllAttendanceQuery,
    useUpdateAttendanceStatusMutation,
    useBulkUpdateAttendanceStatusMutation,
} = attendanceApi;
