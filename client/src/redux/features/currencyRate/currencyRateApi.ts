import { apiSlice } from '@/redux/api/apiSlice';
import type {
    CurrencyRatesResponse,
    UpdateCurrencyRatesInput,
} from '@/types/currency-rate.type';

const currencyRateApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getCurrencyRates: builder.query<
            CurrencyRatesResponse,
            { month: number; year: number }
        >({
            query: ({ month, year }) => `/currency-rates/${month}/${year}`,
        }),

        updateCurrencyRates: builder.mutation<
            CurrencyRatesResponse,
            { month: number; year: number; data: UpdateCurrencyRatesInput }
        >({
            query: ({ month, year, data }) => ({
                url: `/currency-rates/${month}/${year}`,
                method: 'PUT',
                body: data,
            }),
        }),
    }),
    overrideExisting: false,
});

export const {
    useGetCurrencyRatesQuery,
    useLazyGetCurrencyRatesQuery,
    useUpdateCurrencyRatesMutation,
} = currencyRateApi;
