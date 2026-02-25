"use client";

import React, { useState } from "react";
import {
    PaymentElement,
    useStripe,
    useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard } from "lucide-react";

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
            // Stripe.js hasn't yet loaded.
            return;
        }

        setIsLoading(true);

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // Make sure to change this to your payment completion page
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
        <form onSubmit={handleSubmit} className="w-full relative">
            <PaymentElement
                options={{
                    layout: "tabs",
                }}
            />
            {message && (
                <div className="text-red-500 bg-red-500/10 p-3 rounded-md text-sm mt-4 border border-red-500/20 text-center font-medium">
                    {message}
                </div>
            )}
            <Button
                disabled={isLoading || !stripe || !elements}
                id="submit"
                className="w-full bg-teal-600 hover:bg-teal-700 text-white h-14 text-lg font-semibold transition-all shadow-lg rounded-xl flex items-center justify-center gap-3 border border-teal-500/20 mt-6"
            >
                {isLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                    <>
                        <CreditCard className="h-6 w-6 opacity-90" />
                        Pay {amount} securely
                    </>
                )}
            </Button>
        </form>
    );
}
