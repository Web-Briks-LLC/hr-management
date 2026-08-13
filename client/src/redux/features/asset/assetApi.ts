import { apiSlice } from '@/redux/api/apiSlice';
import type {
    AssetsResponse,
    AssetResponse,
    AssetStatsResponse,
    AssetFilters,
    IAsset,
} from '@/types/asset.type';

export const assetApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        // Get all assets with filtering and pagination
        getAssets: builder.query<AssetsResponse, AssetFilters>({
            query: (params) => ({
                url: '/assets',
                method: 'GET',
                params,
            }),
            providesTags: (result) =>
                result && Array.isArray(result.data)
                    ? [
                          ...result.data.map(({ _id }) => ({
                              type: 'Asset' as const,
                              id: _id,
                          })),
                          { type: 'Asset' as const, id: 'LIST' },
                      ]
                    : [{ type: 'Asset' as const, id: 'LIST' }],
        }),

        // Get asset stats
        getAssetStats: builder.query<AssetStatsResponse, void>({
            query: () => ({
                url: '/assets/stats',
                method: 'GET',
            }),
            providesTags: [{ type: 'AssetStats' as const, id: 'STATS' }],
        }),

        // Get asset by ID
        getAssetById: builder.query<AssetResponse, string>({
            query: (id) => ({
                url: `/assets/${id}`,
                method: 'GET',
            }),
            providesTags: (_result, _error, id) => [{ type: 'Asset' as const, id }],
        }),

        // Generate next asset tag preview
        getNextAssetTag: builder.query<{ success: boolean; data: { assetTag: string } }, string | void>({
            query: (category) => ({
                url: '/assets/generate-tag',
                method: 'GET',
                params: category ? { category } : {},
            }),
        }),

        // Create new asset
        createAsset: builder.mutation<AssetResponse, Partial<IAsset>>({
            query: (data) => ({
                url: '/assets',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: [
                { type: 'Asset', id: 'LIST' },
                { type: 'AssetStats', id: 'STATS' },
            ],
        }),

        // Update asset
        updateAsset: builder.mutation<AssetResponse, { id: string; data: Partial<IAsset> }>({
            query: ({ id, data }) => ({
                url: `/assets/${id}`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Asset', id },
                { type: 'Asset', id: 'LIST' },
                { type: 'AssetStats', id: 'STATS' },
            ],
        }),

        // Delete asset
        deleteAsset: builder.mutation<{ success: boolean; message: string }, string>({
            query: (id) => ({
                url: `/assets/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: [
                { type: 'Asset', id: 'LIST' },
                { type: 'AssetStats', id: 'STATS' },
            ],
        }),
    }),
    overrideExisting: false,
});

export const {
    useGetAssetsQuery,
    useGetAssetStatsQuery,
    useGetAssetByIdQuery,
    useGetNextAssetTagQuery,
    useLazyGetNextAssetTagQuery,
    useCreateAssetMutation,
    useUpdateAssetMutation,
    useDeleteAssetMutation,
} = assetApi;
