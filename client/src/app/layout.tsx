import { cn } from "@/lib/utils";
import Main from "@/components/providers/main";
import { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const fontSans = Inter({
    subsets: ["latin"],
    variable: "--font-sans",
});

export const metadata: Metadata = {
    title: "HR Management - Web Briks LLC",
    description: "HR Management - Web Briks LLC",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body
                className={cn(
                    "font-sans",
                    "antialiased",
                    fontSans.variable,
                )}
            >
                <Main>{children}</Main>
            </body>
        </html>
    );
}
