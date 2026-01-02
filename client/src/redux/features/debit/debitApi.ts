import { apiSlice } from '../../api/apiSlice';

interface Person {
    _id: string;
    name: string;
    phone?: string;
    address?: string;
    description?: string;
    createdAt: string;
}

interface Debit {
    _id: string;
    personId: {
        _id: string;
        name: string;
    };
    amount: number;
    date: string;
    type: 'Borrow' | 'Return';
    description?: string;
    createdAt: string;
}

interface DebitStats {
    _id: string;
    name: string;
    totalBorrowed: number;
    totalReturned: number;
    netBalance: number;
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
        getDebits: builder.query<Debit[], string | void>({
            query: (personId) =>
                personId
                    ? `/debits/debits?personId=${personId}`
                    : '/debits/debits',
            providesTags: ['Debit'],
        }),
        createDebit: builder.mutation<
            Debit,
            {
                personId: string;
                amount: number;
                date?: string;
                type: 'Borrow' | 'Return';
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
                type: 'Borrow' | 'Return';
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
