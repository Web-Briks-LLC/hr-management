"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, Home, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

function SuccessContent() {
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<"loading" | "success" | "error">(
        "loading",
    );

    // URL params
    const method = searchParams.get("method");
    const orderId = searchParams.get("id"); // PayPal Order ID
    const paymentIntent = searchParams.get("payment_intent"); // Stripe Intent ID
    const redirectStatus = searchParams.get("redirect_status"); // Stripe Status
    const invoiceNumber = searchParams.get("invoice");

    useEffect(() => {
        const verifyAndConfirm = async () => {
            // 1. Client-side verification based on URL params
            const isSuccess =
                redirectStatus === "succeeded" ||
                (method === "paypal" && orderId);

            if (isSuccess) {
                setStatus("success");

                // 2. Synchronize with the backend to mark invoice as PAID
                if (invoiceNumber) {
                    try {
                        console.log("Confirming payment with backend...");
                        const confirmRes = await fetch(
                            "http://localhost:5000/api/payments/confirm",
                            {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    invoiceNumber,
                                    paymentIntentId: paymentIntent,
                                    paypalOrderId:
                                        method === "paypal"
                                            ? orderId
                                            : undefined,
                                }),
                            },
                        );

                        if (!confirmRes.ok) {
                            const errorData = await confirmRes.json();
                            console.error(
                                "Backend confirmation failed:",
                                errorData,
                            );
                        } else {
                            console.log(
                                "Backend record updated to PAID successfully.",
                            );
                        }
                    } catch (err) {
                        console.error(
                            "Error connecting to backend for confirmation:",
                            err,
                        );
                    }
                }
            } else if (redirectStatus === "failed") {
                setStatus("error");
            } else if (redirectStatus === null && method === null) {
                // If someone just visits /success directly without params
                setTimeout(() => setStatus("error"), 1500);
            }
        };

        verifyAndConfirm();
    }, [redirectStatus, method, orderId, invoiceNumber, paymentIntent]);

    if (status === "loading") {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <Loader2 className="w-12 h-12 text-teal-500 animate-spin mb-4" />
                <h2 className="text-xl font-medium text-foreground tracking-tight">
                    Verifying payment...
                </h2>
            </div>
        );
    }

    if (status === "error") {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
                <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
                    <div className="absolute top-[20%] right-[20%] w-[500px] h-[500px] rounded-full bg-red-500/10 blur-[120px]" />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md"
                >
                    <Card className="border-white/10 bg-background/50 backdrop-blur-2xl shadow-2xl rounded-3xl overflow-hidden">
                        <CardHeader className="text-center pb-4 pt-10">
                            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="text-red-500 text-4xl">!</span>
                            </div>
                            <CardTitle className="text-2xl font-bold">
                                Payment Incomplete
                            </CardTitle>
                            <CardDescription className="text-base mt-2">
                                We couldn&apos;t verify your transaction or it
                                was cancelled.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="px-8 pb-10 flex flex-col gap-4">
                            <Button
                                asChild
                                className="w-full h-12 text-md rounded-xl bg-white text-black hover:bg-gray-200"
                            >
                                <Link href="https://webbriks.com">
                                    Return to Home
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden selection:bg-teal-500/30">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-lg z-10"
            >
                <div className="text-center mb-8">
                    <Image
                        src="https://res.cloudinary.com/dny7zfbg9/image/upload/v1755954483/mqontecf1xao7znsh6cx.png"
                        alt="Web Briks"
                        width={150}
                        height={32}
                        className="h-8 w-auto mx-auto opacity-80"
                        priority
                    />
                </div>

                <Card className="border-white/10 bg-background/50 backdrop-blur-2xl shadow-2xl rounded-3xl overflow-hidden">
                    <div className="h-2 w-full bg-linear-to-r from-teal-400 to-green-500" />
                    <CardHeader className="text-center pb-2 pt-10">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{
                                type: "spring",
                                stiffness: 200,
                                delay: 0.2,
                            }}
                            className="bg-teal-500/20 text-teal-400 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6 border border-teal-500/20 shadow-inner"
                        >
                            <CheckCircle2
                                size={48}
                                className="drop-shadow-md"
                            />
                        </motion.div>
                        <Badge
                            variant="outline"
                            className="w-fit mx-auto mb-4 bg-teal-500/10 text-teal-400 border-teal-500/20"
                        >
                            Transaction Successful
                        </Badge>
                        <CardTitle className="text-3xl font-bold tracking-tight text-foreground mb-2">
                            Thank You!
                        </CardTitle>
                        <CardDescription className="text-base text-muted-foreground/80 leading-relaxed px-4">
                            Your payment has been securely processed. A receipt
                            has been sent to your email address.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="px-8 pb-10 pt-6 flex flex-col gap-4">
                        <div className="bg-white/5 rounded-xl border border-white/10 p-4 mb-2 flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                                Reference ID
                            </span>
                            <span className="font-mono text-sm text-teal-400">
                                {paymentIntent || orderId || "WB-PAY-SUCCESS"}
                            </span>
                        </div>

                        <Button
                            asChild
                            className="w-full bg-white hover:bg-gray-200 text-black h-12 text-md font-semibold rounded-xl"
                        >
                            <Link href="https://webbriks.com">
                                <Home className="w-4 h-4 mr-2" />
                                Return to Web Briks
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}

export default function SuccessPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex flex-col items-center justify-center p-4">
                    <Loader2 className="w-12 h-12 text-teal-500 animate-spin mb-4" />
                    <h2 className="text-xl font-medium text-foreground tracking-tight">
                        Loading...
                    </h2>
                </div>
            }
        >
            <SuccessContent />
        </Suspense>
    );
}
