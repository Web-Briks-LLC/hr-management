"use client";

import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import CheckoutForm from "./CheckoutForm";
import { Loader2 } from "lucide-react";

// Initialize Stripe outside of a component's render to avoid recreating the Stripe object on every render.
const stripePromise = loadStripe(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
);

export default function PaymentWrapper({
    invoiceNumber,
    clientName,
    amount,
    currency,
}: {
    invoiceNumber: string;
    clientName: string;
    amount: number;
    currency: string;
}) {
    const [clientSecret, setClientSecret] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const formattedTotal = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency || "USD",
    }).format(amount);

    useEffect(() => {
        // Fetch the PaymentIntent client secret from the HR server
        const fetchClientSecret = async () => {
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/payments/create-intent`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            invoiceNumber,
                            clientName,
                            amount,
                            currency,
                        }),
                    },
                );

                const data = await res.json();

                if (res.ok && data.clientSecret) {
                    setClientSecret(data.clientSecret);
                } else {
                    setError(
                        data.error || "Failed to initialize payment session",
                    );
                }
            } catch (err: unknown) {
                console.error("PaymentIntent initialization error:", err);
                setError("Network error connecting to payment gateway.");
            } finally {
                setLoading(false);
            }
        };

        fetchClientSecret();
    }, [invoiceNumber, clientName, amount, currency]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-teal-600/70">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p className="text-sm font-medium">
                    Securing payment session...
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-500/10 text-red-600 text-sm rounded-xl border border-red-500/20 text-center font-medium">
                {error}
            </div>
        );
    }

    return (
        <div className="w-full">
            {clientSecret && (
                <Elements
                    options={{
                        clientSecret,
                        appearance: {
                            theme: "stripe",
                            variables: {
                                colorPrimary: "#0d9488", // teal-600
                                colorBackground: "rgba(255, 255, 255, 0.4)",
                                colorText: "#1f2937", // gray-800
                                colorDanger: "#df1b41",
                                fontFamily:
                                    'Inter, "JetBrains Mono", system-ui, sans-serif',
                                spacingUnit: "4px",
                                borderRadius: "12px",
                            },
                        },
                    }}
                    stripe={stripePromise}
                >
                    <CheckoutForm
                        amount={formattedTotal}
                        invoiceNumber={invoiceNumber}
                    />
                </Elements>
            )}
        </div>
    );
}
