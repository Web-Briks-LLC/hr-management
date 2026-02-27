"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth-client";
import {
    LockIcon,
    SettingsIcon,
    SquarePenIcon,
    UserIcon,
    VerifiedIcon,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ChangePassword from "./change-password";
import EditProfile from "./edit-profile";
import { ProfileImageUploadDialog } from "./profile-image-upload-dialog";
import { ProfileCompletionDialog } from "./profile-completion-dialog";
import { useGetMeQuery } from "@/redux/features/staff/staffApi";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StaffAttendanceTab } from "@/app/(root)/staffs/[id]/_components/attendance-tab";
import { StaffLeaveTab } from "@/app/(root)/staffs/[id]/_components/staff-leave-tab";
import { StaffOvertimeTab } from "@/app/(root)/staffs/[id]/_components/overtime-tab";
import { PaymentHistoryTab } from "@/app/(root)/staffs/[id]/_components/payment-history-tab";

export default function RootAccount() {
    const { data, isPending, isRefetching } = useSession();

    const {
        data: staffData,
        isLoading: isStaffLoading,
        isFetching: isStaffFetching,
    } = useGetMeQuery({}, { skip: !data?.user?.id });

    const isLoading =
        isPending || isRefetching || isStaffLoading || isStaffFetching;

    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    const showChangePassword = searchParams.has("change-password");
    const editProfile = searchParams.has("edit-profile");
    const showDefault = !showChangePassword && !editProfile;

    const staff = staffData?.staff;

    return (
        <>
            <ProfileCompletionDialog />
            <section className="grid grid-cols-3 gap-6 items-start">
                <Card className="col-span-1 overflow-hidden">
                    <CardHeader className="grid items-center">
                        <div className="relative group/profile-image">
                            <Avatar className="mx-auto size-52 ring-2 ring-primary ring-offset-1">
                                <AvatarImage
                                    src={data?.user?.image || ""}
                                    alt={`${data?.user?.name || "User"}'s profile`}
                                />
                                <AvatarFallback>
                                    {isLoading ? (
                                        <Skeleton />
                                    ) : (
                                        <UserIcon size={20} />
                                    )}
                                </AvatarFallback>
                            </Avatar>

                            <ProfileImageUploadDialog />
                        </div>

                        <div className="w-full text-center space-y-2 mt-2">
                            {isLoading ? (
                                <Skeleton className="h-[24px]" />
                            ) : (
                                <div className="flex items-center gap-2 justify-center">
                                    <h3 className="text-2xl">
                                        {data?.user?.name}
                                    </h3>
                                    {data?.user?.emailVerified && (
                                        <VerifiedIcon
                                            className="text-primary"
                                            size={24}
                                        />
                                    )}
                                </div>
                            )}

                            {isLoading ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-[14px]" />
                                    <Skeleton className="h-[14px]" />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-sm capitalize">
                                        <b>Designation:</b>{" "}
                                        {staff?.designation || "N/A"}
                                    </p>
                                    <p className="text-sm capitalize">
                                        <b>Department:</b>{" "}
                                        {staff?.department || "N/A"}
                                    </p>
                                </div>
                            )}
                        </div>
                    </CardHeader>

                    <CardContent>
                        <div className="p-3 bg-primary/20 rounded-lg grid items-start">
                            <Button
                                variant="link"
                                className="mr-auto"
                                onClick={() => router.push(`${pathname}`)}
                            >
                                <UserIcon />
                                Profile Information
                            </Button>

                            <Separator className="bg-primary" />
                            <Button
                                variant="link"
                                className="mr-auto"
                                onClick={() =>
                                    router.push(`${pathname}?edit-profile=true`)
                                }
                            >
                                <SquarePenIcon />
                                Edit Profile
                            </Button>

                            <Separator className="bg-primary" />

                            <Button variant="link" className="mr-auto">
                                <SettingsIcon />
                                Account Setting
                            </Button>

                            <Separator className="bg-primary" />

                            <Button
                                variant="link"
                                className="mr-auto"
                                onClick={() =>
                                    router.push(
                                        `${pathname}?change-password=true`,
                                    )
                                }
                            >
                                <LockIcon />
                                Change Password
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {showDefault && staff?._id && (
                    <div className="col-span-2 space-y-6">
                        <Tabs defaultValue="overview" className="w-full">
                            <TabsList className="flex flex-wrap h-auto w-full sm:w-auto justify-start gap-1 p-1">
                                <TabsTrigger value="overview">
                                    Overview
                                </TabsTrigger>
                                <TabsTrigger value="attendance">
                                    Attendance
                                </TabsTrigger>
                                <TabsTrigger value="leave">Leaves</TabsTrigger>
                                <TabsTrigger value="overtime">
                                    Overtime
                                </TabsTrigger>
                                <TabsTrigger value="payments">
                                    Payments
                                </TabsTrigger>
                            </TabsList>

                            <div className="mt-6">
                                <TabsContent value="overview">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>
                                                Profile Information
                                            </CardTitle>
                                            <CardDescription>
                                                Your personal and official staff
                                                details
                                            </CardDescription>
                                        </CardHeader>

                                        <CardContent>
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <p>
                                                    <b>Name:</b>{" "}
                                                    {data?.user?.name}
                                                </p>
                                                <p>
                                                    <b>Email:</b>{" "}
                                                    {data?.user?.email}
                                                </p>
                                                <p>
                                                    <b>Phone:</b> {staff?.phone}
                                                </p>
                                                <p>
                                                    <b>Staff ID:</b>{" "}
                                                    {staff?.staffId}
                                                </p>
                                                <p>
                                                    <b>National ID:</b>{" "}
                                                    {staff?.nationalId}
                                                </p>
                                                <p>
                                                    <b>Blood Group:</b>{" "}
                                                    {staff?.bloodGroup}
                                                </p>
                                                <p>
                                                    <b>Address:</b>{" "}
                                                    {staff?.address}
                                                </p>

                                                <p>
                                                    <b>Emergency Name:</b>{" "}
                                                    {
                                                        staff?.emergencyContact
                                                            ?.name
                                                    }
                                                </p>
                                                <p>
                                                    <b>Relation:</b>{" "}
                                                    {
                                                        staff?.emergencyContact
                                                            ?.relation
                                                    }
                                                </p>
                                                <p>
                                                    <b>Phone:</b>{" "}
                                                    {
                                                        staff?.emergencyContact
                                                            ?.phone
                                                    }
                                                </p>

                                                <p>
                                                    <b>Father:</b>{" "}
                                                    {staff?.fathersName}
                                                </p>
                                                <p>
                                                    <b>Mother:</b>{" "}
                                                    {staff?.mothersName}
                                                </p>
                                                <p>
                                                    <b>Spouse:</b>{" "}
                                                    {staff?.spouseName || "N/A"}
                                                </p>

                                                <div>
                                                    <p className="text-sm text-gray-500">
                                                        Account Number
                                                    </p>
                                                    <p className="font-medium">
                                                        {staff?.bank
                                                            ?.accountNumber ||
                                                            "N/A"}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-500">
                                                        Account Name
                                                    </p>
                                                    <p className="font-medium">
                                                        {staff?.bank
                                                            ?.accountHolderName ||
                                                            "N/A"}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-500">
                                                        Bank Name
                                                    </p>
                                                    <p className="font-medium">
                                                        {staff?.bank
                                                            ?.bankName || "N/A"}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-500">
                                                        Branch Name
                                                    </p>
                                                    <p className="font-medium">
                                                        {staff?.bank?.branch ||
                                                            "N/A"}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-500">
                                                        Routing Number
                                                    </p>
                                                    <p className="font-medium">
                                                        {staff?.bank
                                                            ?.routingNumber ||
                                                            "N/A"}
                                                    </p>
                                                </div>

                                                <p>
                                                    <b>Branch:</b>{" "}
                                                    {staff?.branch?.name ||
                                                        "N/A"}
                                                </p>
                                                <p>
                                                    <b>Status:</b>{" "}
                                                    {staff?.status}
                                                </p>

                                                <p>
                                                    <b>Join Date:</b>{" "}
                                                    {staff?.joinDate &&
                                                        format(
                                                            new Date(
                                                                staff.joinDate,
                                                            ),
                                                            "PPP",
                                                        )}
                                                </p>

                                                <p>
                                                    <b>Date of Birth:</b>{" "}
                                                    {staff?.dateOfBirth &&
                                                        format(
                                                            new Date(
                                                                staff.dateOfBirth,
                                                            ),
                                                            "PPP",
                                                        )}
                                                </p>

                                                <p>
                                                    <b>Last Updated:</b>{" "}
                                                    {staff?.updatedAt &&
                                                        format(
                                                            new Date(
                                                                staff.updatedAt,
                                                            ),
                                                            "PPP",
                                                        )}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="attendance">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>
                                                Attendance Record
                                            </CardTitle>
                                            <CardDescription>
                                                Recent attendance history
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <StaffAttendanceTab
                                                staffId={staff._id}
                                            />
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="leave">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>
                                                Leave Applications
                                            </CardTitle>
                                            <CardDescription>
                                                Leave history and status
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <StaffLeaveTab
                                                staffId={staff._id}
                                            />
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="overtime">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>
                                                Overtime Records
                                            </CardTitle>
                                            <CardDescription>
                                                Extra hours worked
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <StaffOvertimeTab
                                                staffId={staff._id}
                                            />
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="payments">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>
                                                Payment History
                                            </CardTitle>
                                            <CardDescription>
                                                Salary and overtime payments
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <PaymentHistoryTab
                                                staffId={staff._id}
                                                isPinSet={
                                                    staff.isSalaryPinSet ||
                                                    false
                                                }
                                            />
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </div>
                        </Tabs>
                    </div>
                )}

                {showChangePassword && <ChangePassword />}
                {editProfile && <EditProfile />}
            </section>
        </>
    );
}
