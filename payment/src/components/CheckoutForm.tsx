"use client";

import React, { useState } from "react";
import {
    PaymentElement,
    useStripe,
    useElements,
} from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";
import { BRAND_GRADIENT } from "@/lib/brand";

export default function CheckoutForm({
    amount,
    invoiceNumber,
}: {
    amount: string;
    invoiceNumber: string;
}) {
    const stripe = useStripe();
    const elements = useElements();

    const [message, setMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setIsLoading(true);

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/success?invoice=${invoiceNumber}`,
            },
        });

        if (error.type === "card_error" || error.type === "validation_error") {
            setMessage(error.message ?? "An unexpected error occurred.");
        } else {
            setMessage("An unexpected error occurred.");
        }

        setIsLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="w-full">
            <PaymentElement options={{ layout: "tabs" }} />

            {message && (
                <p className="mt-4 text-[12.5px] text-red-400">{message}</p>
            )}

            <button
                type="submit"
                disabled={isLoading || !stripe || !elements}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[15px] font-bold tracking-[0.4px] text-white shadow-[0_0_20px_0_rgba(26,79,255,0.30)] transition-all disabled:cursor-not-allowed disabled:opacity-60"
                style={{ background: BRAND_GRADIENT }}
            >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Pay {amount}
            </button>

            <p className="mt-3 text-center text-[12px] text-[#4B5563]">
                Payments are securely processed by Stripe.
            </p>
        </form>
    );
}
