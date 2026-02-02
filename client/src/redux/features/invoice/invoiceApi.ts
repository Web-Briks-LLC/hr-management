import { apiSlice } from '../../api/apiSlice';

interface InvoiceNumberResponse {
    success: boolean;
    invoiceNumber: number;
    formattedInvoiceNumber: string;
}

interface SendEmailResponse {
    success: boolean;
    message: string;
}

export const invoiceApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getNextInvoiceNumber: builder.query<InvoiceNumberResponse, void>({
            query: () => '/invoices/next-number',
            keepUnusedDataFor: 0, // Always refetch
        }),
        sendInvoiceEmail: builder.mutation<SendEmailResponse, FormData>({
            query: (formData) => ({
                url: '/invoices/send-email',
                method: 'POST',
                body: formData,
                // Don't set Content-Type header - browser will set it with boundary for FormData
                formData: true,
            }),
        }),
    }),
});

export const { useLazyGetNextInvoiceNumberQuery, useSendInvoiceEmailMutation } =
    invoiceApi;
