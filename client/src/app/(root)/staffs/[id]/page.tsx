"use client";

import { useParams, useRouter } from "next/navigation";
import { useGetStaffByIdQuery } from "@/redux/features/staff/staffApi";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    ArrowLeft,
    Mail,
    Phone,
    Briefcase,
    Clock,
    AlertCircle,
    Banknote,
    Calendar,
    CalendarDays,
    CreditCard,
    Droplet,
    Fingerprint,
    MapPin,
    ShieldAlert,
    UserCircle,
    Building2,
} from "lucide-react";
import { format } from "date-fns";
import { StaffAttendanceTab } from "@/app/(root)/staffs/[id]/_components/attendance-tab";
import { StaffLeaveTab } from "@/app/(root)/staffs/[id]/_components/staff-leave-tab";
import { StaffOvertimeTab } from "@/app/(root)/staffs/[id]/_components/overtime-tab";
import { PaymentHistoryTab } from "@/app/(root)/staffs/[id]/_components/payment-history-tab";
import { useSession } from "@/lib/auth-client";
import { Role } from "@/constants/role";
import { EditStaffDialog } from "@/components/staff/edit-staff-dialog";
import { Skeleton } from "@/components/ui/skeleton";

function StaffDetailsSkeleton() {
    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-32" />
            </div>

            <Card>
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        <Skeleton className="h-24 w-24 rounded-full" />
                        <div className="flex-1 space-y-4 w-full">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-2">
                                    <Skeleton className="h-8 w-48" />
                                    <Skeleton className="h-4 w-32" />
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-4 mt-4">
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-5 w-24" />
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-5 w-24" />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-6">
                <Skeleton className="h-10 w-full lg:w-[400px]" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Skeleton className="h-[400px]" />
                    <div className="space-y-6">
                        <Skeleton className="h-[250px]" />
                        <Skeleton className="h-[150px]" />
                        <Skeleton className="h-[150px]" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function StaffDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const { data: session } = useSession();

    const { data, isLoading, isError } = useGetStaffByIdQuery(id);
    const staff = data?.staff;

    const userRole = session?.user?.role;
    const isOwner = session?.user?.id === staff?.userId;
    const canEdit =
        userRole === Role.ADMIN ||
        userRole === Role.HR_MANAGER ||
        userRole === Role.SUPER_ADMIN;
    const canViewSalary =
        canEdit || (isOwner && staff?.salaryVisibleToEmployee);

    if (isLoading) {
        return <StaffDetailsSkeleton />;
    }

    if (isError || !staff) {
        return (
            <div className="flex flex-col items-center justify-center p-12 gap-4">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <h2 className="text-xl font-semibold">Staff not found</h2>
                <Button onClick={() => router.back()}>Go Back</Button>
            </div>
        );
    }

    const { user, branch, currentShift } = staff;

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className="p-6 space-y-6">
            {/* SalaryPinDialog removed from here */}

            {/* Header / Navigation */}

            {/* Header / Navigation */}
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to Staff
                </Button>
            </div>

            {/* Profile Header Card */}
            {/* Profile Header Card */}
            <Card className="overflow-hidden border border-muted/20 bg-card shadow-md pb-4 rounded-2xl">
                <div className="h-32 bg-linear-to-r from-primary/20 via-primary/5 to-transparent w-full" />
                <CardContent className="px-6 sm:px-10 -mt-16 relative">
                    <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
                        <Avatar className="h-32 w-32 border-[6px] border-background shadow-xs bg-muted">
                            <AvatarImage src={user?.image || undefined} />
                            <AvatarFallback className="text-4xl bg-primary/10 text-primary font-medium">
                                {getInitials(user?.name || "Staff User")}
                            </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 space-y-1 mt-2 md:mt-16 w-full">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                <div className="space-y-1.5">
                                    <h1 className="text-3xl font-bold flex flex-wrap items-center gap-3 tracking-tight">
                                        {user?.name}
                                        <Badge
                                            variant={
                                                staff.status === "active"
                                                    ? "default"
                                                    : "destructive"
                                            }
                                            className="px-2.5 py-0.5 rounded-md uppercase tracking-widest text-[10px] bg-primary/10 text-primary hover:bg-primary/20 border-0"
                                        >
                                            {staff.status}
                                        </Badge>
                                    </h1>
                                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
                                        <Briefcase className="h-4 w-4 text-muted-foreground/70" />
                                        <span>{staff.designation}</span>
                                        <span className="opacity-40">•</span>
                                        <span>{staff.department}</span>
                                    </p>
                                </div>
                                {canEdit && (
                                    <div className="pt-1">
                                        <EditStaffDialog
                                            staff={staff}
                                            currentShiftId={currentShift?._id}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-x-8 gap-y-3 mt-8 pt-6 border-t border-border/40 text-sm text-muted-foreground/90">
                                <div className="flex items-center gap-2.5">
                                    <Mail className="h-4 w-4 text-muted-foreground/60" />
                                    <span
                                        className="truncate hover:text-foreground transition-colors"
                                        title={user?.email}
                                    >
                                        {user?.email}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <Phone className="h-4 w-4 text-muted-foreground/60" />
                                    <span className="hover:text-foreground transition-colors">
                                        {staff.phone || "N/A"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <Building2 className="h-4 w-4 text-muted-foreground/60" />
                                    <span className="hover:text-foreground transition-colors">
                                        {branch?.name || "No Branch"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <UserCircle className="h-4 w-4 text-muted-foreground/60" />
                                    <span className="font-medium text-foreground tracking-wide text-xs bg-muted/50 px-2 py-1 rounded-md">
                                        ID: {staff.staffId}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="flex flex-wrap h-auto w-full sm:w-auto justify-start gap-1 p-1">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="attendance">Attendance</TabsTrigger>
                    <TabsTrigger value="leave">Leaves</TabsTrigger>
                    <TabsTrigger value="overtime">Overtime</TabsTrigger>
                    {canViewSalary && (
                        <TabsTrigger value="payments">Payments</TabsTrigger>
                    )}
                </TabsList>

                <div className="mt-6">
                    <TabsContent value="overview">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                            <Card className="border border-muted/20 shadow-sm rounded-xl overflow-hidden bg-card">
                                <CardHeader className="border-b border-border/40 bg-muted/10 pb-4 pt-5 px-6">
                                    <CardTitle className="text-base font-semibold flex items-center gap-2.5 tracking-tight">
                                        <UserCircle className="h-4 w-4 text-primary/80" />
                                        Personal Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-8 p-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-6">
                                        <div className="space-y-1.5 flex flex-col">
                                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold flex items-center gap-2">
                                                <Calendar className="h-3 w-3 opacity-60" />{" "}
                                                Date of Birth
                                            </span>
                                            <span className="text-sm font-medium">
                                                {staff.dateOfBirth ? (
                                                    format(
                                                        new Date(
                                                            staff.dateOfBirth,
                                                        ),
                                                        "MMM d, yyyy",
                                                    )
                                                ) : (
                                                    <span className="text-muted-foreground/60 italic font-normal">
                                                        Not specified
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                        <div className="space-y-1.5 flex flex-col">
                                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold flex items-center gap-2">
                                                <Droplet className="h-3 w-3 opacity-60" />{" "}
                                                Blood Group
                                            </span>
                                            <span className="text-sm font-medium">
                                                {staff.bloodGroup || (
                                                    <span className="text-muted-foreground/60 italic font-normal">
                                                        Not specified
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                        <div className="space-y-1.5 flex flex-col">
                                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold flex items-center gap-2">
                                                <Fingerprint className="h-3 w-3 opacity-60" />{" "}
                                                National ID
                                            </span>
                                            <span className="text-sm font-medium">
                                                {staff.nationalId || (
                                                    <span className="text-muted-foreground/60 italic font-normal">
                                                        Not specified
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                        <div className="space-y-1.5 flex flex-col">
                                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold flex items-center gap-2">
                                                <CalendarDays className="h-3 w-3 opacity-60" />{" "}
                                                Join Date
                                            </span>
                                            <span className="text-sm font-medium">
                                                {staff.joinDate ? (
                                                    format(
                                                        new Date(
                                                            staff.joinDate,
                                                        ),
                                                        "MMM d, yyyy",
                                                    )
                                                ) : (
                                                    <span className="text-muted-foreground/60 italic font-normal">
                                                        Not specified
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                        <div className="col-span-1 sm:col-span-2 space-y-1.5 flex flex-col">
                                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold flex items-center gap-2">
                                                <MapPin className="h-3 w-3 opacity-60" />{" "}
                                                Address
                                            </span>
                                            <span className="text-sm font-medium">
                                                {staff.address || (
                                                    <span className="text-muted-foreground/60 italic font-normal">
                                                        Not specified
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-5 pt-6 border-t border-border/40">
                                        <h4 className="font-semibold text-sm flex items-center gap-2 tracking-tight">
                                            <ShieldAlert className="h-4 w-4 text-primary/80" />
                                            Emergency Contact
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                            <div className="space-y-1.5">
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                                                    Name
                                                </span>
                                                <p className="text-sm font-medium truncate">
                                                    {staff.emergencyContact
                                                        ?.name || (
                                                        <span className="text-muted-foreground/60 italic font-normal">
                                                            N/A
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                            <div className="space-y-1.5">
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                                                    Relation
                                                </span>
                                                <p className="text-sm font-medium">
                                                    {staff.emergencyContact
                                                        ?.relation || (
                                                        <span className="text-muted-foreground/60 italic font-normal">
                                                            N/A
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                            <div className="space-y-1.5">
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                                                    Phone
                                                </span>
                                                <p className="text-sm font-medium">
                                                    {staff.emergencyContact
                                                        ?.phone || (
                                                        <span className="text-muted-foreground/60 italic font-normal">
                                                            N/A
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="space-y-6">
                                <Card className="border border-muted/20 shadow-sm rounded-xl overflow-hidden bg-card">
                                    <CardHeader className="border-b border-border/40 bg-muted/10 pb-4 pt-5 px-6">
                                        <CardTitle className="text-base font-semibold flex items-center gap-2.5 tracking-tight">
                                            <Briefcase className="h-4 w-4 text-primary/80" />
                                            Job & Shift
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-8 p-6">
                                        <div className="grid grid-cols-2 gap-y-6 gap-x-6">
                                            <div className="space-y-1.5 flex flex-col">
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                                                    Department
                                                </span>
                                                <span className="text-sm font-medium truncate">
                                                    {staff.department}
                                                </span>
                                            </div>
                                            <div className="space-y-1.5 flex flex-col">
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                                                    Designation
                                                </span>
                                                <span className="text-sm font-medium truncate">
                                                    {staff.designation}
                                                </span>
                                            </div>
                                            <div className="space-y-1.5 flex flex-col">
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                                                    Branch
                                                </span>
                                                <span className="text-sm font-medium truncate">
                                                    {branch?.name}
                                                </span>
                                            </div>
                                            <div className="space-y-1.5 flex flex-col">
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                                                    Staff ID
                                                </span>
                                                <span className="text-sm font-medium text-primary">
                                                    {staff.staffId}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-5 pt-6 border-t border-border/40">
                                            <h4 className="font-semibold text-sm flex items-center gap-2 tracking-tight">
                                                <Clock className="h-4 w-4 text-primary/80" />
                                                Current Shift
                                            </h4>
                                            {currentShift ? (
                                                <div className="rounded-lg border border-muted/50 overflow-hidden divide-y divide-border/30">
                                                    <div className="flex justify-between items-center p-3 px-4 hover:bg-muted/10 transition-colors">
                                                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                                                            Shift Name
                                                        </span>
                                                        <span className="font-semibold text-sm text-primary">
                                                            {currentShift.name}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center p-3 px-4 hover:bg-muted/10 transition-colors">
                                                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                                                            Time
                                                        </span>
                                                        <span className="font-medium text-sm">
                                                            {
                                                                currentShift.startTime
                                                            }{" "}
                                                            —{" "}
                                                            {
                                                                currentShift.endTime
                                                            }
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center p-3 px-4 hover:bg-muted/10 transition-colors">
                                                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                                                            Work Days
                                                        </span>
                                                        <span className="font-medium text-xs px-2 py-0.5 bg-muted rounded">
                                                            {currentShift
                                                                .workDays
                                                                ?.length ||
                                                                0}{" "}
                                                            days/week
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="px-4 py-6 rounded-lg border border-dashed text-center">
                                                    <p className="text-sm text-muted-foreground/70">
                                                        No active shift assigned
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                {canViewSalary && (
                                    <Card className="border border-primary/20 bg-primary/5 shadow-sm rounded-xl overflow-hidden">
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <h3 className="font-semibold text-sm flex items-center gap-2">
                                                        <Banknote className="h-4 w-4 text-primary" />
                                                        Base Salary (Monthly)
                                                    </h3>
                                                    {!staff.salaryVisibleToEmployee &&
                                                        canEdit && (
                                                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 opacity-70">
                                                                <AlertCircle className="h-2.5 w-2.5" />
                                                                Hidden from
                                                                employee
                                                            </p>
                                                        )}
                                                </div>
                                                <span className="font-bold text-2xl tracking-tight text-primary">
                                                    ৳{" "}
                                                    {staff.salary?.toLocaleString() ||
                                                        0}
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Bank Account Card */}
                                <Card className="border border-muted/20 shadow-sm rounded-xl overflow-hidden bg-card">
                                    <CardHeader className="border-b border-border/40 bg-muted/10 pb-4 pt-5 px-6">
                                        <CardTitle className="text-base font-semibold flex items-center gap-2.5 tracking-tight">
                                            <CreditCard className="h-4 w-4 text-primary/80" />
                                            Bank Account
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="divide-y divide-border/40">
                                            <div className="flex justify-between items-center p-4 px-6 hover:bg-muted/10 transition-colors">
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                                                    Bank Name
                                                </span>
                                                <span className="font-medium text-sm">
                                                    {staff.bankName || (
                                                        <span className="text-muted-foreground/60 italic font-normal">
                                                            N/A
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center p-4 px-6 hover:bg-muted/10 transition-colors">
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                                                    Account No
                                                </span>
                                                <span className="font-medium text-sm font-mono tracking-wider">
                                                    {staff.bankAccountNo || (
                                                        <span className="text-muted-foreground/60 italic font-normal tracking-normal">
                                                            N/A
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center p-4 px-6 hover:bg-muted/10 transition-colors">
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                                                    Account Holder
                                                </span>
                                                <span className="font-medium text-sm truncate max-w-[150px] text-right">
                                                    {staff.bankAccountName || (
                                                        <span className="text-muted-foreground/60 italic font-normal">
                                                            N/A
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    {/* Other Tabs content ... duplicated for brevity in prompt match but I must include them to not break file */}
                    {/* Actually I should keep original content for other tabs */}
                    <TabsContent value="attendance">
                        <Card>
                            <CardHeader>
                                <CardTitle>Attendance Record</CardTitle>
                                <CardDescription>
                                    Recent attendance history
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <StaffAttendanceTab staffId={id} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="leave">
                        <Card>
                            <CardHeader>
                                <CardTitle>Leave Applications</CardTitle>
                                <CardDescription>
                                    Leave history and status
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <StaffLeaveTab staffId={id} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="overtime">
                        <Card>
                            <CardHeader>
                                <CardTitle>Overtime Records</CardTitle>
                                <CardDescription>
                                    Extra hours worked
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <StaffOvertimeTab staffId={id} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {canViewSalary && (
                        <TabsContent value="payments">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Payment History</CardTitle>
                                    <CardDescription>
                                        Salary and overtime payments
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <PaymentHistoryTab staffId={id} />
                                </CardContent>
                            </Card>
                        </TabsContent>
                    )}
                </div>
            </Tabs>
        </div>
    );
}
