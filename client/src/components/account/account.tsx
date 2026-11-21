"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/lib/auth-client";
import { useGetMeQuery } from "@/redux/features/staff/staffApi";
import {
    differenceInCalendarDays,
    format,
    formatDistanceStrict,
} from "date-fns";
import {
    BadgeCheckIcon,
    BanknoteIcon,
    BriefcaseIcon,
    CalendarCheckIcon,
    CalendarDaysIcon,
    ClockIcon,
    CreditCardIcon,
    FactoryIcon,
    HashIcon,
    HeartPulseIcon,
    LockIcon,
    MailIcon,
    PhoneIcon,
    SquarePenIcon,
    UserCheckIcon,
    UserIcon,
    UsersIcon,
    WalletIcon,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import { StatTile } from "@/components/production/stat-tile";
import { StaffAttendanceTab } from "@/app/(root)/staffs/[id]/_components/attendance-tab";
import { StaffLeaveTab } from "@/app/(root)/staffs/[id]/_components/staff-leave-tab";
import { StaffOvertimeTab } from "@/app/(root)/staffs/[id]/_components/overtime-tab";
import { PaymentHistoryTab } from "@/app/(root)/staffs/[id]/_components/payment-history-tab";
import { StaffProductionTab } from "@/app/(root)/staffs/[id]/_components/production-tab";
import ChangePassword from "./change-password";
import EditProfile from "./edit-profile";
import { ProfileCompletionDialog } from "./profile-completion-dialog";
import { ProfileImageUploadDialog } from "./profile-image-upload-dialog";
import { SessionsCard } from "./sessions-card";

type Icon = ComponentType<{ className?: string }>;

const fmtDate = (d?: Date | string | null) =>
    d ? format(new Date(d), "PPP") : null;

/** One label + value pair. Empty values show a soft "Not added". */
function Field({
    label,
    value,
    mono,
}: {
    label: string;
    value?: ReactNode;
    mono?: boolean;
}) {
    return (
        <div className="min-w-0 space-y-0.5">
            <dt className="text-xs font-medium text-muted-foreground">
                {label}
            </dt>
            <dd
                className={`break-words text-sm font-medium ${mono ? "font-mono" : ""}`}
            >
                {value || (
                    <span className="font-normal text-muted-foreground">
                        Not added
                    </span>
                )}
            </dd>
        </div>
    );
}

function InfoCard({
    title,
    description,
    icon: Icon,
    children,
    className = "",
}: {
    title: string;
    description: string;
    icon: Icon;
    children: ReactNode;
    className?: string;
}) {
    return (
        <Card className={`border-border/60 shadow-md ${className}`}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="size-5 text-primary" />
                    {title}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                    {children}
                </dl>
            </CardContent>
        </Card>
    );
}

function WorkCard({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <Card className="border-border/60 shadow-md">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">{children}</CardContent>
        </Card>
    );
}

const statusStyle: Record<string, string> = {
    active: "bg-green-500/10 text-green-600 border-green-500/30",
    inactive: "bg-orange-500/10 text-orange-600 border-orange-500/30",
    terminated: "bg-red-500/10 text-red-600 border-red-500/30",
};

// Old links used ?edit-profile and ?change-password; keep them working.
function useActiveTab() {
    const params = useSearchParams();
    if (params.has("edit-profile")) return "edit";
    if (params.has("change-password")) return "security";
    return params.get("tab") || "overview";
}

export default function RootAccount() {
    const { data, isPending } = useSession();
    const { data: staffData, isLoading: isStaffLoading } = useGetMeQuery(
        {},
        { skip: !data?.user?.id },
    );

    const pathname = usePathname();
    const router = useRouter();
    const tab = useActiveTab();

    const isLoading = isPending || isStaffLoading;
    const user = data?.user;
    const staff = staffData?.staff;
    const hasStaff = !!staff?._id;

    const designation = staff?.designation?.toLowerCase() ?? "";
    const isProductionStaff =
        staff?.department?.toLowerCase()?.includes("production") ||
        designation.includes("editor") ||
        designation.includes("designer") ||
        designation.includes("retoucher") ||
        designation.includes("artist") ||
        !designation.includes("telemarketer");

    const initials =
        (user?.name ?? "")
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((p: string) => p[0]?.toUpperCase())
            .join("") || "?";

    const setTab = (value: string) =>
        router.replace(
            value === "overview" ? pathname : `${pathname}?tab=${value}`,
            { scroll: false },
        );

    const tenure = staff?.joinDate
        ? differenceInCalendarDays(new Date(), new Date(staff.joinDate)) < 31
            ? `${Math.max(
                  differenceInCalendarDays(new Date(), new Date(staff.joinDate)),
                  0,
              )} days`
            : formatDistanceStrict(new Date(staff.joinDate), new Date(), {
                  unit:
                      differenceInCalendarDays(
                          new Date(),
                          new Date(staff.joinDate),
                      ) >= 365
                          ? "year"
                          : "month",
              })
        : "—";

    const triggerCls = "flex-none gap-1.5 px-3";

    return (
        <div className="space-y-6">
            <ProfileCompletionDialog />

            {/* Header */}
            <Card className="gap-0 overflow-hidden border-border/60 py-0 shadow-md">
                <div className="h-20 bg-linear-to-r from-primary/20 via-primary/10 to-transparent sm:h-24" />
                <CardContent className="-mt-12 flex flex-col items-center gap-4 pb-5 text-center sm:-mt-14 sm:flex-row sm:items-end sm:text-left">
                    <div className="relative shrink-0">
                        <Avatar className="size-24 border-4 border-card shadow-md sm:size-28">
                            <AvatarImage
                                src={user?.image || ""}
                                alt={`${user?.name || "User"}'s profile`}
                            />
                            <AvatarFallback className="bg-primary/10 text-2xl font-semibold text-primary">
                                {isLoading ? <Skeleton /> : initials}
                            </AvatarFallback>
                        </Avatar>
                        <ProfileImageUploadDialog />
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                        {isLoading ? (
                            <>
                                <Skeleton className="mx-auto h-7 w-48 sm:mx-0" />
                                <Skeleton className="mx-auto h-4 w-64 sm:mx-0" />
                            </>
                        ) : (
                            <>
                                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                                    <h1 className="text-2xl font-bold tracking-tight">
                                        {user?.name}
                                    </h1>
                                    {user?.emailVerified && (
                                        <Badge
                                            variant="outline"
                                            className="gap-1 border-primary/30 bg-primary/10 text-primary"
                                        >
                                            <BadgeCheckIcon className="size-3.5" />
                                            Email verified
                                        </Badge>
                                    )}
                                    {staff?.status && (
                                        <Badge
                                            variant="outline"
                                            className={`capitalize ${statusStyle[staff.status] ?? ""}`}
                                        >
                                            {staff.status}
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-sm capitalize text-muted-foreground">
                                    {[staff?.designation, staff?.department]
                                        .filter(Boolean)
                                        .join(" · ") || user?.role}
                                </p>
                                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground sm:justify-start">
                                    <span className="flex items-center gap-1.5 break-all">
                                        <MailIcon className="size-4 shrink-0" />
                                        {user?.email}
                                    </span>
                                    {staff?.phone && (
                                        <span className="flex items-center gap-1.5">
                                            <PhoneIcon className="size-4 shrink-0" />
                                            {staff.phone}
                                        </span>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Quick numbers */}
            <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4">
                <StatTile
                    label="Status"
                    value={<span className="capitalize">{staff?.status ?? "—"}</span>}
                    hint="Your current employment status"
                    icon={UserCheckIcon}
                    tone="green"
                    isLoading={isLoading}
                />
                <StatTile
                    label="Staff ID"
                    value={<span className="text-2xl">{staff?.staffId ?? "—"}</span>}
                    hint="Use this ID for HR requests"
                    icon={HashIcon}
                    tone="blue"
                    isLoading={isLoading}
                />
                <StatTile
                    label="Time with us"
                    value={<span className="text-2xl">{tenure}</span>}
                    hint={
                        staff?.joinDate
                            ? `Joined ${format(new Date(staff.joinDate), "PP")}`
                            : "Join date not set"
                    }
                    icon={CalendarDaysIcon}
                    tone="purple"
                    isLoading={isLoading}
                />
                <StatTile
                    label="Profile"
                    value={
                        <span className="text-2xl">
                            {staff?.profileCompleted ? "Complete" : "Incomplete"}
                        </span>
                    }
                    hint={
                        staff?.profileCompleted
                            ? "All required details are added"
                            : "Fill in the Edit Profile tab"
                    }
                    icon={UserIcon}
                    tone={staff?.profileCompleted ? "slate" : "orange"}
                    isLoading={isLoading}
                />
            </div>

            <Tabs value={tab} onValueChange={setTab} className="w-full gap-4">
                <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                    <TabsList className="h-auto w-max min-w-full justify-start sm:min-w-0">
                        <TabsTrigger value="overview" className={triggerCls}>
                            <UserIcon /> Overview
                        </TabsTrigger>
                        <TabsTrigger value="edit" className={triggerCls}>
                            <SquarePenIcon /> Edit Profile
                        </TabsTrigger>
                        <TabsTrigger value="security" className={triggerCls}>
                            <LockIcon /> Security
                        </TabsTrigger>
                        {hasStaff && isProductionStaff && (
                            <TabsTrigger value="production" className={triggerCls}>
                                <FactoryIcon /> Production
                            </TabsTrigger>
                        )}
                        {hasStaff && (
                            <>
                                <TabsTrigger value="attendance" className={triggerCls}>
                                    <CalendarCheckIcon /> Attendance
                                </TabsTrigger>
                                <TabsTrigger value="leave" className={triggerCls}>
                                    <BriefcaseIcon /> Leaves
                                </TabsTrigger>
                                <TabsTrigger value="overtime" className={triggerCls}>
                                    <ClockIcon /> Overtime
                                </TabsTrigger>
                                <TabsTrigger value="payments" className={triggerCls}>
                                    <WalletIcon /> Payments
                                </TabsTrigger>
                            </>
                        )}
                    </TabsList>
                </div>

                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <InfoCard
                            title="Personal details"
                            description="Basic information about you"
                            icon={UserIcon}
                        >
                            <Field label="Full name" value={user?.name} />
                            <Field label="Date of birth" value={fmtDate(staff?.dateOfBirth)} />
                            <Field label="Blood group" value={staff?.bloodGroup} />
                            <Field label="National ID" value={staff?.nationalId} mono />
                            <Field label="Father's name" value={staff?.fathersName} />
                            <Field label="Mother's name" value={staff?.mothersName} />
                            <Field label="Spouse's name" value={staff?.spouseName} />
                        </InfoCard>

                        <InfoCard
                            title="Contact"
                            description="How we can reach you"
                            icon={PhoneIcon}
                        >
                            <Field label="Email" value={user?.email} />
                            <Field label="Phone" value={staff?.phone} />
                            <div className="sm:col-span-2">
                                <Field label="Address" value={staff?.address} />
                            </div>
                        </InfoCard>

                        <InfoCard
                            title="Emergency contact"
                            description="Who to call if something happens"
                            icon={HeartPulseIcon}
                        >
                            <Field label="Name" value={staff?.emergencyContact?.name} />
                            <Field label="Relation" value={staff?.emergencyContact?.relation} />
                            <Field label="Phone" value={staff?.emergencyContact?.phone} />
                        </InfoCard>

                        <InfoCard
                            title="Job details"
                            description="Your role at the company"
                            icon={BriefcaseIcon}
                        >
                            <Field label="Designation" value={<span className="capitalize">{staff?.designation}</span>} />
                            <Field label="Department" value={<span className="capitalize">{staff?.department}</span>} />
                            <Field label="Branch" value={staff?.branch?.name} />
                            <Field label="Join date" value={fmtDate(staff?.joinDate)} />
                            {staff?.exitDate && (
                                <Field label="Exit date" value={fmtDate(staff.exitDate)} />
                            )}
                            {staff?.pendingStatus && (
                                <Field
                                    label="Upcoming change"
                                    value={<span className="capitalize">Will become {staff.pendingStatus}</span>}
                                />
                            )}
                            {staff?.salaryVisibleToEmployee && (
                                <Field
                                    label="Monthly salary"
                                    value={`৳ ${Number(staff.salary ?? 0).toLocaleString()}`}
                                />
                            )}
                        </InfoCard>

                        <InfoCard
                            title="Bank details"
                            description="Where your salary is paid"
                            icon={BanknoteIcon}
                        >
                            <Field label="Bank name" value={staff?.bank?.bankName} />
                            <Field label="Branch" value={staff?.bank?.branch} />
                            <Field label="Account holder" value={staff?.bank?.accountHolderName} />
                            <Field label="Account number" value={staff?.bank?.accountNumber} mono />
                            <Field label="Routing number" value={staff?.bank?.routingNumber} mono />
                        </InfoCard>

                        <InfoCard
                            title="Account"
                            description="Your login and record details"
                            icon={UsersIcon}
                        >
                            <Field label="Role" value={<span className="capitalize">{user?.role}</span>} />
                            <Field
                                label="Email status"
                                value={user?.emailVerified ? "Verified" : "Not verified"}
                            />
                            <Field
                                label="Salary PIN"
                                value={staff?.isSalaryPinSet ? "Set" : "Not set"}
                            />
                            <Field label="Account created" value={fmtDate(user?.createdAt)} />
                            <Field label="Profile last updated" value={fmtDate(staff?.updatedAt)} />
                        </InfoCard>
                    </div>
                </TabsContent>

                <TabsContent value="edit">
                    <EditProfile />
                </TabsContent>

                <TabsContent value="security" className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        <ChangePassword />
                        <SessionsCard />
                    </div>
                </TabsContent>

                {hasStaff && isProductionStaff && (
                    <TabsContent value="production">
                        <WorkCard
                            title="Production & work history"
                            description="Your edited images, work sessions and QC status"
                        >
                            <StaffProductionTab staffId={staff._id} />
                        </WorkCard>
                    </TabsContent>
                )}

                {hasStaff && (
                    <>
                        <TabsContent value="attendance">
                            <WorkCard
                                title="Attendance"
                                description="Your recent attendance history"
                            >
                                <StaffAttendanceTab staffId={staff._id} />
                            </WorkCard>
                        </TabsContent>
                        <TabsContent value="leave">
                            <WorkCard
                                title="Leave applications"
                                description="Your leave history and status"
                            >
                                <StaffLeaveTab staffId={staff._id} />
                            </WorkCard>
                        </TabsContent>
                        <TabsContent value="overtime">
                            <WorkCard
                                title="Overtime"
                                description="Extra hours you have worked"
                            >
                                <StaffOvertimeTab staffId={staff._id} />
                            </WorkCard>
                        </TabsContent>
                        <TabsContent value="payments">
                            <WorkCard
                                title="Payment history"
                                description="Your salary and overtime payments"
                            >
                                <PaymentHistoryTab
                                    staffId={staff._id}
                                    isPinSet={staff.isSalaryPinSet || false}
                                />
                            </WorkCard>
                        </TabsContent>
                    </>
                )}
            </Tabs>
        </div>
    );
}
