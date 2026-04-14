import { apiSlice } from '../../api/apiSlice';

export interface Person {
    _id: string;
    name: string;
    phone?: string;
    address?: string;
    description?: string;
    createdAt: string;
}

export type DebitTransactionType = 'Borrow' | 'Return';

export interface Debit {
    _id: string;
    personId: {
        _id: string;
        name: string;
    };
    amount: number;
    date: string;
    type: DebitTransactionType;
    description?: string;
    createdAt: string;
}

export interface DebitStats {
    _id: string;
    name: string;
    totalBorrowed: number;
    totalReturned: number;
    netBalance: number;
}

export interface DebitPagination {
    page: number;
    limit: number;
    total: number;
    pages: number;
}

export interface DebitsResponse {
    data: Debit[];
    pagination: DebitPagination;
    filters: {
        personId: string | null;
        type: DebitTransactionType | null;
        date: string | null;
    };
}

export interface GetDebitsParams {
    personId?: string;
    page?: number;
    limit?: number;
    type?: DebitTransactionType | 'all';
    date?: string;
}

export const debitApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        // Persons
        getPersons: builder.query<Person[], void>({
            query: () => '/debits/persons',
            providesTags: ['DebitPerson'],
        }),
        createPerson: builder.mutation<
            Person,
            {
                name: string;
                phone?: string;
                address?: string;
                description?: string;
            }
        >({
            query: (data) => ({
                url: '/debits/persons',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['DebitPerson', 'DebitStats'],
        }),
        updatePerson: builder.mutation<
            Person,
            {
                id: string;
                name: string;
                phone?: string;
                address?: string;
                description?: string;
            }
        >({
            query: ({ id, ...data }) => ({
                url: `/debits/persons/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['DebitPerson', 'DebitStats'],
        }),
        deletePerson: builder.mutation<void, string>({
            query: (id) => ({
                url: `/debits/persons/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['DebitPerson', 'Debit', 'DebitStats'],
        }),

        // Debits
        getDebits: builder.query<DebitsResponse, GetDebitsParams | void>({
            query: (params) => {
                const searchParams = new URLSearchParams();

                if (params?.personId) searchParams.set('personId', params.personId);
                if (params?.page) searchParams.set('page', String(params.page));
                if (params?.limit) searchParams.set('limit', String(params.limit));
                if (params?.type && params.type !== 'all') {
                    searchParams.set('type', params.type);
                }
                if (params?.date) searchParams.set('date', params.date);

                const queryString = searchParams.toString();
                return queryString
                    ? `/debits/debits?${queryString}`
                    : '/debits/debits';
            },
            providesTags: ['Debit'],
        }),
        createDebit: builder.mutation<
            Debit,
            {
                personId: string;
                amount: number;
                date?: string;
                type: DebitTransactionType;
                description?: string;
            }
        >({
            query: (data) => ({
                url: '/debits/debits',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Debit', 'DebitStats'],
        }),
        updateDebit: builder.mutation<
            Debit,
            {
                id: string;
                amount: number;
                date?: string;
                type: DebitTransactionType;
                description?: string;
            }
        >({
            query: ({ id, ...data }) => ({
                url: `/debits/debits/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['Debit', 'DebitStats'],
        }),
        deleteDebit: builder.mutation<void, string>({
            query: (id) => ({
                url: `/debits/debits/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Debit', 'DebitStats'],
        }),

        // Stats
        getDebitStats: builder.query<DebitStats[], void>({
            query: () => '/debits/stats',
            providesTags: ['DebitStats'],
        }),
    }),
});

export const {
    useGetPersonsQuery,
    useCreatePersonMutation,
    useUpdatePersonMutation,
    useDeletePersonMutation,
    useGetDebitsQuery,
    useCreateDebitMutation,
    useUpdateDebitMutation,
    useDeleteDebitMutation,
    useGetDebitStatsQuery,
} = debitApi;
