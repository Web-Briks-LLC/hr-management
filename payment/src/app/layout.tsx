import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Image from "next/image";
import "./globals.css";
import { AnimatedBackground } from "@/components/layout/AnimatedBackground";

const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
    variable: "--font-jetbrains-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Payment | Web Briks",
    description: "Secure payment portal for Web Briks invoices",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="light">
            <body
                className={`${inter.variable} ${jetbrainsMono.variable} antialiased min-h-screen flex flex-col`}
            >
                <AnimatedBackground />
                <header className="w-full p-4 md:p-6">
                    <div className="mx-auto flex h-16 max-w-7xl items-center">
                        <Image
                            src="https://res.cloudinary.com/dny7zfbg9/image/upload/v1755954483/mqontecf1xao7znsh6cx.png"
                            alt="Web Briks Logo"
                            width={150}
                            height={32}
                            priority
                        />
                    </div>
                </header>
                <main className="mx-auto max-w-7xl px-4 md:px-8 py-8 md:py-12 w-full flex-1">
                    {children}
                </main>
            </body>
        </html>
    );
}
