import { apiSlice } from '../../api/apiSlice';
import type {
    IOrder,
    IOrderStats,
    CreateOrderInput,
    UpdateOrderInput,
    UpdateStatusInput,
    ExtendDeadlineInput,
    AddRevisionInput,
    OrderFilters,
} from '@/types/order.type';

interface OrdersResponse {
    message: string;
    data: IOrder[];
    meta: {
        total: number;
        page: number;
        totalPages: number;
    };
}

interface OrderResponse {
    message: string;
    data: IOrder;
}

interface OrderStatsResponse {
    message: string;
    data: IOrderStats;
}

export const orderApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getOrders: builder.query<OrdersResponse, OrderFilters | void>({
            query: (params) => ({
                url: '/orders',
                params: params || {},
            }),
            providesTags: (result) =>
                result
                    ? [
                          ...result.data.map(({ _id }) => ({
                              type: 'Order' as const,
                              id: _id,
                          })),
                          { type: 'Order', id: 'LIST' },
                      ]
                    : [{ type: 'Order', id: 'LIST' }],
        }),

        getOrderById: builder.query<OrderResponse, string>({
            query: (id) => `/orders/${id}`,
            providesTags: (_result, _error, id) => [{ type: 'Order', id }],
        }),

        getOrderStats: builder.query<OrderStatsResponse, void>({
            query: () => '/orders/stats',
            providesTags: [{ type: 'Order', id: 'STATS' }],
        }),

        getOrdersByClient: builder.query<
            { message: string; data: IOrder[] },
            { clientId: string; limit?: number }
        >({
            query: ({ clientId, limit }) => ({
                url: `/orders/client/${clientId}`,
                params: { limit },
            }),
            providesTags: (_result, _error, { clientId }) => [
                { type: 'Order', id: `CLIENT_${clientId}` },
            ],
        }),

        getOrderYears: builder.query<{ message: string; data: number[] }, void>(
            {
                query: () => '/orders/years',
                providesTags: [{ type: 'Order', id: 'YEARS' }],
            },
        ),

        createOrder: builder.mutation<OrderResponse, CreateOrderInput>({
            query: (data) => ({
                url: '/orders',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: [
                { type: 'Order', id: 'LIST' },
                { type: 'Order', id: 'STATS' },
            ],
        }),

        updateOrder: builder.mutation<
            OrderResponse,
            { id: string; data: UpdateOrderInput }
        >({
            query: ({ id, data }) => ({
                url: `/orders/${id}`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Order', id },
                { type: 'Order', id: 'LIST' },
                { type: 'Order', id: 'STATS' },
            ],
        }),

        updateOrderStatus: builder.mutation<
            OrderResponse,
            { id: string; data: UpdateStatusInput }
        >({
            query: ({ id, data }) => ({
                url: `/orders/${id}/status`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Order', id },
                { type: 'Order', id: 'LIST' },
                { type: 'Order', id: 'STATS' },
            ],
        }),

        extendDeadline: builder.mutation<
            OrderResponse,
            { id: string; data: ExtendDeadlineInput }
        >({
            query: ({ id, data }) => ({
                url: `/orders/${id}/extend-deadline`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Order', id },
                { type: 'Order', id: 'LIST' },
            ],
        }),

        addRevision: builder.mutation<
            OrderResponse,
            { id: string; data: AddRevisionInput }
        >({
            query: ({ id, data }) => ({
                url: `/orders/${id}/revision`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Order', id },
                { type: 'Order', id: 'LIST' },
                { type: 'Order', id: 'STATS' },
            ],
        }),

        deleteOrder: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/orders/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: [
                { type: 'Order', id: 'LIST' },
                { type: 'Order', id: 'STATS' },
            ],
        }),
    }),
});

export const {
    useGetOrdersQuery,
    useLazyGetOrdersQuery,
    useGetOrderByIdQuery,
    useGetOrderStatsQuery,
    useGetOrdersByClientQuery,
    useGetOrderYearsQuery,
    useCreateOrderMutation,
    useUpdateOrderMutation,
    useUpdateOrderStatusMutation,
    useExtendDeadlineMutation,
    useAddRevisionMutation,
    useDeleteOrderMutation,
} = orderApi;
