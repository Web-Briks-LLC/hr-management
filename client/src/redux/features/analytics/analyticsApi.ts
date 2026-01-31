import { apiSlice } from '@/redux/api/apiSlice';
import type {
    IFinanceAnalytics,
    AnalyticsQueryParams,
} from '@/types/analytics.type';

export const analyticsApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getFinanceAnalytics: builder.query<
            IFinanceAnalytics,
            AnalyticsQueryParams | void
        >({
            query: (params) => {
                const queryParams = new URLSearchParams();
                if (params?.year)
                    queryParams.append('year', params.year.toString());
                if (params?.month)
                    queryParams.append('month', params.month.toString());
                if (params?.months)
                    queryParams.append('months', params.months.toString());

                const queryString = queryParams.toString();
                return {
                    url: `/analytics/finance${
                        queryString ? `?${queryString}` : ''
                    }`,
                    method: 'GET',
                };
            },
            transformResponse: (response: { data: IFinanceAnalytics }) =>
                response.data,
            providesTags: ['Earning', 'Order'],
            keepUnusedDataFor: 60,
        }),
        getAnalyticsYears: builder.query<number[], void>({
            query: () => ({
                url: '/analytics/finance/years',
                method: 'GET',
            }),
            transformResponse: (response: { data: number[] }) => response.data,
            keepUnusedDataFor: 300, // Cache for 5 minutes
        }),
    }),
});

export const { useGetFinanceAnalyticsQuery, useGetAnalyticsYearsQuery } =
    analyticsApi;
