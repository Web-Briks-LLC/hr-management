'use client';

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../ui/button';
import { Spinner } from '../ui/spinner';
import { sendVerificationEmail, signIn } from '@/lib/auth-client';
import { useState } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';

const signinValidationSchema = z.object({
    email: z
        .string()
        .email('Enter a valid email')
        .nonempty('Email is required'),
    password: z
        .string()
        .nonempty('Password is required')
        .min(6, 'Password must be 6 characters long'),
});

export default function SigninForm() {
    const form = useForm<z.infer<typeof signinValidationSchema>>({
        resolver: zodResolver(signinValidationSchema),
        defaultValues: {
            email: '',
            password: '',
        },
        mode: 'onBlur',
    });

    const [showPassword, setShowPassword] = useState(false);
    const isLoading = form.formState.isSubmitting;

    const handleShowPassword = () => {
        setShowPassword(!showPassword);
    };

    const onSubmit = async (data: z.infer<typeof signinValidationSchema>) => {
        try {
            const res = await signIn.email({
                email: data.email,
                password: data.password,
                callbackURL: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard`,
            });

            if (res.error) {
                if (res.error.code === 'EMAIL_NOT_VERIFIED') {
                    toast.error('Please verify your email before signing in.', {
                        action: {
                            label: 'Resend',
                            onClick: () => handleResendVerification(data.email),
                        },
                    });
                } else {
                    toast.error(res.error.message || 'Failed to sign in.');
                }
                return;
            }

            if (res.data) {
                toast.success('Signed in successfully.');
                form.reset();
            }
        } catch (error) {
            toast.error((error as Error).message || 'Something went wrong.');
        } finally {
            setShowPassword(false);
        }
    };

    const handleResendVerification = async (email: string) => {
        try {
            const res = await sendVerificationEmail({
                email,
                callbackURL: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/sign-in`,
            });

            if (res.error) {
                toast.error(res.error.message || 'Failed to send link');
            }

            toast.success('Check your email for the verification link');
        } catch (error) {
            toast.error((error as Error).message || 'Something went wrong');
        }
    };

    return (
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Sign In</CardTitle>
                    <CardDescription className="font-serif">
                        Enter your credentials to access your account
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-3">
                        <Label htmlFor="email">
                            Email <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="Enter your email"
                            {...form.register('email')}
                            disabled={isLoading}
                        />
                        {form.formState.errors.email && (
                            <span className="text-sm text-destructive font-serif">
                                {form.formState.errors.email.message}
                            </span>
                        )}
                    </div>
                    <div className="grid gap-3">
                        <div className="flex items-center gap-6 justify-between text-sm text-muted-foreground">
                            <Label htmlFor="password">
                                Password{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Link
                                href="/forget-password"
                                className="text-primary hover:underline"
                            >
                                Forgot your password?
                            </Link>
                        </div>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter your password"
                                {...form.register('password')}
                                disabled={isLoading}
                            />
                            <Button
                                type="button"
                                variant="link"
                                onClick={handleShowPassword}
                                className="font-serif absolute right-1 top-1/2 -translate-y-1/2 px-3"
                                disabled={isLoading}
                            >
                                {showPassword ? 'Hide' : 'Show'}
                            </Button>
                        </div>
                        {form.formState.errors.password && (
                            <span className="text-sm text-destructive font-serif">
                                {form.formState.errors.password.message}
                            </span>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading}
                    >
                        {isLoading && <Spinner className="" />}
                        Sign In
                    </Button>
                </CardFooter>
            </Card>
        </form>
    );
}
