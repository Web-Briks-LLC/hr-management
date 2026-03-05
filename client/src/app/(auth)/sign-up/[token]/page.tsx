"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
    useValidateTokenQuery,
    useAcceptInvitationMutation,
} from "@/redux/features/invitation/invitationApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Loader, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const signupSchema = z
    .object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        phone: z.string().min(10, "Invalid phone number"),
        password: z.string().min(6, "Password must be at least 6 characters"),
        confirmPassword: z.string(),
        address: z.string().optional(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
    });

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
    const params = useParams();
    const router = useRouter();
    const token = params.token as string;

    const { data, isLoading, error } = useValidateTokenQuery(token);
    const [acceptInvitation, { isLoading: isAccepting }] =
        useAcceptInvitationMutation();

    const [showPassword, setShowPassword] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SignupFormValues>({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            name: "",
            phone: "",
            password: "",
            confirmPassword: "",
            address: "",
        },
    });

    const onSubmit = async (formData: SignupFormValues) => {
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

            toast.success(
                "Account created successfully! Please verify your email before logging in.",
            );
            router.push("/login");
        } catch (err: unknown) {
            const errorData = err as { data?: { message?: string } };
            toast.error(errorData?.data?.message || "Failed to create account");
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
        let errorMessage = "This invitation link is invalid or has expired.";

        if (error) {
            if (
                "data" in error &&
                typeof error.data === "object" &&
                error.data &&
                "message" in error.data
            ) {
                errorMessage = (error.data as { message: string }).message;
            } else if ("message" in error) {
                errorMessage = error.message as string;
            }
        }

        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-destructive">
                            Invalid Invitation
                        </CardTitle>
                        <CardDescription className="text-destructive font-medium">
                            {errorMessage}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => router.push("/login")}
                        >
                            Back to Login
                        </Button>
                    </CardContent>
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
                        You&apos;ve been invited to join as{" "}
                        {invitation.designation}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-6 p-4 bg-muted rounded-lg">
                        <h3 className="font-semibold mb-2">Position Details</h3>
                        <div className="space-y-1 text-sm">
                            <p>
                                <span className="font-medium">Role:</span>{" "}
                                {invitation.role}
                            </p>
                            <p>
                                <span className="font-medium">Department:</span>{" "}
                                {invitation.department || "N/A"}
                            </p>
                            <p>
                                <span className="font-medium">
                                    Designation:
                                </span>{" "}
                                {invitation.designation}
                            </p>
                            <p>
                                <span className="font-medium">Salary:</span> ৳
                                {invitation.salary.toLocaleString()}
                            </p>
                        </div>
                    </div>

                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="space-y-4"
                    >
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name *</Label>
                            <Input
                                id="name"
                                {...register("name")}
                                placeholder="Enter your full name"
                            />
                            {errors.name && (
                                <p className="text-xs text-destructive">
                                    {errors.name.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number *</Label>
                            <Input
                                id="phone"
                                {...register("phone")}
                                placeholder="Enter your phone number"
                            />
                            {errors.phone && (
                                <p className="text-xs text-destructive">
                                    {errors.phone.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password *</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    {...register("password")}
                                    placeholder="Enter password"
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword(!showPassword)
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-xs text-destructive">
                                    {errors.password.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">
                                Confirm Password *
                            </Label>
                            <Input
                                id="confirmPassword"
                                type={showPassword ? "text" : "password"}
                                {...register("confirmPassword")}
                                placeholder="Confirm your password"
                            />
                            {errors.confirmPassword && (
                                <p className="text-xs text-destructive">
                                    {errors.confirmPassword.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="address">Address</Label>
                            <Input
                                id="address"
                                {...register("address")}
                                placeholder="Enter your address (optional)"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isAccepting}
                        >
                            {isAccepting ? (
                                <>
                                    <Loader className=" h-4 w-4 animate-spin mr-2" />
                                    Creating Account...
                                </>
                            ) : (
                                "Create Account"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
