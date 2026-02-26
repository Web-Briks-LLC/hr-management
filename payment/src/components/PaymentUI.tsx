"use client";

import { usePaymentStore } from "../store/paymentStore";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, Wallet, Lock } from "lucide-react";

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

export default function PaymentUI({ invoice }: PaymentUIProps) {
    const { activeMethod, setMethod, isProcessing } = usePaymentStore();

    const formattedTotal = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: invoice.currency || "USD",
    }).format(invoice.totalAmount);

    return (
        <div className="w-full max-w-5xl mx-auto min-h-[650px] bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 flex flex-col md:flex-row overflow-hidden mb-12">
            {/* Left Column: Summary */}
            <div className="md:w-[45%] bg-[#FBFBFB] p-8 md:p-12 md:py-16 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <div className="text-gray-500 font-medium text-sm mb-3">
                        Pay Invoice
                    </div>
                    <div className="text-5xl font-semibold tracking-tight text-gray-900 mb-3">
                        {formattedTotal}
                    </div>
                    <div className="text-sm text-gray-500 mb-12">
                        Invoice #{invoice.invoiceNumber}
                    </div>

                    <div className="space-y-5 text-sm">
                        <div className="flex justify-between items-center py-3 border-b border-gray-100/80">
                            <span className="text-gray-500 font-medium">
                                Billed to
                            </span>
                            <span className="text-gray-900 text-right max-w-[150px] truncate">
                                {invoice.clientName}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-gray-100/80">
                            <span className="text-gray-500 font-medium">
                                Address
                            </span>
                            <span className="text-gray-900 text-right max-w-[150px] truncate">
                                {invoice.clientAddress &&
                                invoice.clientAddress !== "N/A"
                                    ? invoice.clientAddress
                                    : "N/A"}
                            </span>
                        </div>

                        <div className="flex justify-between items-center py-3 border-b border-gray-100/80">
                            <span className="text-gray-500 font-medium">
                                Service Period
                            </span>
                            <span className="text-gray-900">
                                {invoice.dateFrom && invoice.dateTo
                                    ? `${format(new Date(invoice.dateFrom), "MMM dd")} - ${format(new Date(invoice.dateTo), "MMM dd, yyyy")}`
                                    : "N/A"}
                            </span>
                        </div>

                        <div className="flex justify-between items-center py-3 border-b border-gray-100/80">
                            <span className="text-gray-500 font-medium">
                                Due Date
                            </span>
                            <span className="text-gray-900">
                                {format(
                                    new Date(invoice.dueDate),
                                    "MMM dd, yyyy",
                                )}
                            </span>
                        </div>

                        <div className="flex justify-between items-center py-5 mt-4">
                            <span className="text-gray-900 font-semibold text-base">
                                Total due today
                            </span>
                            <span className="text-gray-900 font-semibold text-lg">
                                {formattedTotal}
                            </span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Right Column: Payment */}
            <div className="md:w-[55%] p-8 md:p-12 md:py-16 bg-white relative">
                {/* Processing Overlay */}
                <AnimatePresence>
                    {isProcessing && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-50 bg-white/70 backdrop-blur-[2px] flex items-center justify-center md:rounded-r-3xl"
                        >
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-teal-600 animate-spin" />
                                <span className="text-sm font-medium text-gray-700">
                                    Processing your secure payment...
                                </span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                >
                    {/* Payment Method */}
                    <div>
                        <h3 className="text-base font-semibold text-gray-900 mb-4">
                            Payment method
                        </h3>

                        <Tabs
                            defaultValue="stripe"
                            value={activeMethod}
                            onValueChange={(v: string) =>
                                setMethod(v as "stripe" | "paypal")
                            }
                            className="w-full"
                        >
                            <TabsList
                                className="flex flex-col items-stretch justify-start w-full gap-3 bg-transparent p-0 mb-8 border-none outline-none! focus:outline-none"
                                style={{ height: "auto" }}
                            >
                                <TabsTrigger
                                    value="stripe"
                                    className="w-full flex items-center justify-start gap-4 p-4 border rounded-xl bg-white shadow-xs focus:ring-0 outline-none! focus:outline-none transition-all data-[state=active]:border-teal-600 data-[state=active]:bg-teal-50/20 data-[state=active]:ring-1 data-[state=active]:ring-teal-600"
                                    style={{ height: "auto" }}
                                >
                                    {/* Custom Radio Button */}
                                    <div
                                        className={`w-4 h-4 rounded-full border flex shrink-0 items-center justify-center transition-colors ${activeMethod === "stripe" ? "border-teal-600" : "border-gray-300"}`}
                                    >
                                        {activeMethod === "stripe" && (
                                            <div className="w-2 h-2 rounded-full bg-teal-600" />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 font-medium text-gray-900">
                                        <CreditCard
                                            size={18}
                                            className="text-gray-500"
                                        />
                                        Card
                                    </div>
                                </TabsTrigger>

                                <TabsTrigger
                                    value="paypal"
                                    className="w-full flex items-center justify-start gap-4 p-4 border rounded-xl bg-white shadow-xs focus:ring-0 outline-none! focus:outline-none transition-all data-[state=active]:border-[#003087] data-[state=active]:bg-[#003087]/5 data-[state=active]:ring-1 data-[state=active]:ring-[#003087]"
                                    style={{ height: "auto" }}
                                >
                                    {/* Custom Radio Button */}
                                    <div
                                        className={`w-4 h-4 rounded-full border flex shrink-0 items-center justify-center transition-colors ${activeMethod === "paypal" ? "border-[#003087]" : "border-gray-300"}`}
                                    >
                                        {activeMethod === "paypal" && (
                                            <div className="w-2 h-2 rounded-full bg-[#003087]" />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 font-medium text-gray-900">
                                        <Wallet
                                            size={18}
                                            className="text-gray-500"
                                        />
                                        PayPal
                                    </div>
                                </TabsTrigger>
                            </TabsList>

                            <div className="w-full border-t border-gray-100 pt-6 mt-2">
                                <TabsContent
                                    value="stripe"
                                    className="mt-0 outline-none! focus:outline-none"
                                >
                                    <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                                        <PaymentWrapper
                                            invoiceNumber={
                                                invoice.invoiceNumber
                                            }
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
                                    <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                                        <div className="flex flex-col items-center justify-center py-6 bg-[#FAFAFA] rounded-xl border border-gray-100 mb-2">
                                            <p className="text-sm text-gray-500 mb-6 px-6 text-center">
                                                You will be redirected to PayPal
                                                to securely complete your
                                                payment.
                                            </p>
                                            <div className="w-full max-w-xs px-4">
                                                <PayPalWrapper
                                                    amount={invoice.totalAmount}
                                                    currency={invoice.currency}
                                                    invoiceNumber={
                                                        invoice.invoiceNumber
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                            </div>
                        </Tabs>

                        <div className="mt-8 flex flex-col items-center gap-2 text-center text-[12px] text-gray-400">
                            <span className="flex items-center gap-1.5 font-medium text-gray-500">
                                <Lock size={12} />
                                Secure encrypted checkout
                            </span>
                            <span>Powered by Web Briks</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
