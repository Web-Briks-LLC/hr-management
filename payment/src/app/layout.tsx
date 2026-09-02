import type { Metadata } from "next";
import { Red_Rose, Inter, JetBrains_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";
import StarOverlay from "@/components/layout/StarOverlay";
import MouseMoving from "@/components/layout/MouseMoving";

const redRose = Red_Rose({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    variable: "--font-red-rose",
});

const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
    variable: "--font-jetbrains-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Payment · Web Briks",
    description: "Secure payment portal for Web Briks invoices",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body
                className={`${redRose.className} ${redRose.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased`}
            >
                <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#02040A] text-white">
                    <StarOverlay />
                    <MouseMoving />
                    <div
                        className="pointer-events-none absolute"
                        style={{
                            width: "600px",
                            height: "400px",
                            right: "-92px",
                            top: "-71px",
                            borderRadius: "9999px",
                            background:
                                "linear-gradient(180deg, rgba(76, 117, 255, 0.06) 0%, rgba(26, 79, 255, 0.06) 100%)",
                            filter: "blur(60px)",
                        }}
                    />

                    <header className="sticky top-0 z-20 w-full border-b border-white/5 bg-[#01050A]/80 backdrop-blur-md">
                        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
                            <Link
                                href="https://webbriks.com"
                                className="flex items-center"
                            >
                                <Image
                                    src="/wb-logo.png"
                                    alt="Web Briks"
                                    width={110}
                                    height={32}
                                    priority
                                />
                            </Link>
                            <Link
                                href="https://webbriks.com"
                                className="text-[13px] text-white/50 transition-colors hover:text-white"
                            >
                                &larr; Back to site
                            </Link>
                        </div>
                    </header>

                    <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
                        {children}
                    </main>

                    <footer className="relative z-10 w-full px-4 pb-8 sm:px-6">
                        <div className="mx-auto max-w-6xl border-t border-white/5 pt-6 text-center">
                            <p className="text-[12px] text-white/40">
                                © {new Date().getFullYear()} Web Briks LLC ·
                                Payments securely processed by Stripe &amp; PayPal
                            </p>
                        </div>
                    </footer>
                </div>
            </body>
        </html>
    );
}
