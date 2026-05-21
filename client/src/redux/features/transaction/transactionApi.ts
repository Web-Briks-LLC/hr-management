import { apiSlice } from '@/redux/api/apiSlice';
import type {
    TransactionsResponse,
    TransactionQueryParams,
} from '@/types/transaction.type';

export const transactionApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getUnifiedTransactions: builder.query<TransactionsResponse, TransactionQueryParams>({
            query: (params) => ({
                url: '/transactions',
                params,
            }),
            // Invalidate/refetch when relevant tags change to keep ledger in sync
            providesTags: (result) => [
                { type: 'Earning' as const, id: 'LIST' },
                { type: 'Expense' as const, id: 'LIST' },
                { type: 'Debit' as const, id: 'LIST' },
                { type: 'Distribution' as const, id: 'LIST' },
                { type: 'WalletTransaction' as const, id: 'LIST' },
                { type: 'ProfitTransfer' as const, id: 'LIST' },
            ],
        }),
    }),
    overrideExisting: false,
});

export const {
    useGetUnifiedTransactionsQuery,
    useLazyGetUnifiedTransactionsQuery,
} = transactionApi;
