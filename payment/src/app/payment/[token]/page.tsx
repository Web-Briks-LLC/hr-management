import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    ShieldCheck,
    CalendarDays,
    MapPin,
    Building2,
    Image as ImageIcon,
    FileText,
} from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";
import PaymentWrapper from "@/components/PaymentWrapper";
import PayPalWrapper from "@/components/PayPalWrapper";

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
        redirect("/"); // Return to root if invalid token or decoding fails
    }

    // Format currency helper
    const formattedTotal = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: invoice.currency || "USD",
    }).format(invoice.totalAmount);

    return (
        <div className="grid md:grid-cols-2 gap-8 items-start animate-in fade-in zoom-in duration-700 max-w-5xl mx-auto">
            {/* Invoice Summary Glass Card */}
            <Card className="shadow-2xl border-white/20 bg-background/40 backdrop-blur-2xl supports-backdrop-filter:bg-background/20 rounded-3xl overflow-hidden">
                <CardHeader className="bg-white/10 border-b border-white/10 pb-5">
                    <div className="flex justify-between items-start mb-3">
                        <div className="bg-teal-500/20 text-teal-700 dark:text-teal-400 p-2.5 flex items-center justify-center rounded-xl backdrop-blur-md">
                            <Building2 size={24} />
                        </div>
                        <Badge
                            variant="outline"
                            className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 backdrop-blur-md font-mono text-xs py-1"
                        >
                            INVOICE #{invoice.invoiceNumber}
                        </Badge>
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">
                        Invoice Summary
                    </CardTitle>
                    <CardDescription className="text-muted-foreground/80 flex items-center gap-2 mt-1">
                        Billed to{" "}
                        <span className="font-medium text-foreground">
                            {invoice.clientName}
                        </span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 relative">
                    <div className="space-y-5 relative z-10">
                        <div className="flex items-start gap-3">
                            <MapPin
                                className="text-muted-foreground/60 shrink-0 mt-0.5"
                                size={18}
                            />
                            <span className="text-sm text-foreground/80 leading-relaxed font-medium">
                                {invoice.clientAddress}
                                {invoice.companyName &&
                                    invoice.companyName !== "N/A" && (
                                        <span className="block text-muted-foreground/70 text-xs mt-1">
                                            Company: {invoice.companyName}
                                        </span>
                                    )}
                            </span>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                            <span className="flex items-center gap-2 text-muted-foreground/80 font-medium">
                                <CalendarDays size={18} /> Service Period
                            </span>
                            <span className="font-semibold text-foreground text-right">
                                {invoice.dateFrom && invoice.dateTo ? (
                                    <>
                                        {new Date(
                                            invoice.dateFrom,
                                        ).toLocaleDateString()}{" "}
                                        - <br />
                                        {new Date(
                                            invoice.dateTo,
                                        ).toLocaleDateString()}
                                    </>
                                ) : (
                                    "N/A"
                                )}
                            </span>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                            <span className="flex items-center gap-2 text-muted-foreground/80 font-medium">
                                <ImageIcon size={18} /> Total Images
                            </span>
                            <span className="font-semibold text-foreground">
                                {invoice.totalImages || "N/A"}
                            </span>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                            <span className="flex items-center gap-2 text-muted-foreground/80 font-medium">
                                <FileText size={18} /> Total Orders
                            </span>
                            <span className="font-semibold text-foreground">
                                {invoice.totalOrders || "N/A"}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="flex items-center gap-2 text-muted-foreground/80 font-medium">
                                <CalendarDays size={18} /> Due Date
                            </span>
                            <span className="font-semibold text-foreground bg-white/20 px-3 py-1 rounded-md backdrop-blur-md">
                                {new Date(invoice.dueDate).toLocaleDateString(
                                    undefined,
                                    {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                    },
                                )}
                            </span>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <div className="w-full flex justify-between items-end bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/10">
                        <div>
                            <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/80 block mb-1">
                                Total Due
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {invoice.currency}
                            </span>
                        </div>
                        <span className="text-4xl font-black text-teal-600 dark:text-teal-400 tracking-tighter">
                            {formattedTotal}
                        </span>
                    </div>
                </CardFooter>
            </Card>

            {/* Payment Action Glass Card */}
            <div className="flex flex-col gap-6">
                <Card className="shadow-2xl border-white/20 bg-background/50 backdrop-blur-3xl supports-backdrop-filter:bg-background/20 rounded-3xl overflow-hidden">
                    <CardHeader className="text-center pt-8 pb-4">
                        <div className="flex justify-center mb-5">
                            <div className="bg-linear-to-br from-green-400/20 to-teal-500/20 p-4 rounded-2xl text-teal-600 dark:text-teal-400 backdrop-blur-xl border border-teal-500/20 shadow-inner">
                                <ShieldCheck size={36} />
                            </div>
                        </div>
                        <CardTitle className="text-3xl font-bold tracking-tight pb-2">
                            Secure Payment
                        </CardTitle>
                        <CardDescription className="text-muted-foreground/80 text-sm max-w-[90%] mx-auto leading-relaxed">
                            Complete your transaction securely. We support major
                            credit cards and digital wallets.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 px-6 sm:px-10 pb-8">
                        <PaymentWrapper
                            invoiceNumber={invoice.invoiceNumber}
                            clientName={invoice.clientName}
                            amount={invoice.totalAmount}
                            currency={invoice.currency}
                        />

                        <div className="relative pt-4 pb-4">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-white/10" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase font-bold tracking-widest text-muted-foreground/60">
                                <span className="bg-background/40 backdrop-blur-sm px-3 rounded-full">
                                    Or
                                </span>
                            </div>
                        </div>

                        <PayPalWrapper
                            amount={invoice.totalAmount}
                            currency={invoice.currency}
                            invoiceNumber={invoice.invoiceNumber}
                        />
                    </CardContent>
                </Card>

                <p className="text-[11px] text-center text-muted-foreground/60 mt-2 px-8 leading-relaxed font-medium animate-in slide-in-from-bottom flex flex-col gap-1 items-center">
                    <span>Payments are securely processed and encrypted.</span>
                    <span className="flex items-center gap-1">
                        By paying, you agree to our
                        <Link
                            href="https://webbriks.com/terms-and-conditions"
                            target="_blank"
                            className="underline hover:text-teal-500 transition-colors"
                        >
                            Terms & Conditions
                        </Link>
                        and
                        <Link
                            href="https://webbriks.com/privacy-policy"
                            target="_blank"
                            className="underline hover:text-teal-500 transition-colors"
                        >
                            Privacy Policy
                        </Link>
                        .
                    </span>
                </p>
            </div>
        </div>
    );
}
