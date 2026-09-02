"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";
import { BRAND_GRADIENT } from "@/lib/brand";

export default function Home() {
    const [countdown, setCountdown] = useState(4);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    window.location.href = "https://webbriks.com";
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center"
        >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-red-400/20 bg-red-400/10 text-red-400">
                <ShieldAlert className="h-8 w-8" />
            </div>

            <h1 className="text-[24px] font-bold text-white">
                Invalid payment link
            </h1>
            <p className="max-w-[340px] text-[14px] leading-relaxed text-[#9CA3AF]">
                This page can only be opened from a valid Web Briks invoice link.
                Please use the &ldquo;Pay Invoice&rdquo; button in your invoice
                email.
            </p>

            <p className="mt-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-[13px] text-[#9CA3AF]">
                Redirecting to webbriks.com in{" "}
                <span className="font-semibold text-[#9C46F4]">
                    {countdown}s
                </span>
            </p>

            <a
                href="https://webbriks.com"
                className="mt-3 rounded-xl px-6 py-3 text-[14px] font-bold text-white shadow-[0_0_20px_0_rgba(26,79,255,0.30)]"
                style={{ background: BRAND_GRADIENT }}
            >
                Go to Web Briks
            </a>
        </motion.div>
    );
}
