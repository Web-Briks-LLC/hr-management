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
import { changePassword, useSession } from '@/lib/auth-client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Spinner } from '../ui/spinner';

const changePasswordSchema = z.object({
    currentPassword: z.string().nonempty('Current Password is required.'),
    newPassword: z.string().nonempty('New Password is required.'),
});

export default function ChangePassword() {
    const { refetch } = useSession();

    const form = useForm({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
        },
    });

    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);

    const isLoading = form.formState.isSubmitting;

    const onSubmit = async (data: z.infer<typeof changePasswordSchema>) => {
        try {
            await changePassword({
                newPassword: data.newPassword,
                currentPassword: data.currentPassword,
                revokeOtherSessions: true,
            });

            toast.success('Password updated successfully!');
            refetch();
            form.reset();
        } catch (error) {
            toast.error(
                (error as Error).message || 'Failed to update password.'
            );
        }
    };

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Change Password</CardTitle>
                    <CardDescription className="">
                        Enter your current password and choose a new password.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    <div className="grid gap-3">
                        <Label htmlFor="currentPassword">
                            Current Password{' '}
                            <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                            <Input
                                id="currentPassword"
                                type={showCurrent ? 'text' : 'password'}
                                placeholder="Enter your current password"
                                {...form.register('currentPassword')}
                            />
                            <Button
                                type="button"
                                variant="link"
                                onClick={() => setShowCurrent(!showCurrent)}
                                className="absolute right-2 top-1/2 -translate-y-1/2"
                            >
                                {showCurrent ? 'Hide' : 'Show'}
                            </Button>
                        </div>
                        {form.formState.errors.currentPassword && (
                            <span className="text-xs text-destructive">
                                {form.formState.errors.currentPassword.message}
                            </span>
                        )}
                    </div>

                    <div className="grid gap-3">
                        <Label htmlFor="newPassword">
                            New Password{' '}
                            <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                            <Input
                                id="newPassword"
                                type={showNew ? 'text' : 'password'}
                                placeholder="Enter your new password"
                                {...form.register('newPassword')}
                            />
                            <Button
                                type="button"
                                variant="link"
                                onClick={() => setShowNew(!showNew)}
                                className="absolute right-2 top-1/2 -translate-y-1/2"
                            >
                                {showNew ? 'Hide' : 'Show'}
                            </Button>
                        </div>
                        {form.formState.errors.newPassword && (
                            <span className="text-xs text-destructive">
                                {form.formState.errors.newPassword.message}
                            </span>
                        )}
                    </div>
                </CardContent>

                <CardFooter>
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading}
                    >
                        {isLoading ? <Spinner /> : 'Update Password'}
                    </Button>
                </CardFooter>
            </Card>
        </form>
    );
}
