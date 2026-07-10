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
import { signUp } from '@/lib/auth-client';
import { useState } from 'react';
import { toast } from 'sonner';

const signupValidationSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),

    email: z.email('Enter a valid email').nonempty('Email is required'),

    phone: z
        .string()
        .min(6, 'Phone number is too short')
        .max(20, 'Phone number is too long'),

    image: z.url('Invalid image URL').optional(),

    password: z
        .string()
        .nonempty('Password is required')
        .min(6, 'Password must be at least 6 characters'),
});

type SignupFormData = z.infer<typeof signupValidationSchema>;

export default function SignupForm() {
    const form = useForm<SignupFormData>({
        resolver: zodResolver(signupValidationSchema),
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            image: '',
            password: '',
        },
        mode: 'onBlur',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const isLoading = form.formState.isSubmitting;

    const onSubmit = async (data: SignupFormData) => {
        try {
            await signUp.email({
                ...data,
                callbackURL: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard`,
                role: '',
                theme: ''
            });

            toast.success(
                'Account created successfully. Please verify your email.'
            );

            form.reset();
            setImagePreview(null);
        } catch (err: any) {
            const message =
                err?.response?.data?.message || err?.message || 'Signup failed';

            toast.error(message);
        } finally {
            setShowPassword(false);
        }
    };

    const handleImageChange = (file?: File) => {
        if (!file) return;

        const url = URL.createObjectURL(file);
        setImagePreview(url);

        setTimeout(() => {
            form.setValue('image', url);
        }, 300);
    };

    return (
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Create Account</CardTitle>
                    <CardDescription className="font-serif">
                        Enter your details to create your account
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    <div className="grid gap-2">
                        <Label htmlFor="name">
                            Full Name{' '}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="name"
                            placeholder="Enter your full name"
                            {...form.register('name')}
                        />
                        {form.formState.errors.name && (
                            <p className="text-sm text-destructive">
                                {form.formState.errors.name.message}
                            </p>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="email">
                            Email Address{' '}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="Enter your email"
                            {...form.register('email')}
                        />
                        {form.formState.errors.email && (
                            <p className="text-sm text-destructive">
                                {form.formState.errors.email.message}
                            </p>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                            id="phone"
                            placeholder="Enter your phone number"
                            {...form.register('phone')}
                        />
                        {form.formState.errors.phone && (
                            <p className="text-sm text-destructive">
                                {form.formState.errors.phone.message}
                            </p>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="image">
                            Profile Image{' '}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="image"
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                                handleImageChange(e.target.files?.[0])
                            }
                        />

                        {imagePreview && (
                            <img
                                src={imagePreview}
                                alt="Preview"
                                className="mt-2 h-24 w-24 rounded-lg object-cover border"
                            />
                        )}

                        {form.formState.errors.image && (
                            <p className="text-sm text-destructive">
                                {form.formState.errors.image.message}
                            </p>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password">
                            Password <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter new password"
                                {...form.register('password')}
                            />
                            <Button
                                type="button"
                                variant="link"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-1 top-1/2 -translate-y-1/2"
                            >
                                {showPassword ? 'Hide' : 'Show'}
                            </Button>
                        </div>
                        {form.formState.errors.password && (
                            <p className="text-sm text-destructive">
                                {form.formState.errors.password.message}
                            </p>
                        )}
                    </div>
                </CardContent>

                <CardFooter>
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading}
                    >
                        {isLoading && <Spinner />}
                        Create Account
                    </Button>
                </CardFooter>
            </Card>
        </form>
    );
}
