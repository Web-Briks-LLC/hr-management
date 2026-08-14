import { apiSlice } from '../../api/apiSlice';
import type {
    IShiftProduction,
    IActiveOrderProductionProgress,
    IProductionStats,
    ICreateProductionLogInput,
    IUpdateProductionLogInput,
    ISubmitQCReviewInput,
    IProductionFilters,
} from '@/types/production.type';

interface ProductionLogsResponse {
    success: boolean;
    data: IShiftProduction[];
    meta: {
        total: number;
        page: number;
        totalPages: number;
    };
}

interface ActiveOrdersProgressResponse {
    success: boolean;
    data: IActiveOrderProductionProgress[];
}

interface ProductionStatsResponse {
    success: boolean;
    data: IProductionStats;
}

interface SingleProductionLogResponse {
    success: boolean;
    data: IShiftProduction;
    message?: string;
}

interface OrderTimelineResponse {
    success: boolean;
    data: {
        order: any;
        logs: IShiftProduction[];
    };
}

export const productionApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getProductionLogs: builder.query<ProductionLogsResponse, IProductionFilters | void>({
            query: (params) => ({
                url: '/production',
                params: params || {},
            }),
            providesTags: (result) =>
                result?.data
                    ? [
                          ...result.data.map(({ _id }) => ({
                              type: 'Production' as const,
                              id: _id,
                          })),
                          { type: 'Production', id: 'LIST' },
                      ]
                    : [{ type: 'Production', id: 'LIST' }],
        }),

        getActiveOrdersProgress: builder.query<
            ActiveOrdersProgressResponse,
            { branchId?: string; search?: string } | void
        >({
            query: (params) => ({
                url: '/production/active-orders',
                params: params || {},
            }),
            providesTags: [{ type: 'ProductionOrders', id: 'LIST' }],
        }),

        getOrderTimeline: builder.query<OrderTimelineResponse, string>({
            query: (orderId) => `/production/order/${orderId}/timeline`,
            providesTags: (_result, _error, orderId) => [
                { type: 'Production', id: `TIMELINE_${orderId}` },
            ],
        }),

        getProductionStats: builder.query<
            ProductionStatsResponse,
            { startDate?: string; endDate?: string; branchId?: string } | void
        >({
            query: (params) => ({
                url: '/production/stats',
                params: params || {},
            }),
            providesTags: [{ type: 'ProductionStats', id: 'STATS' }],
        }),

        createProductionLog: builder.mutation<
            SingleProductionLogResponse,
            ICreateProductionLogInput
        >({
            query: (body) => ({
                url: '/production',
                method: 'POST',
                body,
            }),
            invalidatesTags: [
                { type: 'Production', id: 'LIST' },
                { type: 'ProductionOrders', id: 'LIST' },
                { type: 'ProductionStats', id: 'STATS' },
                { type: 'Order', id: 'LIST' },
            ],
        }),

        updateProductionLog: builder.mutation<
            SingleProductionLogResponse,
            { id: string; data: IUpdateProductionLogInput }
        >({
            query: ({ id, data }) => ({
                url: `/production/${id}`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Production', id },
                { type: 'Production', id: 'LIST' },
                { type: 'ProductionOrders', id: 'LIST' },
                { type: 'ProductionStats', id: 'STATS' },
                { type: 'Order', id: 'LIST' },
            ],
        }),

        submitQCReview: builder.mutation<
            SingleProductionLogResponse,
            { id: string; data: ISubmitQCReviewInput }
        >({
            query: ({ id, data }) => ({
                url: `/production/${id}/qc`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Production', id },
                { type: 'Production', id: 'LIST' },
                { type: 'ProductionOrders', id: 'LIST' },
                { type: 'ProductionStats', id: 'STATS' },
                { type: 'Order', id: 'LIST' },
            ],
        }),

        deleteProductionLog: builder.mutation<{ success: boolean; message: string }, string>({
            query: (id) => ({
                url: `/production/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: [
                { type: 'Production', id: 'LIST' },
                { type: 'ProductionOrders', id: 'LIST' },
                { type: 'ProductionStats', id: 'STATS' },
            ],
        }),
    }),
});

export const {
    useGetProductionLogsQuery,
    useGetActiveOrdersProgressQuery,
    useGetOrderTimelineQuery,
    useGetProductionStatsQuery,
    useCreateProductionLogMutation,
    useUpdateProductionLogMutation,
    useSubmitQCReviewMutation,
    useDeleteProductionLogMutation,
} = productionApi;
