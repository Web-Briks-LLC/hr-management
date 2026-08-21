'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from './theme-provider';
import { Toaster } from '@/components/ui/sonner';
import ReduxProvider from './ReduxProvider';
import { useSession } from '@/lib/auth-client';
import AuthGuard from './AuthGuard';
import { SocketProvider } from '@/contexts/SocketContext';
import { GlobalPolicyPrompt } from '@/components/policy/GlobalPolicyPrompt';

export default function Main({ children }: { children: ReactNode }) {
    const { data } = useSession();

    const theme = data?.user?.theme || 'system';

    return (
        <ReduxProvider>
            <AuthGuard>
                <ThemeProvider
                    attribute="class"
                    defaultTheme={theme}
                    enableSystem
                    disableTransitionOnChange
                >
                    <SocketProvider>
                        {children}
                        <GlobalPolicyPrompt />
                    </SocketProvider>
                    <Toaster richColors closeButton position="bottom-right" />
                </ThemeProvider>
            </AuthGuard>
        </ReduxProvider>
    );
}
