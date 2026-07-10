import { apiSlice } from '../../api/apiSlice';
import type {
    IReturnFileFormat,
    CreateReturnFileFormatInput,
    UpdateReturnFileFormatInput,
} from '@/types/order.type';

interface ReturnFileFormatsResponse {
    message: string;
    data: IReturnFileFormat[];
    meta: {
        total: number;
    };
}

interface ReturnFileFormatResponse {
    message: string;
    data: IReturnFileFormat;
}

interface GetReturnFileFormatsParams {
    isActive?: boolean;
    page?: number;
    limit?: number;
}

export const returnFileFormatApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getReturnFileFormats: builder.query<
            ReturnFileFormatsResponse,
            GetReturnFileFormatsParams | void
        >({
            query: (params) => ({
                url: '/return-file-formats',
                params: params || {},
            }),
            providesTags: ['ReturnFileFormat'],
        }),

        getReturnFileFormatById: builder.query<
            ReturnFileFormatResponse,
            string
        >({
            query: (id) => `/return-file-formats/${id}`,
            providesTags: (_result, _error, id) => [
                { type: 'ReturnFileFormat', id },
            ],
        }),

        createReturnFileFormat: builder.mutation<
            ReturnFileFormatResponse,
            CreateReturnFileFormatInput
        >({
            query: (data) => ({
                url: '/return-file-formats',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['ReturnFileFormat'],
        }),

        updateReturnFileFormat: builder.mutation<
            ReturnFileFormatResponse,
            { id: string; data: UpdateReturnFileFormatInput }
        >({
            query: ({ id, data }) => ({
                url: `/return-file-formats/${id}`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'ReturnFileFormat', id },
                'ReturnFileFormat',
            ],
        }),

        deleteReturnFileFormat: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/return-file-formats/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['ReturnFileFormat'],
        }),
    }),
});

export const {
    useGetReturnFileFormatsQuery,
    useGetReturnFileFormatByIdQuery,
    useCreateReturnFileFormatMutation,
    useUpdateReturnFileFormatMutation,
    useDeleteReturnFileFormatMutation,
} = returnFileFormatApi;
