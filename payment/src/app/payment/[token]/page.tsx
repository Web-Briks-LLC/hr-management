import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, CalendarDays, MapPin, Building2 } from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";
import PaymentWrapper from "@/components/PaymentWrapper";
import PayPalWrapper from "@/components/PayPalWrapper";

export default async function PaymentPage({
    params,
    searchParams,
}: {
    params: Promise<{ token: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;
    const encodedData =
        typeof resolvedSearchParams.data === "string"
            ? resolvedSearchParams.data
            : null;

    let invoice: {
        invoiceNumber: string;
        clientName: string;
        clientId: string;
        clientAddress: string;
        totalAmount: number;
        currency: string;
        dueDate: string;
        items: Array<{ name: string; price: number; quantity: number }>;
    } | null = null;
    if (encodedData) {
        try {
            // Decode the base64url payload
            const standardBase64 = encodedData
                .replace(/-/g, "+")
                .replace(/_/g, "/");
            const jsonString = Buffer.from(standardBase64, "base64").toString(
                "utf-8",
            );
            const parsed = JSON.parse(jsonString);

            // Verify token matches payload
            if (!parsed || parsed.invoiceNumber !== resolvedParams.token) {
                throw new Error("Token mismatch");
            }

            invoice = parsed;
        } catch (error) {
            console.error("Failed to decode invoice data:", error);
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

                        <Separator className="my-5 border-white/10" />

                        <div className="space-y-3">
                            <h4 className="text-sm font-bold tracking-wider uppercase text-muted-foreground/70 mb-4">
                                Line Items
                            </h4>
                            {invoice.items.map(
                                (
                                    item: {
                                        quantity: number;
                                        name: string;
                                        price: number;
                                    },
                                    idx: number,
                                ) => (
                                    <div
                                        key={idx}
                                        className="flex justify-between text-sm py-1"
                                    >
                                        <span className="text-foreground/90 font-medium line-clamp-2 max-w-[70%]">
                                            {item.quantity}x {item.name}
                                        </span>
                                        <span className="font-mono text-muted-foreground">
                                            ${item.price.toFixed(2)}
                                        </span>
                                    </div>
                                ),
                            )}
                        </div>

                        <Separator className="my-5 border-white/10" />

                        <div className="flex justify-between items-end bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/10">
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
                    </div>
                </CardContent>
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
