import { apiSlice } from '@/redux/api/apiSlice';

// Types
export interface IExternalBusiness {
    _id: string;
    name: string;
    description?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    isActive: boolean;
    createdBy: {
        _id: string;
        name: string;
        email: string;
    };
    createdAt: string;
    updatedAt: string;
}

export interface IProfitTransfer {
    _id: string;
    businessId: {
        _id: string;
        name: string;
    };
    amount: number;
    transferDate: string;
    periodType: 'month' | 'year';
    month?: number;
    year: number;
    notes?: string;
    transferredBy: {
        _id: string;
        name: string;
        email: string;
    };
    createdAt: string;
    updatedAt: string;
}

export interface ProfitTransferStats {
    totalTransferred: number;
    transferCount: number;
    byBusiness: {
        businessId: string;
        businessName: string;
        totalAmount: number;
        transferCount: number;
    }[];
}

export interface BusinessesResponse {
    message: string;
    data: IExternalBusiness[];
    meta: {
        total: number;
    };
}

export interface TransfersResponse {
    message: string;
    data: IProfitTransfer[];
    meta: {
        total: number;
        page: number;
        totalPages: number;
    };
}

export interface TransferStatsResponse {
    message: string;
    data: ProfitTransferStats;
}

export interface CreateBusinessInput {
    name: string;
    description?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
}

export interface UpdateBusinessInput {
    name?: string;
    description?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    isActive?: boolean;
}

export interface CreateTransferInput {
    businessId: string;
    amount: number;
    transferDate?: string;
    periodType: 'month' | 'year';
    month?: number;
    year: number;
    notes?: string;
}

const externalBusinessApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        // Businesses
        getBusinesses: builder.query<
            BusinessesResponse,
            { isActive?: boolean } | void
        >({
            query: (params) => ({
                url: '/external-business/businesses',
                params: params || undefined,
            }),
            providesTags: (result) =>
                result
                    ? [
                          ...result.data.map(({ _id }) => ({
                              type: 'ExternalBusiness' as const,
                              id: _id,
                          })),
                          { type: 'ExternalBusiness', id: 'LIST' },
                      ]
                    : [{ type: 'ExternalBusiness', id: 'LIST' }],
        }),

        createBusiness: builder.mutation<
            { message: string; data: IExternalBusiness },
            CreateBusinessInput
        >({
            query: (data) => ({
                url: '/external-business/businesses',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: [{ type: 'ExternalBusiness', id: 'LIST' }],
        }),

        updateBusiness: builder.mutation<
            { message: string; data: IExternalBusiness },
            { id: string; data: UpdateBusinessInput }
        >({
            query: ({ id, data }) => ({
                url: `/external-business/businesses/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'ExternalBusiness', id },
                { type: 'ExternalBusiness', id: 'LIST' },
            ],
        }),

        deleteBusiness: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/external-business/businesses/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: [{ type: 'ExternalBusiness', id: 'LIST' }],
        }),

        // Transfers
        transferProfit: builder.mutation<
            { message: string; data: IProfitTransfer },
            CreateTransferInput
        >({
            query: (data) => ({
                url: '/external-business/transfers',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: [
                { type: 'ProfitTransfer', id: 'LIST' },
                { type: 'TransferStats', id: 'STATS' },
            ],
        }),

        getTransfers: builder.query<
            TransfersResponse,
            {
                page?: number;
                limit?: number;
                businessId?: string;
                periodType?: 'month' | 'year';
                year?: number;
                month?: number;
            } | void
        >({
            query: (params) => ({
                url: '/external-business/transfers',
                params: params || undefined,
            }),
            providesTags: (result) =>
                result
                    ? [
                          ...result.data.map(({ _id }) => ({
                              type: 'ProfitTransfer' as const,
                              id: _id,
                          })),
                          { type: 'ProfitTransfer', id: 'LIST' },
                      ]
                    : [{ type: 'ProfitTransfer', id: 'LIST' }],
        }),

        getTransferStats: builder.query<
            TransferStatsResponse,
            { year?: number; month?: number } | void
        >({
            query: (params) => ({
                url: '/external-business/transfers/stats',
                params: params || undefined,
            }),
            providesTags: [{ type: 'TransferStats', id: 'STATS' }],
        }),

        deleteTransfer: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/external-business/transfers/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: [
                { type: 'ProfitTransfer', id: 'LIST' },
                { type: 'TransferStats', id: 'STATS' },
            ],
        }),
    }),
    overrideExisting: false,
});

export const {
    useGetBusinessesQuery,
    useCreateBusinessMutation,
    useUpdateBusinessMutation,
    useDeleteBusinessMutation,
    useTransferProfitMutation,
    useGetTransfersQuery,
    useGetTransferStatsQuery,
    useDeleteTransferMutation,
} = externalBusinessApi;
