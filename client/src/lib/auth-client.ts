import { createAuthClient } from 'better-auth/react';
import { inferAdditionalFields } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL,
    plugins: [
        inferAdditionalFields({
            user: {
                role: { type: 'string' },
                theme: { type: 'string' },
            },
        }),
    ],
});

export const {
    signIn,
    signOut,
    signUp,
    useSession,
    updateUser,
    changePassword,
    changeEmail,
    sendVerificationEmail,
    getSession,
    resetPassword,
    requestPasswordReset
} = authClient;
