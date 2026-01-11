import { apiSlice } from '@/redux/api/apiSlice';
import type {
    EarningsResponse,
    EarningResponse,
    EarningStatsResponse,
    OrdersForWithdrawalResponse,
    CreateEarningInput,
    UpdateEarningInput,
    EarningFilters,
} from '@/types/earning.type';
import type { MonthlySummaryResponse } from '@/types/currency-rate.type';

const earningApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getEarnings: builder.query<EarningsResponse, EarningFilters>({
            query: (params) => ({
                url: '/earnings',
                params,
            }),
            providesTags: (result) =>
                result
                    ? [
                          ...result.data.map(({ _id }) => ({
                              type: 'Earning' as const,
                              id: _id,
                          })),
                          { type: 'Earning', id: 'LIST' },
                      ]
                    : [{ type: 'Earning', id: 'LIST' }],
        }),

        getEarningById: builder.query<EarningResponse, string>({
            query: (id) => `/earnings/${id}`,
            providesTags: (_result, _error, id) => [{ type: 'Earning', id }],
        }),

        getEarningStats: builder.query<EarningStatsResponse, void>({
            query: () => '/earnings/stats',
            providesTags: [{ type: 'Earning', id: 'STATS' }],
        }),

        getOrdersForWithdrawal: builder.query<
            OrdersForWithdrawalResponse,
            { clientId: string; month: number; year: number }
        >({
            query: ({ clientId, month, year }) => ({
                url: '/earnings/orders',
                params: { clientId, month, year },
            }),
        }),

        getMonthlySummary: builder.query<
            MonthlySummaryResponse,
            { month: number; year: number }
        >({
            query: ({ month, year }) => ({
                url: '/earnings/monthly-summary',
                params: { month, year },
            }),
        }),

        createEarning: builder.mutation<EarningResponse, CreateEarningInput>({
            query: (data) => ({
                url: '/earnings',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: [
                { type: 'Earning', id: 'LIST' },
                { type: 'Earning', id: 'STATS' },
            ],
        }),

        updateEarning: builder.mutation<
            EarningResponse,
            { id: string; data: UpdateEarningInput }
        >({
            query: ({ id, data }) => ({
                url: `/earnings/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Earning', id },
                { type: 'Earning', id: 'LIST' },
                { type: 'Earning', id: 'STATS' },
            ],
        }),

        deleteEarning: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/earnings/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: [
                { type: 'Earning', id: 'LIST' },
                { type: 'Earning', id: 'STATS' },
            ],
        }),
    }),
    overrideExisting: false,
});

export const {
    useGetEarningsQuery,
    useGetEarningByIdQuery,
    useGetEarningStatsQuery,
    useGetOrdersForWithdrawalQuery,
    useLazyGetOrdersForWithdrawalQuery,
    useGetMonthlySummaryQuery,
    useCreateEarningMutation,
    useUpdateEarningMutation,
    useDeleteEarningMutation,
} = earningApi;

