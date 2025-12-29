import { apiSlice } from '@/redux/api/apiSlice';

// Types
export interface IShareholder {
    _id: string;
    name: string;
    email: string;
    percentage: number;
    isActive: boolean;
    createdBy: {
        _id: string;
        name: string;
        email: string;
    };
    createdAt: string;
    updatedAt: string;
}

export interface IProfitDistribution {
    _id: string;
    shareholderId: {
        _id: string;
        name: string;
        email: string;
        percentage: number;
    };
    periodType: 'month' | 'year';
    month?: number;
    year: number;
    totalProfit: number;
    sharePercentage: number;
    shareAmount: number;
    status: 'pending' | 'distributed';
    distributedAt: string;
    distributedBy: {
        _id: string;
        name: string;
        email: string;
    };
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ProfitSummary {
    totalEarnings: number;
    totalExpenses: number;
    netProfit: number;
    period: {
        type: 'month' | 'year';
        month?: number;
        year: number;
    };
}

export interface ShareholdersResponse {
    message: string;
    data: IShareholder[];
    meta: {
        total: number;
        totalPercentage: number;
        remainingPercentage: number;
    };
}

export interface ProfitSummaryResponse {
    message: string;
    data: ProfitSummary;
}

export interface DistributionsResponse {
    message: string;
    data: IProfitDistribution[];
    meta: {
        total: number;
        page: number;
        totalPages: number;
    };
}

export interface CreateShareholderInput {
    name: string;
    email: string;
    percentage: number;
}

export interface UpdateShareholderInput {
    name?: string;
    email?: string;
    percentage?: number;
    isActive?: boolean;
}

export interface DistributeProfitInput {
    shareholderIds: string[];
    periodType: 'month' | 'year';
    month?: number;
    year: number;
    notes?: string;
}

const profitShareApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        // Shareholders
        getShareholders: builder.query<
            ShareholdersResponse,
            { isActive?: boolean } | void
        >({
            query: (params) => ({
                url: '/profit-share/shareholders',
                params: params || undefined,
            }),
            providesTags: (result) =>
                result
                    ? [
                          ...result.data.map(({ _id }) => ({
                              type: 'Shareholder' as const,
                              id: _id,
                          })),
                          { type: 'Shareholder', id: 'LIST' },
                      ]
                    : [{ type: 'Shareholder', id: 'LIST' }],
        }),

        createShareholder: builder.mutation<
            { message: string; data: IShareholder },
            CreateShareholderInput
        >({
            query: (data) => ({
                url: '/profit-share/shareholders',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: [{ type: 'Shareholder', id: 'LIST' }],
        }),

        updateShareholder: builder.mutation<
            { message: string; data: IShareholder },
            { id: string; data: UpdateShareholderInput }
        >({
            query: ({ id, data }) => ({
                url: `/profit-share/shareholders/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Shareholder', id },
                { type: 'Shareholder', id: 'LIST' },
            ],
        }),

        deleteShareholder: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/profit-share/shareholders/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: [{ type: 'Shareholder', id: 'LIST' }],
        }),

        // Profit Summary
        getProfitSummary: builder.query<
            ProfitSummaryResponse,
            { periodType?: 'month' | 'year'; month?: number; year: number }
        >({
            query: (params) => ({
                url: '/profit-share/summary',
                params,
            }),
            providesTags: [{ type: 'ProfitSummary', id: 'SUMMARY' }],
        }),

        // Distributions
        distributeProfit: builder.mutation<
            { message: string; data: IProfitDistribution[] },
            DistributeProfitInput
        >({
            query: (data) => ({
                url: '/profit-share/distribute',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: [
                { type: 'Distribution', id: 'LIST' },
                { type: 'ProfitSummary', id: 'SUMMARY' },
            ],
        }),

        getDistributions: builder.query<
            DistributionsResponse,
            {
                page?: number;
                limit?: number;
                shareholderId?: string;
                periodType?: 'month' | 'year';
                year?: number;
                month?: number;
            } | void
        >({
            query: (params) => ({
                url: '/profit-share/distributions',
                params: params || undefined,
            }),
            providesTags: (result) =>
                result
                    ? [
                          ...result.data.map(({ _id }) => ({
                              type: 'Distribution' as const,
                              id: _id,
                          })),
                          { type: 'Distribution', id: 'LIST' },
                      ]
                    : [{ type: 'Distribution', id: 'LIST' }],
        }),
    }),
    overrideExisting: false,
});

export const {
    useGetShareholdersQuery,
    useCreateShareholderMutation,
    useUpdateShareholderMutation,
    useDeleteShareholderMutation,
    useGetProfitSummaryQuery,
    useDistributeProfitMutation,
    useGetDistributionsQuery,
} = profitShareApi;
