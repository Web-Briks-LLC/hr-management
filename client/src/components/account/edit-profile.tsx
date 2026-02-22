"use client";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changeEmail, updateUser, useSession } from "@/lib/auth-client";
import { toast } from "sonner";
import { useEffect } from "react";
import {
    useGetMeQuery,
    useCompleteProfileMutation,
    useUpdateProfileMutation,
} from "@/redux/features/staff/staffApi";
import { ProfileFormValues, profileSchema } from "@/validators/profile.schema";
import { BANGLADESH_BANKS } from "@/constants/banks";
import { DatePicker } from "../shared/DatePicker";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import { cn } from "@/lib/utils";

export default function EditProfile() {
    const { data: session, isPending, isRefetching } = useSession();
    const {
        data,
        isLoading: isStaffLoading,
        isFetching: isStaffFetching,
    } = useGetMeQuery(
        {},
        {
            skip: !session?.user.id,
        },
    );
    const [completeProfile] = useCompleteProfileMutation();
    const [updateProfile] = useUpdateProfileMutation();

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: "",
            email: "",
            phone: "",
            nationalId: "",
            bloodGroup: "",
            address: "",
            emergencyContact: {
                name: "",
                relation: "",
                phone: "",
            },
            fathersName: "",
            mothersName: "",
            spouseName: "",
            bank: {
                bankName: "",
                accountNumber: "",
                accountHolderName: "",
                branch: "",
                routingNumber: "",
            },
            dateOfBirth: undefined,
            joinDate: undefined,
        },
    });

    useEffect(() => {
        form.setValue("name", session?.user.name as string);
        form.setValue("email", session?.user.email as string);

        // Check if staff exists and profile is completed
        if (!data?.staff?.profileCompleted) return;

        form.setValue("phone", data.staff.phone || "");

        // Convert date strings to Date objects
        if (data.staff.dateOfBirth) {
            form.setValue("dateOfBirth", new Date(data.staff.dateOfBirth));
        }

        form.setValue("bloodGroup", data.staff.bloodGroup || "");
        form.setValue("nationalId", data.staff.nationalId || "");
        form.setValue("address", data.staff.address || "");

        // Handle emergency contact - check if it exists and has values
        if (data.staff.emergencyContact) {
            form.setValue(
                "emergencyContact.name",
                data.staff.emergencyContact.name || "",
            );
            form.setValue(
                "emergencyContact.phone",
                data.staff.emergencyContact.phone || "",
            );
            form.setValue(
                "emergencyContact.relation",
                data.staff.emergencyContact.relation || "",
            );
        }

        form.setValue("fathersName", data.staff.fathersName || "");
        form.setValue("mothersName", data.staff.mothersName || "");
        form.setValue("spouseName", data.staff.spouseName || "");
        if (data.staff.bank) {
            form.setValue("bank.bankName", data.staff.bank.bankName || "");
            form.setValue(
                "bank.accountNumber",
                data.staff.bank.accountNumber || "",
            );
            form.setValue(
                "bank.accountHolderName",
                data.staff.bank.accountHolderName || "",
            );
            form.setValue("bank.branch", data.staff.bank.branch || "");
            form.setValue(
                "bank.routingNumber",
                data.staff.bank.routingNumber || "",
            );
        }

        // Convert joinDate string to Date object
        if (data.staff.joinDate) {
            form.setValue("joinDate", new Date(data.staff.joinDate));
        }
    }, [session, form, isPending, isRefetching, data]);

    const isLoading =
        form.formState.isSubmitting ||
        isPending ||
        isRefetching ||
        isStaffLoading ||
        isStaffFetching;

    const onSubmit = async (values: ProfileFormValues) => {
        const currentName = session?.user?.name;
        const currentEmail = session?.user?.email;

        const nameChanged = values.name !== currentName;
        const emailChanged = values.email !== currentEmail;

        try {
            if (nameChanged) {
                await updateUser({
                    name: values.name,
                });
            }

            if (emailChanged) {
                await changeEmail({
                    newEmail: values.email,
                    callbackURL: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/account?edit-profile=true`,
                });
            }

            const staffPayload = {
                phone: values.phone,
                dateOfBirth:
                    values.dateOfBirth instanceof Date
                        ? values.dateOfBirth.toISOString()
                        : new Date(values.dateOfBirth).toISOString(),
                nationalId: values.nationalId,
                bloodGroup: values.bloodGroup,
                address: values.address,

                emergencyContact: {
                    name: values.emergencyContact.name,
                    relation: values.emergencyContact.relation,
                    phone: values.emergencyContact.phone,
                },

                fathersName: values.fathersName,
                mothersName: values.mothersName,
                spouseName: values.spouseName || undefined,

                bank: {
                    bankName: values.bank?.bankName || "",
                    accountNumber: values.bank?.accountNumber || "",
                    accountHolderName: values.bank?.accountHolderName || "",
                    branch: values.bank?.branch,
                    routingNumber: values.bank?.routingNumber,
                },

                joinDate:
                    values.joinDate instanceof Date
                        ? values.joinDate.toISOString()
                        : new Date(values.joinDate).toISOString(),
            };

            // Use updateProfile if profile is completed, otherwise completeProfile
            // completeProfile will create a new staff record if needed
            const isProfileCompleted = data?.staff?.profileCompleted;

            try {
                if (isProfileCompleted) {
                    await updateProfile(staffPayload).unwrap();
                } else {
                    await completeProfile(staffPayload).unwrap();
                }
            } catch (apiError: unknown) {
                const errorMessage =
                    (apiError as { data?: { message?: string } })?.data
                        ?.message ||
                    (apiError as Error)?.message ||
                    "Failed to update profile";
                throw new Error(errorMessage);
            }

            if (nameChanged && emailChanged) {
                toast.success(
                    "Profile updated. Please verify your new email address.",
                );
            } else if (nameChanged) {
                toast.success("Your name has been updated successfully.");
            } else if (emailChanged) {
                toast.success(
                    "Email change requested. Please verify the link sent to your new email.",
                );
            } else {
                toast.success("Profile updated successfully.");
            }

            form.reset(values);
        } catch (error) {
            console.log(error);
            toast.error((error as Error)?.message || "Something went wrong!");
        }
    };

    return (
        <Card className="col-span-2">
            <CardHeader>
                <CardTitle>Edit Profile</CardTitle>
                <CardDescription>
                    Update your profile information below.
                </CardDescription>
            </CardHeader>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <CardContent>
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Name *</Label>
                                <Input {...form.register("name")} />
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.name?.message}
                                </p>
                            </div>

                            <div className="grid gap-2">
                                <Label>Email *</Label>
                                <Input {...form.register("email")} />
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.email?.message}
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-4 grid-cols-2">
                            <div className="grid gap-2">
                                <Label>Phone *</Label>
                                <Input
                                    {...form.register("phone")}
                                    placeholder="Enter phone number"
                                />
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.phone?.message}
                                </p>
                            </div>

                            <div>
                                <DatePicker
                                    label="Date of Birth *"
                                    value={form.watch("dateOfBirth")}
                                    onChange={(date) => {
                                        if (date) {
                                            form.setValue("dateOfBirth", date);
                                        }
                                    }}
                                    placeholder="Pick date of birth"
                                    maxDate={new Date()}
                                />
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.dateOfBirth?.message}
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-4 grid-cols-2">
                            <div className="grid gap-2">
                                <Label>National ID *</Label>
                                <Input {...form.register("nationalId")} />
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.nationalId?.message}
                                </p>
                            </div>

                            <div className="grid gap-2">
                                <Label>Blood Group *</Label>
                                <Select
                                    value={form.watch("bloodGroup")}
                                    onValueChange={(v) =>
                                        form.setValue("bloodGroup", v)
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select blood group" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[
                                            "A+",
                                            "A-",
                                            "B+",
                                            "B-",
                                            "AB+",
                                            "AB-",
                                            "O+",
                                            "O-",
                                        ].map((bg) => (
                                            <SelectItem key={bg} value={bg}>
                                                {bg}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.bloodGroup?.message}
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Emergency Contact Person</Label>
                            <div className="grid grid-cols-3 gap-4">
                                <Input
                                    placeholder="Name"
                                    {...form.register("emergencyContact.name")}
                                />

                                <Select
                                    value={form.watch(
                                        "emergencyContact.relation",
                                    )}
                                    onValueChange={(v) =>
                                        form.setValue(
                                            "emergencyContact.relation",
                                            v,
                                        )
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Relation" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[
                                            "Father",
                                            "Mother",
                                            "Brother",
                                            "Sister",
                                            "Spouse",
                                            "Friend",
                                            "Uncle",
                                            "Auntie",
                                            "Grandfather",
                                            "Grandmother",
                                        ].map((r) => (
                                            <SelectItem key={r} value={r}>
                                                {r}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Input
                                    placeholder="Phone"
                                    {...form.register("emergencyContact.phone")}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Input
                                    placeholder="Father's Name"
                                    {...form.register("fathersName")}
                                />
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.fathersName?.message}
                                </p>
                            </div>

                            <div>
                                <Input
                                    placeholder="Mother's Name"
                                    {...form.register("mothersName")}
                                />
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.mothersName?.message}
                                </p>
                            </div>
                        </div>

                        <Input
                            placeholder="Spouse Name (Optional)"
                            {...form.register("spouseName")}
                        />

                        {/* Bank Account Section */}
                        <div className="pt-4">
                            <Label className="text-base font-semibold">
                                Bank Account Information *
                            </Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                <div className="grid gap-2">
                                    <Label>Bank Name *</Label>
                                    <Select
                                        value={form.watch("bank.bankName")}
                                        onValueChange={(v) =>
                                            form.setValue("bank.bankName", v)
                                        }
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select bank" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {BANGLADESH_BANKS.map((b) => (
                                                <SelectItem key={b} value={b}>
                                                    {b}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-sm text-destructive">
                                        {
                                            form.formState.errors.bank?.bankName
                                                ?.message
                                        }
                                    </p>
                                </div>

                                <div className="grid gap-2">
                                    <Label>Account Number *</Label>
                                    <Input
                                        placeholder="Your account number"
                                        {...form.register("bank.accountNumber")}
                                    />
                                    <p className="text-sm text-destructive">
                                        {
                                            form.formState.errors.bank
                                                ?.accountNumber?.message
                                        }
                                    </p>
                                </div>

                                <div className="grid gap-2 md:col-span-2">
                                    <Label>Account Holder Name *</Label>
                                    <Input
                                        placeholder="Name on account"
                                        {...form.register(
                                            "bank.accountHolderName",
                                        )}
                                    />
                                    <p className="text-sm text-destructive">
                                        {
                                            form.formState.errors.bank
                                                ?.accountHolderName?.message
                                        }
                                    </p>
                                </div>

                                <div className="grid gap-2">
                                    <Label>Branch</Label>
                                    <Input
                                        placeholder="Branch Name"
                                        {...form.register("bank.branch")}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label>Routing Number</Label>
                                    <Input
                                        placeholder="Routing Number"
                                        {...form.register("bank.routingNumber")}
                                    />
                                </div>
                            </div>
                        </div>

                        <DatePicker
                            label="Join Date *"
                            value={form.watch("joinDate")}
                            onChange={(date) => {
                                if (date) {
                                    form.setValue("joinDate", date);
                                }
                            }}
                            placeholder="Pick join date"
                        />
                        <p className="text-sm text-destructive">
                            {form.formState.errors.joinDate?.message}
                        </p>
                    </div>

                    <div className="grid gap-2">
                        <Label>Address *</Label>
                        <Input {...form.register("address")} />
                        <p className="text-sm text-destructive">
                            {form.formState.errors.address?.message}
                        </p>
                    </div>
                </CardContent>

                <CardFooter>
                    <Button className={cn("w-full")} disabled={isLoading}>
                        {isLoading ? (
                            <Loader className="animate-spin" />
                        ) : (
                            "Update Profile"
                        )}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
