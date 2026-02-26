"use client";

import React from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useRouter } from "next/navigation";
import { usePaymentStore } from "../store/paymentStore";

interface PayPalWrapperProps {
    amount: number;
    currency: string;
    invoiceNumber: string;
}

export default function PayPalWrapper({
    amount,
    currency,
    invoiceNumber,
}: PayPalWrapperProps) {
    const { error, setError, setProcessing } = usePaymentStore();
    const router = useRouter();

    const initialOptions = {
        // Fallback to test ID if env variable is missing
        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "test",
        currency: currency.toUpperCase() || "USD",
        intent: "capture",
        components: "buttons",
        "disable-funding": "paylater",
    };

    return (
        <div className="w-full mt-4 border-t border-white/10">
            {error && (
                <div className="text-red-500 bg-red-500/10 p-3 rounded-md text-sm mb-4 border border-red-500/20 text-center font-medium">
                    {error}
                </div>
            )}

            <PayPalScriptProvider options={initialOptions}>
                <PayPalButtons
                    fundingSource="paypal"
                    style={{ layout: "vertical", shape: "rect", color: "gold" }}
                    createOrder={(data, actions) => {
                        setProcessing(true);
                        return actions.order.create({
                            intent: "CAPTURE",
                            purchase_units: [
                                {
                                    reference_id: invoiceNumber,
                                    amount: {
                                        currency_code:
                                            currency.toUpperCase() || "USD",
                                        value: amount.toFixed(2),
                                    },
                                    description: `Invoice #${invoiceNumber}`,
                                },
                            ],
                        });
                    }}
                    onApprove={async (data, actions) => {
                        try {
                            if (!actions.order) return;
                            const details = await actions.order.capture();
                            // Optional: Send a webhook/API call to your backend here passing details.id to verify the capture server-side
                            // before declaring it successful, but for now we trust the client-side approval for demonstration.

                            // Call the server to confirm payment and update records
                            await fetch(
                                `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/payments/confirm`,
                                {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                        invoiceNumber,
                                        paypalOrderId: details.id,
                                    }),
                                },
                            );

                            router.push(
                                `/success?method=paypal&id=${details.id}&invoice=${invoiceNumber}`,
                            );
                        } catch (err) {
                            setError(
                                "There was an issue capturing your PayPal payment.",
                            );
                            console.error("PayPal Capture Error:", err);
                        }
                    }}
                    onError={(err) => {
                        setError(
                            "PayPal encountered an error. Please try again or use a card.",
                        );
                        console.error("PayPal Script Error:", err);
                    }}
                    onCancel={() => {
                        setProcessing(false);
                        setError(
                            "Payment was cancelled. You have not been charged.",
                        );
                    }}
                />
            </PayPalScriptProvider>
        </div>
    );
}
