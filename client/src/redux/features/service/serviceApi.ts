import { apiSlice } from '../../api/apiSlice';
import type {
    IService,
    CreateServiceInput,
    UpdateServiceInput,
} from '@/types/order.type';

interface ServicesResponse {
    message: string;
    data: (IService & { usageCount: number })[];
    meta: {
        total: number;
    };
}

interface ServiceResponse {
    message: string;
    data: IService;
}

interface GetServicesParams {
    isActive?: boolean;
    page?: number;
    limit?: number;
    search?: string;
}

export const serviceApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getServices: builder.query<ServicesResponse, GetServicesParams | void>({
            query: (params) => ({
                url: '/services',
                params: params || {},
            }),
            providesTags: ['Service'],
        }),

        getServiceById: builder.query<ServiceResponse, string>({
            query: (id) => `/services/${id}`,
            providesTags: (_result, _error, id) => [{ type: 'Service', id }],
        }),

        checkServiceUsage: builder.query<{ data: { hasUsage: boolean } }, string>({
            query: (id) => `/services/${id}/usage`,
        }),

        createService: builder.mutation<ServiceResponse, CreateServiceInput>({
            query: (data) => ({
                url: '/services',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Service'],
        }),

        updateService: builder.mutation<
            ServiceResponse,
            { id: string; data: UpdateServiceInput }
        >({
            query: ({ id, data }) => ({
                url: `/services/${id}`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Service', id },
                'Service',
            ],
        }),

        deleteService: builder.mutation<
            { message: string }, 
            { id: string; migrationId?: string }
        >({
            query: ({ id, migrationId }) => ({
                url: `/services/${id}`,
                method: 'DELETE',
                body: { migrationId },
            }),
            invalidatesTags: ['Service'],
        }),
    }),
});

export const {
    useGetServicesQuery,
    useGetServiceByIdQuery,
    useCheckServiceUsageQuery,
    useLazyCheckServiceUsageQuery,
    useCreateServiceMutation,
    useUpdateServiceMutation,
    useDeleteServiceMutation,
} = serviceApi;
