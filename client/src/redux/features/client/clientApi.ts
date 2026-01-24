import { apiSlice } from '@/redux/api/apiSlice';
import type {
    Client,
    ClientQueryParams,
    ClientsResponse,
} from '@/types/client.type';

export const clientApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getClients: builder.query<ClientsResponse, ClientQueryParams>({
            query: (params) => ({
                url: '/clients',
                method: 'GET',
                params,
            }),
            transformResponse: (response: { data: ClientsResponse }) =>
                response.data,
            providesTags: ['Client'],
        }),
        getClientById: builder.query<Client, string>({
            query: (id) => ({
                url: `/clients/${id}`,
                method: 'GET',
            }),
            transformResponse: (response: { data: Client }) => response.data,
            providesTags: ['Client'],
        }),
        createClient: builder.mutation<Client, Partial<Client>>({
            query: (body) => ({
                url: '/clients',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Client'],
        }),
        updateClient: builder.mutation<
            Client,
            { id: string } & Partial<Client>
        >({
            query: ({ id, ...body }) => ({
                url: `/clients/${id}`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: ['Client'],
        }),
        deleteClient: builder.mutation<void, string>({
            query: (id) => ({
                url: `/clients/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Client'],
        }),
        checkClientId: builder.query<
            { available: boolean; suggestions?: string[] },
            string
        >({
            query: (clientId) => ({
                url: `/clients/check-id/${clientId}`,
                method: 'GET',
            }),
            transformResponse: (response: {
                data: { available: boolean; suggestions?: string[] };
            }) => response.data,
        }),
        getClientStats: builder.query<
            {
                totalOrders: number;
                totalAmount: number;
                totalImages: number;
                paidAmount: number;
                totalBDT: number;
                dueAmount: number;
            },
            {
                clientId: string;
                month?: number;
                year?: number;
                status?: string;
                priority?: string;
                search?: string;
            }
        >({
            query: ({ clientId, ...filters }) => ({
                url: `/clients/${clientId}/stats`,
                method: 'GET',
                params: filters,
            }),
            transformResponse: (response: {
                data: {
                    totalOrders: number;
                    totalAmount: number;
                    totalImages: number;
                    paidAmount: number;
                    totalBDT: number;
                    dueAmount: number;
                };
            }) => response.data,
            providesTags: ['Client'],
        }),
    }),
});

export const {
    useGetClientsQuery,
    useGetClientByIdQuery,
    useCreateClientMutation,
    useUpdateClientMutation,
    useDeleteClientMutation,
    useLazyCheckClientIdQuery,
    useGetClientStatsQuery,
} = clientApi;
