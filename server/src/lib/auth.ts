import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { client } from './db.js';
import emailService from '../services/email.service.js';
import envConfig from '../config/env.config.js';
import { Role } from '../constants/role.js';

const { db_name, better_auth_secret, trusted_origins } = envConfig;
const mongoClient = await client();
const db = mongoClient.db(db_name);

export const auth = betterAuth({
    secret: better_auth_secret,
    database: mongodbAdapter(db, {
        client: mongoClient,
    }),
    user: {
        additionalFields: {
            role: {
                type: 'string',
                required: false,
                defaultValue: Role.STAFF,
            },
            theme: {
                type: 'string',
                required: false,
                defaultValue: 'system',
            },
        },
        changeEmail: {
            enabled: true,
        },
    },
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        async sendResetPassword(data) {
            try {
                await emailService.sendResetPasswordEmail({
                    to: data.user.email,
                    userName: data.user.name || 'User',
                    resetPasswordUrl: data.url,
                });
            } catch (error) {
                console.error(
                    `[Auth] Failed to send reset password email to ${data.user.email}:`,
                    error,
                );
            }
        },
    },
    emailVerification: {
        sendOnSignUp: false,
        async sendVerificationEmail({ url, user }) {
            try {
                await emailService.sendVerificationEmail({
                    to: user.email,
                    userName: user.name || 'User',
                    verificationUrl: url,
                });
            } catch (error) {
                console.error(
                    `[Auth] Failed to send verification email to ${user.email}:`,
                    error,
                );
            }
        },
    },
    trustedOrigins: trusted_origins.split(','),
});
