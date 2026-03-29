export interface IInvoice {
    invoiceNumber: string;
    clientName: string;
    clientId: string;
    clientEmail?: string;
    clientAddress: string;
    totalAmount: number;
    currency: string;
    dueDate: string;
    paymentStatus: "pending" | "paid" | "failed";
    paymentToken?: string;
    pendingPaymentIntentId?: string | null;
    items: Array<{
        name: string;
        price: number;
        quantity: number;
    }>;
    month?: number;
    year?: number;
    totalImages?: number;
    dateFrom?: string;
    dateTo?: string;
    totalOrders?: number;
    orderIds?: string[];
    companyName?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface InvoicesResponse {
    success: boolean;
    invoices: IInvoice[];
}
