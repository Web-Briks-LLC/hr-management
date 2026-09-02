"use client";

import { usePaymentStore } from "../store/paymentStore";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, Wallet, Lock, CheckCircle2, Loader2 } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import PaymentWrapper from "./PaymentWrapper";
import PayPalWrapper from "./PayPalWrapper";

interface PaymentUIProps {
    invoice: {
        invoiceNumber: string;
        clientName: string;
        clientAddress?: string;
        companyName?: string;
        totalAmount: number;
        currency: string;
        dueDate: string | Date;
        totalOrders?: number;
        totalImages?: number;
        dateFrom?: string | Date;
        dateTo?: string | Date;
        [key: string]: unknown;
    };
}

const trustPoints = [
    "Your invoice is verified before any charge is made.",
    "Payments are processed securely by Stripe & PayPal.",
    "A receipt is emailed to you the moment payment clears.",
];

export default function PaymentUI({ invoice }: PaymentUIProps) {
    const { activeMethod, setMethod, isProcessing } = usePaymentStore();

    const formattedTotal = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: invoice.currency || "USD",
    }).format(invoice.totalAmount);

    const address =
        invoice.clientAddress && invoice.clientAddress !== "N/A"
            ? invoice.clientAddress
            : "—";

    const servicePeriod =
        invoice.dateFrom && invoice.dateTo
            ? `${format(new Date(invoice.dateFrom), "MMM d")} – ${format(
                  new Date(invoice.dateTo),
                  "MMM d, yyyy",
              )}`
            : "—";

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-start gap-10 lg:flex-row lg:gap-14"
        >
            {/* ── LEFT · Invoice summary ─────────────────────────────── */}
            <div className="w-full lg:w-[42%] lg:sticky lg:top-28">
                <span className="text-[12px] font-bold uppercase tracking-wide text-[#9C46F4]">
                    Pay Invoice
                </span>
                <h1 className="mt-2 text-[34px] font-bold leading-[1.1] text-white md:text-[40px]">
                    Settle your{" "}
                    <span className="text-[#9C46F4]">invoice</span>
                </h1>
                <p className="mt-4 text-[14.5px] text-[#9CA3AF]">
                    Invoice{" "}
                    <span className="text-white">#{invoice.invoiceNumber}</span>{" "}
                    for{" "}
                    <span className="text-white">{invoice.clientName}</span>
                </p>

                <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                    <div className="flex items-end gap-2">
                        <span className="text-[34px] font-extrabold leading-none text-white">
                            {formattedTotal}
                        </span>
                        <span className="mb-1 text-[13px] text-[#9CA3AF]">
                            due today
                        </span>
                    </div>

                    <div className="my-5 h-px w-full bg-white/10" />

                    <dl className="flex flex-col gap-3 text-[13px]">
                        <div className="flex items-start justify-between gap-4">
                            <dt className="text-[#9CA3AF]">Billed to</dt>
                            <dd className="max-w-[60%] text-right text-[#D1D5DB]">
                                {invoice.clientName}
                            </dd>
                        </div>
                        <div className="flex items-start justify-between gap-4">
                            <dt className="text-[#9CA3AF]">Address</dt>
                            <dd className="max-w-[60%] text-right text-[#D1D5DB]">
                                {address}
                            </dd>
                        </div>
                        <div className="flex items-start justify-between gap-4">
                            <dt className="text-[#9CA3AF]">Service period</dt>
                            <dd className="text-right text-[#D1D5DB]">
                                {servicePeriod}
                            </dd>
                        </div>
                        <div className="flex items-start justify-between gap-4">
                            <dt className="text-[#9CA3AF]">Due date</dt>
                            <dd className="text-right text-[#D1D5DB]">
                                {format(
                                    new Date(invoice.dueDate),
                                    "MMM d, yyyy",
                                )}
                            </dd>
                        </div>
                    </dl>

                    <div className="my-5 h-px w-full bg-white/10" />

                    <div className="flex items-center justify-between">
                        <span className="text-[14px] font-bold text-white">
                            Total due today
                        </span>
                        <span className="text-[18px] font-extrabold text-white">
                            {formattedTotal}
                        </span>
                    </div>
                </div>

                <div className="mt-8 space-y-3.5">
                    {trustPoints.map((text) => (
                        <div key={text} className="flex items-start gap-3">
                            <CheckCircle2
                                size={18}
                                className="mt-0.5 shrink-0 text-[#9C46F4]"
                            />
                            <p className="text-[13px] leading-[21px] text-[#D1D5DB]">
                                {text}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── RIGHT · Payment card ───────────────────────────────── */}
            <div className="relative w-full rounded-[32px] border border-[#9C46F4] bg-gradient-to-b from-white/[0.04] to-transparent p-7 shadow-[0_20px_50px_0_rgba(0,0,0,0.50)] backdrop-blur-[12px] sm:p-9 lg:w-[58%]">
                <AnimatePresence>
                    {isProcessing && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-50 flex items-center justify-center rounded-[32px] bg-[#02040A]/80 backdrop-blur-[3px]"
                        >
                            <div className="flex flex-col items-center gap-4">
                                <Loader2 className="h-9 w-9 animate-spin text-[#9C46F4]" />
                                <span className="text-[14px] font-medium text-white">
                                    Processing your secure payment…
                                </span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <h2 className="text-[20px] font-bold text-white">
                    Payment details
                </h2>
                <p className="mt-1 text-[13.5px] text-[#9CA3AF]">
                    Choose a method and complete your payment.
                </p>

                <Tabs
                    defaultValue="stripe"
                    value={activeMethod}
                    onValueChange={(v: string) =>
                        setMethod(v as "stripe" | "paypal")
                    }
                    className="mt-6 w-full"
                >
                    <TabsList
                        className="flex w-full flex-col items-stretch gap-3 border-none bg-transparent p-0"
                        style={{ height: "auto" }}
                    >
                        <TabsTrigger
                            value="stripe"
                            style={{ height: "auto" }}
                            className="flex w-full items-center gap-3.5 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3.5 text-left outline-none! transition-all focus:outline-none data-[state=active]:border-[#9C46F4] data-[state=active]:bg-[#9C46F4]/10"
                        >
                            <span
                                className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                                    activeMethod === "stripe"
                                        ? "border-[#9C46F4]"
                                        : "border-white/20"
                                }`}
                            >
                                {activeMethod === "stripe" && (
                                    <span className="h-2 w-2 rounded-full bg-[#9C46F4]" />
                                )}
                            </span>
                            <span className="flex flex-1 items-center justify-between">
                                <span className="flex flex-col">
                                    <span className="text-[13.5px] font-semibold text-white">
                                        Card
                                    </span>
                                    <span className="text-[11px] text-[#9CA3AF]">
                                        Visa, Mastercard, Amex
                                    </span>
                                </span>
                                <CreditCard className="h-[18px] w-[18px] text-[#9CA3AF]" />
                            </span>
                        </TabsTrigger>

                        <TabsTrigger
                            value="paypal"
                            style={{ height: "auto" }}
                            className="flex w-full items-center gap-3.5 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3.5 text-left outline-none! transition-all focus:outline-none data-[state=active]:border-[#9C46F4] data-[state=active]:bg-[#9C46F4]/10"
                        >
                            <span
                                className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                                    activeMethod === "paypal"
                                        ? "border-[#9C46F4]"
                                        : "border-white/20"
                                }`}
                            >
                                {activeMethod === "paypal" && (
                                    <span className="h-2 w-2 rounded-full bg-[#9C46F4]" />
                                )}
                            </span>
                            <span className="flex flex-1 items-center justify-between">
                                <span className="flex flex-col">
                                    <span className="text-[13.5px] font-semibold text-white">
                                        PayPal
                                    </span>
                                    <span className="text-[11px] text-[#9CA3AF]">
                                        Redirect to PayPal to pay
                                    </span>
                                </span>
                                <Wallet className="h-[18px] w-[18px] text-[#9CA3AF]" />
                            </span>
                        </TabsTrigger>
                    </TabsList>

                    <div className="mt-6 border-t border-white/10 pt-6">
                        <TabsContent
                            value="stripe"
                            className="mt-0 outline-none! focus:outline-none"
                        >
                            <div className="animate-in fade-in slide-in-from-top-1 duration-500">
                                <PaymentWrapper
                                    invoiceNumber={invoice.invoiceNumber}
                                    clientName={invoice.clientName}
                                    amount={invoice.totalAmount}
                                    currency={invoice.currency}
                                />
                            </div>
                        </TabsContent>

                        <TabsContent
                            value="paypal"
                            className="mt-0 outline-none! focus:outline-none"
                        >
                            <div className="animate-in fade-in slide-in-from-top-1 duration-500">
                                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
                                    <p className="mb-5 text-center text-[13px] leading-relaxed text-[#9CA3AF]">
                                        You&apos;ll be redirected to PayPal to
                                        securely complete your payment, then
                                        returned here.
                                    </p>
                                    <div className="mx-auto w-full max-w-xs">
                                        <PayPalWrapper
                                            amount={invoice.totalAmount}
                                            currency={invoice.currency}
                                            invoiceNumber={invoice.invoiceNumber}
                                        />
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>

                <div className="mt-7 flex items-center justify-center gap-1.5 text-[12px] text-[#4B5563]">
                    <Lock className="h-3 w-3" />
                    Secure encrypted checkout · Powered by Web Briks
                </div>
            </div>
        </motion.div>
    );
}
