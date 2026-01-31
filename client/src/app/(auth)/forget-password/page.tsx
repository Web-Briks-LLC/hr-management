'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Loader, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { requestPasswordReset } from '@/lib/auth-client';
import Link from 'next/link';

export default function ForgetPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await requestPasswordReset({
                email,
                redirectTo: `${process.env
                    .NEXT_PUBLIC_FRONTEND_URL!}/reset-password`,
            });
            setIsSuccess(true);
            toast.success('Reset link sent to your email!');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to send reset link');
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Check Your Email</CardTitle>
                        <CardDescription>
                            We sent a password reset link to{' '}
                            <span className="font-medium text-foreground">
                                {email}
                            </span>
                            . Please check your inbox (and spam folder) to
                            proceed.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Link href="/sign-in">
                            <Button variant="outline" className="w-full">
                                Back to Sign In
                            </Button>
                        </Link>
                        <Button
                            variant="link"
                            className="w-full"
                            onClick={() => setIsSuccess(false)}
                        >
                            Try another email
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <Link
                            href="/sign-in"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                        <CardTitle>Forgot Password?</CardTitle>
                    </div>
                    <CardDescription>
                        Enter your email address and we'll send you a link to
                        reset your password.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader className=" h-4 w-4 animate-spin" />
                                    Sending Link...
                                </>
                            ) : (
                                'Send Reset Link'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
