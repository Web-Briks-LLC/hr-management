import { apiSlice } from '../../api/apiSlice';

interface InvoiceNumberResponse {
    success: boolean;
    invoiceNumber: number;
    formattedInvoiceNumber: string;
}

export const invoiceApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getNextInvoiceNumber: builder.query<InvoiceNumberResponse, void>({
            query: () => '/invoices/next-number',
            keepUnusedDataFor: 0, // Always refetch
        }),
    }),
});

export const { useLazyGetNextInvoiceNumberQuery } = invoiceApi;
