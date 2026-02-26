import { redirect } from "next/navigation";
import PaymentUI from "@/components/PaymentUI";

export default async function PaymentPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    // const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;

    let invoice = null;
    const token =
        typeof resolvedSearchParams.token === "string"
            ? resolvedSearchParams.token
            : null;

    if (token) {
        try {
            const dbConnect = (await import("@/lib/db")).default;
            await dbConnect();
            const mongoose = (await import("mongoose")).default;

            // Define model inline or use existing if shared
            const InvoiceSchema = new mongoose.Schema({
                invoiceNumber: String,
                clientName: String,
                clientId: String,
                clientAddress: String,
                companyName: String,
                totalAmount: Number,
                currency: String,
                dueDate: Date,
                paymentToken: String,
                month: Number,
                year: Number,
                totalImages: Number,
                dateFrom: Date,
                dateTo: Date,
                totalOrders: Number,
                items: Array,
                paymentStatus: String,
            });

            const InvoiceRecord =
                mongoose.models.InvoiceRecord ||
                mongoose.model("InvoiceRecord", InvoiceSchema);

            invoice = await InvoiceRecord.findOne({
                paymentToken: token,
            }).lean();

            const { decryptPayload } = await import("@/lib/crypto");
            const decryptedInfo = decryptPayload(token);

            if (!invoice) {
                console.error("Invoice not found for token.");
            } else if (decryptedInfo) {
                // Attach decrypted info in case DB is missing some fields from older versions
                invoice = { ...decryptedInfo, ...invoice };
            } else {
                console.error("Failed to decrypt token.");
            }
        } catch (error) {
            console.error("Failed to fetch invoice from DB:", error);
        }
    }

    if (!invoice) {
        redirect("/");
    }

    if (invoice.paymentStatus?.toLowerCase() === "paid") {
        redirect(`/success?already_paid=true&invoice=${invoice.invoiceNumber}`);
    }

    const plainInvoice = JSON.parse(JSON.stringify(invoice));

    return <PaymentUI invoice={plainInvoice} />;
}
