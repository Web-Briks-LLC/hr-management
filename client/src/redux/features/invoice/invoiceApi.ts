import { apiSlice } from "../../api/apiSlice";

interface InvoiceNumberResponse {
    success: boolean;
    invoiceNumber: number;
    formattedInvoiceNumber: string;
}

interface SendEmailResponse {
    success: boolean;
    message: string;
}
interface RecordInvoiceData {
    invoiceNumber: string;
    clientName: string;
    clientId: string;
    clientAddress: string;
    totalAmount: number;
    currency: string;
    dueDate: string; // ISO string
    month: number;
    year: number;
    items: Array<{ name: string; price: number; quantity: number }>;
}

interface RecordInvoiceResponse {
    success: boolean;
    invoice: Record<string, unknown>;
}

export const invoiceApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getNextInvoiceNumber: builder.query<InvoiceNumberResponse, void>({
            query: () => "/invoices/next-number",
            keepUnusedDataFor: 0, // Always refetch
        }),
        sendInvoiceEmail: builder.mutation<SendEmailResponse, FormData>({
            query: (formData) => ({
                url: "/invoices/send-email",
                method: "POST",
                body: formData,
                // Don't set Content-Type header - browser will set it with boundary for FormData
                formData: true,
            }),
        }),
        recordInvoice: builder.mutation<
            RecordInvoiceResponse,
            RecordInvoiceData
        >({
            query: (data) => ({
                url: "/invoices/record",
                method: "POST",
                body: data,
            }),
        }),
    }),
});

export const {
    useLazyGetNextInvoiceNumberQuery,
    useSendInvoiceEmailMutation,
    useRecordInvoiceMutation,
} = invoiceApi;
