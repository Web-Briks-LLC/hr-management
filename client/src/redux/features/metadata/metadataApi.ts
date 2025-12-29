import { apiSlice } from '@/redux/api/apiSlice';

export interface IMetadata {
    _id: string;
    type: 'department' | 'designation';
    value: string;
    label: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface IMetadataCreate {
    type: 'department' | 'designation';
    value: string;
    label: string;
}

export const metadataApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getMetadataByType: builder.query<
            { success: boolean; data: IMetadata[] },
            'department' | 'designation'
        >({
            query: (type) => `/metadata/type/${type}`,
            providesTags: (result, error, type) => [
                { type: 'Metadata', id: type },
            ],
        }),

        getAllMetadata: builder.query<
            { success: boolean; data: IMetadata[] },
            void
        >({
            query: () => '/metadata',
            providesTags: ['Metadata'],
        }),

        createMetadata: builder.mutation<
            { success: boolean; data: IMetadata },
            IMetadataCreate
        >({
            query: (data) => ({
                url: '/metadata',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Metadata'],
        }),

        updateMetadata: builder.mutation<
            { success: boolean; data: IMetadata },
            { id: string; data: Partial<IMetadataCreate> }
        >({
            query: ({ id, data }) => ({
                url: `/metadata/${id}`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: ['Metadata'],
        }),

        deleteMetadata: builder.mutation<
            { success: boolean; message: string },
            string
        >({
            query: (id) => ({
                url: `/metadata/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Metadata'],
        }),
    }),
});

export const {
    useGetMetadataByTypeQuery,
    useGetAllMetadataQuery,
    useCreateMetadataMutation,
    useUpdateMetadataMutation,
    useDeleteMetadataMutation,
} = metadataApi;
