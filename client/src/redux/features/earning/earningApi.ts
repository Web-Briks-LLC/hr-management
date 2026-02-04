import { apiSlice } from '@/redux/api/apiSlice';
import type {
    EarningsResponse,
    EarningResponse,
    EarningStatsResponse,
    EarningFilters,
    WithdrawEarningInput,
    ToggleStatusInput,
    ClientOrdersResponse,
    YearsResponse,
} from '@/types/earning.type';

const earningApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        // Get all earnings with filters
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

        // Get earning by ID
        getEarningById: builder.query<EarningResponse, string>({
            query: (id) => `/earnings/${id}`,
            providesTags: (_result, _error, id) => [{ type: 'Earning', id }],
        }),

        // Get earning stats (with optional filter)
        getEarningStats: builder.query<
            EarningStatsResponse,
            EarningFilters | void
        >({
            query: (params) => ({
                url: '/earnings/stats',
                params: params || {},
            }),
            providesTags: [{ type: 'Earning', id: 'STATS' }],
        }),

        // Get available years
        getEarningYears: builder.query<YearsResponse, void>({
            query: () => '/earnings/years',
        }),

        // Get client monthly earning for withdraw
        getClientOrdersForWithdraw: builder.query<
            ClientOrdersResponse,
            { clientId: string; month: number; year: number }
        >({
            query: ({ clientId, month, year }) => ({
                url: '/earnings/client-orders',
                params: { clientId, month, year },
            }),
        }),

        // Get clients with earnings for filter
        getClientsWithEarnings: builder.query<
            {
                message: string;
                data: {
                    _id: string;
                    name: string;
                    clientId: string;
                    currency?: string;
                }[];
            },
            { month: number; year: number }
        >({
            query: ({ month, year }) => ({
                url: '/earnings/clients',
                params: { month, year },
            }),
        }),

        // Withdraw single earning (mark as paid)
        withdrawEarning: builder.mutation<
            EarningResponse,
            { id: string; data: WithdrawEarningInput }
        >({
            query: ({ id, data }) => ({
                url: `/earnings/${id}/withdraw`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Earning', id },
                { type: 'Earning', id: 'LIST' },
                { type: 'Earning', id: 'STATS' },
            ],
        }),

        // Toggle earning status
        toggleEarningStatus: builder.mutation<
            EarningResponse,
            { id: string; data: ToggleStatusInput }
        >({
            query: ({ id, data }) => ({
                url: `/earnings/${id}/toggle-status`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Earning', id },
                { type: 'Earning', id: 'LIST' },
                { type: 'Earning', id: 'STATS' },
            ],
        }),

        // Delete earning
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

        // Update earning
        updateEarning: builder.mutation<
            EarningResponse,
            { id: string; data: Partial<{ clientId: string }> }
        >({
            query: ({ id, data }) => ({
                url: `/earnings/${id}`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Earning', id },
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
    useGetEarningYearsQuery,
    useGetClientOrdersForWithdrawQuery,
    useLazyGetClientOrdersForWithdrawQuery,
    useWithdrawEarningMutation,
    useToggleEarningStatusMutation,
    useDeleteEarningMutation,
    useUpdateEarningMutation,
    useLazyGetClientsWithEarningsQuery,
} = earningApi;
