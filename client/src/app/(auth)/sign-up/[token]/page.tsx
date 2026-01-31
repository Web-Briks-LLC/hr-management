'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
    useValidateTokenQuery,
    useAcceptInvitationMutation,
} from '@/redux/features/invitation/invitationApi';
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
import { Loader } from 'lucide-react';
import { toast } from 'sonner';

export default function SignupPage() {
    const params = useParams();
    const router = useRouter();
    const token = params.token as string;

    const { data, isLoading, error } = useValidateTokenQuery(token);
    const [acceptInvitation, { isLoading: isAccepting }] =
        useAcceptInvitationMutation();

    const [formData, setFormData] = useState({
        name: '',
        password: '',
        confirmPassword: '',
        phone: '',
        address: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        try {
            await acceptInvitation({
                token,
                data: {
                    name: formData.name,
                    password: formData.password,
                    phone: formData.phone,
                    address: formData.address,
                },
            }).unwrap();

            toast.success('Account created successfully! Please login.');
            router.push('/login');
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to create account');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (error || !data?.success) {
        let errorMessage = 'This invitation link is invalid or has expired.';

        if (error) {
            if (
                'data' in error &&
                typeof error.data === 'object' &&
                error.data &&
                'message' in error.data
            ) {
                errorMessage = (error.data as any).message;
            } else if ('message' in error) {
                errorMessage = error.message as string; // SerializedError
            }
        }

        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-destructive">
                            Invalid Invitation
                        </CardTitle>
                        <CardDescription className="text-destructive font-medium">
                            {errorMessage}
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    const invitation = data.data;

    return (
        <div className="flex items-center justify-center min-h-screen p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Complete Your Registration</CardTitle>
                    <CardDescription>
                        You've been invited to join as {invitation.designation}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-6 p-4 bg-muted rounded-lg">
                        <h3 className="font-semibold mb-2">Position Details</h3>
                        <div className="space-y-1 text-sm">
                            <p>
                                <span className="font-medium">Role:</span>{' '}
                                {invitation.role}
                            </p>
                            <p>
                                <span className="font-medium">Department:</span>{' '}
                                {invitation.department || 'N/A'}
                            </p>
                            <p>
                                <span className="font-medium">
                                    Designation:
                                </span>{' '}
                                {invitation.designation}
                            </p>
                            <p>
                                <span className="font-medium">Salary:</span> ৳
                                {invitation.salary.toLocaleString()}
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="name">Full Name *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        name: e.target.value,
                                    })
                                }
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="phone">Phone Number *</Label>
                            <Input
                                id="phone"
                                value={formData.phone}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        phone: e.target.value,
                                    })
                                }
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="password">Password *</Label>
                            <Input
                                id="password"
                                type="password"
                                value={formData.password}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        password: e.target.value,
                                    })
                                }
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="confirmPassword">
                                Confirm Password *
                            </Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={formData.confirmPassword}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        confirmPassword: e.target.value,
                                    })
                                }
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="address">Address</Label>
                            <Input
                                id="address"
                                value={formData.address}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        address: e.target.value,
                                    })
                                }
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isAccepting}
                        >
                            {isAccepting ? (
                                <>
                                    <Loader className=" h-4 w-4 animate-spin" />
                                    Creating Account...
                                </>
                            ) : (
                                'Create Account'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
