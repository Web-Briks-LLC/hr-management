"use client";
import * as React from "react";

import { PDFViewer, PDFDownloadLink, pdf } from "@react-pdf/renderer";
import { Mail, Download } from "lucide-react";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    useSendInvoiceEmailMutation,
    useRecordInvoiceMutation,
} from "@/redux/features/invoice/invoiceApi";
import { Button } from "../ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { InvoiceDocument } from "./invoice-document";
import type { InvoicePDFProps } from "./invoice-document";

export { InvoiceDocument } from "./invoice-document";
export type { InvoicePDFProps } from "./invoice-document";

export default function InvoicePDF(props: InvoicePDFProps) {
    const fileName = `Invoice_${props.client.clientId}_${props.month}_${props.year}.pdf`;
    const [sendInvoiceEmail, { isLoading: isSending }] =
        useSendInvoiceEmailMutation();
    const [recordInvoice] = useRecordInvoiceMutation();
    const [selectedEmail, setSelectedEmail] = React.useState<string>(
        (props.client.emails && props.client.emails[0]) || ""
    );
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);

    const performEmailSend = async (email: string) => {
        if (!email) {
            toast.error("Client email is missing or not selected.");
            return;
        }

        try {
            // Calculate order dates
            const orderDates = props.orders.map((o) =>
                new Date(o.orderDate).getTime(),
            );
            const minDate = orderDates.length > 0 ? new Date(Math.min(...orderDates)).toISOString() : undefined;
            const maxDate = orderDates.length > 0 ? new Date(Math.max(...orderDates)).toISOString() : undefined;

            // Record the invoice in the database first to get the paymentToken
            const recordResult = await recordInvoice({
                invoiceNumber: props.invoiceNumber,
                clientName: props.client.name,
                clientId: props.client.clientId,
                clientAddress:
                    props.client.address || props.client.officeAddress || "N/A",
                companyName: props.client.officeAddress || "N/A",
                totalAmount: props.totals.totalAmount,
                currency: props.client.currency || "USD",
                dueDate: new Date(
                    new Date().getTime() + 7 * 24 * 60 * 60 * 1000,
                ).toISOString(),
                month: Number(props.month),
                year: Number(props.year),
                totalImages: props.totals.totalImages,
                dateFrom: minDate,
                dateTo: maxDate,
                totalOrders: props.orders.length,
                clientEmail: email,
                items: props.orders.map((order) => ({
                    name: order.orderName,
                    price: order.perImagePrice * order.imageQuantity,
                    quantity: order.imageQuantity,
                })),
                orderIds: props.orders.map((order) => order._id),
            }).unwrap();

            const paymentToken = (
                recordResult.invoice as { paymentToken: string }
            ).paymentToken;

            // Generate blob with the new token
            const blob = await pdf(
                <InvoiceDocument {...props} paymentToken={paymentToken} />,
            ).toBlob();

            const formData = new FormData();
            formData.append("file", blob, fileName);
            formData.append("to", email);
            formData.append("clientName", props.client.name);
            formData.append("month", props.month);
            formData.append("year", props.year);

            const result = await sendInvoiceEmail(formData).unwrap();

            // RTK Query throws on non-200 responses, so reaching here implies success.
            toast.success(
                result.message || "Invoice sent successfully to " + email,
            );
            setIsDialogOpen(false);
        } catch (error) {
            console.error("Error sending email:", error);
            toast.error((error as Error).message || "Failed to send email");
        }
    };

    const handleSendEmail = async () => {
        if ((!props.client.emails || props.client.emails.length === 0) && !props.client.officeAddress) {
            toast.error("Client email not found");
            return;
        }

        if (props.client.emails && props.client.emails.length > 1) {
            setIsDialogOpen(true);
        } else {
            const email = selectedEmail || (props.client.emails && props.client.emails[0]) || "";
            await performEmailSend(email);
        }
    };

    return (
        <div className="flex w-full flex-col gap-4">
            <div className="flex justify-end items-center gap-2">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <Button
                        variant="outline"
                        className="border-primary text-primary hover:bg-accent hover:text-accent-foreground"
                        disabled={isSending}
                        onClick={handleSendEmail}
                    >
                        <Mail className="h-4 w-4 " />
                        {isSending ? "Sending..." : "Send to Client"}
                    </Button>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Select Recipient Email</DialogTitle>
                            <DialogDescription>
                                This client has multiple email addresses. Please select which one to send the invoice to.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex items-center space-x-2 py-4">
                            <Select
                                value={selectedEmail}
                                onValueChange={setSelectedEmail}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select email..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {props.client.emails?.map((email) => (
                                        <SelectItem key={email} value={email}>
                                            {email}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter className="sm:justify-end">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setIsDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="bg-orange-500 hover:bg-orange-600"
                                disabled={isSending}
                                onClick={() => performEmailSend(selectedEmail)}
                            >
                                {isSending ? "Sending..." : "Send Invoice"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                <PDFDownloadLink
                    document={<InvoiceDocument {...props} />}
                    fileName={fileName}
                >
                    {({ loading }) => (
                        <Button
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            disabled={loading || isSending}
                        >
                            <Download className="h-4 w-4 " />
                            {loading ? "Generating PDF..." : "Download PDF"}
                        </Button>
                    )}
                </PDFDownloadLink>
            </div>

            <div className="h-[78vh] min-h-[620px] w-full overflow-hidden rounded-lg border bg-muted/30">
                <PDFViewer width="100%" height="100%" className="border-none">
                    <InvoiceDocument {...props} />
                </PDFViewer>
            </div>
        </div>
    );
}
