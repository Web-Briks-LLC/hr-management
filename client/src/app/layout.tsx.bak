import { Plus_Jakarta_Sans, Lora, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import Main from '@/components/providers/main';

const plusJakarta = Plus_Jakarta_Sans({
    subsets: ['latin'],
    variable: '--font-sans',
    weight: ['400', '500', '600', '700', '800'],
    display: 'swap',
});

const lora = Lora({
    subsets: ['latin'],
    variable: '--font-serif',
    weight: ['400', '500', '600', '700'],
    display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
    subsets: ['latin'],
    variable: '--font-mono',
    weight: ['400', '500', '600', '700'],
    display: 'swap',
});

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body
                className={cn(
                    plusJakarta.variable,
                    lora.variable,
                    ibmPlexMono.variable,
                    'antialiased'
                )}
            >
                <Main>{children}</Main>
            </body>
        </html>
    );
}
