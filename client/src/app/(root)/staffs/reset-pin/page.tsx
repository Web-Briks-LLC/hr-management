'use client';

import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useResetSalaryPinMutation } from '@/redux/features/staff/staffApi';
import { Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { toast } from 'sonner';

function ResetPinContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');

    const [resetSalaryPin, { isLoading }] = useResetSalaryPinMutation();

    useEffect(() => {
        if (!token) {
            toast.error('Invalid or missing reset token');
            router.push('/');
        }
    }, [token, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (pin.length < 4) {
            return toast.error('PIN must be at least 4 digits');
        }

        if (pin !== confirmPin) {
            return toast.error('PINs do not match');
        }

        if (!token) return;

        try {
            await resetSalaryPin({ token, pin }).unwrap();
            toast.success('PIN reset successfully. Please log in again.');
            router.push('/'); // Or dashboard? Probably dashboard if session is active?
            // If they are resetting PIN, they might be logged in or out.
            // If logged in, dashboard. If not, login.
            // Let's assume dashboard.
        } catch (error: any) {
            toast.error(error.data?.message || 'Failed to reset PIN');
        }
    };

    if (!token) return null;

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Reset Salary PIN</CardTitle>
                    <CardDescription>
                        Enter a new 4-digit PIN for your salary account.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="pin">New PIN</Label>
                            <Input
                                id="pin"
                                type="password"
                                placeholder="Enter new PIN"
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                disabled={isLoading}
                                required
                                minLength={4}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPin">Confirm New PIN</Label>
                            <Input
                                id="confirmPin"
                                type="password"
                                placeholder="Confirm new PIN"
                                value={confirmPin}
                                onChange={(e) => setConfirmPin(e.target.value)}
                                disabled={isLoading}
                                required
                                minLength={4}
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isLoading}
                        >
                            {isLoading && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Reset PIN
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}

export default function ResetPinPage() {
    return (
        <Suspense
            fallback={
                <div className="flex h-screen items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            }
        >
            <ResetPinContent />
        </Suspense>
    );
}
