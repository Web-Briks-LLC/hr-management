"use client";

import { useState } from "react";
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
    Copy,
    Check,
    CalendarCheck,
    CalendarOff,
    CheckCircle2,
    ShieldCheck,
    PhoneCall,
    Sparkles,
} from "lucide-react";
import { format, differenceInMonths, differenceInYears } from "date-fns";
import { StaffAttendanceTab } from "@/app/(root)/staffs/[id]/_components/attendance-tab";
import { StaffLeaveTab } from "@/app/(root)/staffs/[id]/_components/staff-leave-tab";
import { StaffOvertimeTab } from "@/app/(root)/staffs/[id]/_components/overtime-tab";
import { PaymentHistoryTab } from "@/app/(root)/staffs/[id]/_components/payment-history-tab";
import { useSession } from "@/lib/auth-client";
import { Role } from "@/constants/role";
import { EditStaffDialog } from "@/components/staff/edit-staff-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

function StaffDetailsSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-28 rounded-lg" />
            </div>

            {/* Profile Header Skeleton */}
            <Card className="p-6 border border-border/40 rounded-2xl">
                <div className="flex flex-col sm:flex-row gap-5 items-start">
                    <Skeleton className="h-20 w-20 rounded-2xl shrink-0" />
                    <div className="flex-1 space-y-3 w-full">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-2">
                                <Skeleton className="h-7 w-48" />
                                <Skeleton className="h-4 w-64" />
                            </div>
                            <Skeleton className="h-9 w-28 rounded-lg" />
                        </div>
                        <div className="flex flex-wrap gap-3 pt-3 border-t border-border/40">
                            <Skeleton className="h-7 w-40 rounded-lg" />
                            <Skeleton className="h-7 w-32 rounded-lg" />
                            <Skeleton className="h-7 w-36 rounded-lg" />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Content Skeleton */}
            <div className="space-y-4">
                <Skeleton className="h-10 w-full sm:w-[480px] rounded-lg" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Skeleton className="h-[360px] rounded-xl" />
                    <div className="space-y-6">
                        <Skeleton className="h-[220px] rounded-xl" />
                        <Skeleton className="h-[120px] rounded-xl" />
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
    const [copiedField, setCopiedField] = useState<string | null>(null);

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

    const handleCopy = (text: string, label: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(label);
        toast.success(`${label} copied to clipboard`);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const getTenure = (joinDateStr?: string | Date) => {
        if (!joinDateStr) return null;
        try {
            const joinDate = new Date(joinDateStr);
            const now = new Date();
            const years = differenceInYears(now, joinDate);
            const months = differenceInMonths(now, joinDate) % 12;

            if (years > 0) {
                return `${years} yr${years > 1 ? "s" : ""} ${months > 0 ? `${months} mo${months > 1 ? "s" : ""}` : ""}`;
            }
            if (months > 0) {
                return `${months} month${months > 1 ? "s" : ""}`;
            }
            return "Just joined";
        } catch {
            return null;
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .filter(Boolean)
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    if (isLoading) {
        return <StaffDetailsSkeleton />;
    }

    if (isError || !staff) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed bg-muted/20">
                <AlertCircle className="h-12 w-12 text-destructive mb-3" />
                <h2 className="text-xl font-bold">Staff member not found</h2>
                <p className="text-sm text-muted-foreground mt-1 mb-5">
                    The requested employee profile could not be loaded or may have been deleted.
                </p>
                <Button onClick={() => router.push("/staffs")} variant="default">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Staff List
                </Button>
            </div>
        );
    }

    const { user, branch, currentShift } = staff;
    const tenure = getTenure(staff.joinDate);

    return (
        <div className="space-y-6">
            {/* Profile Header Card */}
            <Card className="border border-border/50 bg-card shadow-xs rounded-2xl p-6 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                        <Avatar className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border-2 border-border shadow-xs bg-muted">
                            <AvatarImage
                                src={user?.image || undefined}
                                className="object-cover rounded-2xl"
                            />
                            <AvatarFallback className="text-2xl sm:text-3xl bg-primary/10 text-primary font-bold rounded-2xl">
                                {getInitials(user?.name || "Staff")}
                            </AvatarFallback>
                        </Avatar>
                        <span
                            className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-background shadow-xs ${
                                staff.status === "active"
                                    ? "bg-emerald-500"
                                    : "bg-destructive"
                            }`}
                            title={staff.status}
                        />
                    </div>

                    {/* Main Information */}
                    <div className="flex-1 w-full space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div className="space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                                        {user?.name || "Employee"}
                                    </h1>
                                    <Badge
                                        variant={staff.status === "active" ? "default" : "destructive"}
                                        className={`capitalize text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                                            staff.status === "active"
                                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                                : ""
                                        }`}
                                    >
                                        {staff.status}
                                    </Badge>
                                    {user?.role && (
                                        <Badge
                                            variant="secondary"
                                            className="text-xs uppercase tracking-wider font-mono text-muted-foreground"
                                        >
                                            {user.role.replace("_", " ")}
                                        </Badge>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                    <span className="font-medium text-foreground/90 flex items-center gap-1.5">
                                        <Briefcase className="h-3.5 w-3.5 text-primary" />
                                        {staff.designation || "No Designation"}
                                    </span>
                                    <span className="opacity-40">•</span>
                                    <span className="flex items-center gap-1.5">
                                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                        {staff.department || "No Department"}
                                    </span>
                                    {branch?.name && (
                                        <>
                                            <span className="opacity-40">•</span>
                                            <span className="flex items-center gap-1.5">
                                                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                                {branch.name}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            {canEdit && (
                                <div className="flex items-center gap-2">
                                    <EditStaffDialog
                                        staff={staff}
                                        currentShiftId={currentShift?._id}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Quick Contact & Metadata Row */}
                        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border/40 text-xs">
                            {user?.email && (
                                <a
                                    href={`mailto:${user.email}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40 transition-colors"
                                    title={user.email}
                                >
                                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="truncate max-w-[200px]">{user.email}</span>
                                </a>
                            )}

                            {staff.phone && (
                                <a
                                    href={`tel:${staff.phone}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40 transition-colors"
                                >
                                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>{staff.phone}</span>
                                </a>
                            )}

                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 text-muted-foreground border border-border/40">
                                <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="font-mono font-semibold text-foreground">
                                    ID: {staff.staffId}
                                </span>
                                <button
                                    onClick={() => handleCopy(staff.staffId, "Staff ID")}
                                    className="text-muted-foreground hover:text-foreground p-0.5 ml-0.5"
                                    title="Copy Staff ID"
                                >
                                    {copiedField === "Staff ID" ? (
                                        <Check className="h-3 w-3 text-emerald-500" />
                                    ) : (
                                        <Copy className="h-3 w-3" />
                                    )}
                                </button>
                            </div>

                            {tenure && (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 text-muted-foreground border border-border/40">
                                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                                    <span>Tenure: <strong className="text-foreground font-medium">{tenure}</strong></span>
                                </div>
                            )}

                            {currentShift?.name && (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 text-muted-foreground border border-border/40">
                                    <Clock className="h-3.5 w-3.5 text-blue-500" />
                                    <span>Shift: <strong className="text-foreground font-medium">{currentShift.name}</strong></span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Tab Navigation Section */}
            <Tabs defaultValue="overview" className="w-full space-y-6">
                <TabsList className="flex flex-wrap h-auto w-full sm:w-auto justify-start gap-1 p-1 bg-muted/60 border rounded-xl">
                    <TabsTrigger
                        value="overview"
                        className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs"
                    >
                        <UserCircle className="h-4 w-4" />
                        <span>Overview</span>
                    </TabsTrigger>

                    <TabsTrigger
                        value="attendance"
                        className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs"
                    >
                        <CalendarCheck className="h-4 w-4" />
                        <span>Attendance</span>
                    </TabsTrigger>

                    <TabsTrigger
                        value="leave"
                        className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs"
                    >
                        <CalendarOff className="h-4 w-4" />
                        <span>Leaves</span>
                    </TabsTrigger>

                    <TabsTrigger
                        value="overtime"
                        className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs"
                    >
                        <Clock className="h-4 w-4" />
                        <span>Overtime</span>
                    </TabsTrigger>

                    {canViewSalary && (
                        <TabsTrigger
                            value="payments"
                            className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs"
                        >
                            <CreditCard className="h-4 w-4" />
                            <span>Payments</span>
                        </TabsTrigger>
                    )}
                </TabsList>

                {/* TAB CONTENT: Overview */}
                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        {/* Left Column (2 Cols on Large Screens): Personal Info & Emergency Contact */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Personal Information Card */}
                            <Card className="border border-border/50 shadow-xs rounded-2xl overflow-hidden bg-card">
                                <CardHeader className="border-b border-border/40 bg-muted/20 pb-4 pt-5 px-6">
                                    <CardTitle className="text-base font-semibold flex items-center gap-2.5">
                                        <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                                            <UserCircle className="h-4 w-4" />
                                        </div>
                                        Personal Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-6">
                                        {/* Date of Birth */}
                                        <div className="space-y-1">
                                            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1.5">
                                                <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
                                                Date of Birth
                                            </span>
                                            <p className="text-sm font-medium text-foreground">
                                                {staff.dateOfBirth
                                                    ? format(new Date(staff.dateOfBirth), "MMM d, yyyy")
                                                    : <span className="text-muted-foreground/60 italic font-normal">Not specified</span>}
                                            </p>
                                        </div>

                                        {/* Blood Group */}
                                        <div className="space-y-1">
                                            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1.5">
                                                <Droplet className="h-3.5 w-3.5 text-rose-500" />
                                                Blood Group
                                            </span>
                                            <p className="text-sm font-medium text-foreground">
                                                {staff.bloodGroup ? (
                                                    <Badge variant="outline" className="font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20">
                                                        {staff.bloodGroup}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground/60 italic font-normal">Not specified</span>
                                                )}
                                            </p>
                                        </div>

                                        {/* National ID */}
                                        <div className="space-y-1">
                                            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1.5">
                                                <Fingerprint className="h-3.5 w-3.5 text-muted-foreground/70" />
                                                National ID / NID
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-mono font-medium text-foreground">
                                                    {staff.nationalId || (
                                                        <span className="text-muted-foreground/60 italic font-normal font-sans">Not specified</span>
                                                    )}
                                                </p>
                                                {staff.nationalId && (
                                                    <button
                                                        onClick={() => handleCopy(staff.nationalId, "National ID")}
                                                        className="text-muted-foreground hover:text-foreground p-0.5"
                                                        title="Copy NID"
                                                    >
                                                        {copiedField === "National ID" ? (
                                                            <Check className="h-3 w-3 text-emerald-500" />
                                                        ) : (
                                                            <Copy className="h-3 w-3" />
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Join Date */}
                                        <div className="space-y-1">
                                            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1.5">
                                                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground/70" />
                                                Joining Date
                                            </span>
                                            <p className="text-sm font-medium text-foreground">
                                                {staff.joinDate
                                                    ? format(new Date(staff.joinDate), "MMM d, yyyy")
                                                    : <span className="text-muted-foreground/60 italic font-normal">Not specified</span>}
                                            </p>
                                        </div>

                                        {/* Address */}
                                        <div className="sm:col-span-2 space-y-1 pt-2 border-t border-border/40">
                                            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1.5">
                                                <MapPin className="h-3.5 w-3.5 text-muted-foreground/70" />
                                                Residential Address
                                            </span>
                                            <p className="text-sm font-medium text-foreground">
                                                {staff.address || (
                                                    <span className="text-muted-foreground/60 italic font-normal">Not specified</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Emergency Contact Section */}
                                    <div className="pt-6 border-t border-border/40 space-y-4">
                                        <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                                            <div className="p-1 bg-amber-500/10 rounded text-amber-600 dark:text-amber-400">
                                                <ShieldAlert className="h-3.5 w-3.5" />
                                            </div>
                                            Emergency Contact
                                        </h4>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-muted/30 border border-border/40">
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                                                    Contact Name
                                                </span>
                                                <p className="text-sm font-medium text-foreground truncate">
                                                    {staff.emergencyContact?.name || (
                                                        <span className="text-muted-foreground/60 italic font-normal">N/A</span>
                                                    )}
                                                </p>
                                            </div>

                                            <div className="space-y-1">
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                                                    Relationship
                                                </span>
                                                <p className="text-sm font-medium text-foreground">
                                                    {staff.emergencyContact?.relation ? (
                                                        <Badge variant="secondary" className="text-xs capitalize font-normal">
                                                            {staff.emergencyContact.relation}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground/60 italic font-normal">N/A</span>
                                                    )}
                                                </p>
                                            </div>

                                            <div className="space-y-1">
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                                                    Contact Phone
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium text-foreground">
                                                        {staff.emergencyContact?.phone || (
                                                            <span className="text-muted-foreground/60 italic font-normal">N/A</span>
                                                        )}
                                                    </p>
                                                    {staff.emergencyContact?.phone && (
                                                        <a
                                                            href={`tel:${staff.emergencyContact.phone}`}
                                                            className="text-primary hover:text-primary/80"
                                                            title="Call emergency contact"
                                                        >
                                                            <PhoneCall className="h-3.5 w-3.5" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Shift & Work Schedule Card */}
                            <Card className="border border-border/50 shadow-xs rounded-2xl overflow-hidden bg-card">
                                <CardHeader className="border-b border-border/40 bg-muted/20 pb-4 pt-5 px-6">
                                    <CardTitle className="text-base font-semibold flex items-center gap-2.5">
                                        <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400">
                                            <Clock className="h-4 w-4" />
                                        </div>
                                        Assigned Shift & Schedule
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    {currentShift ? (
                                        <div className="space-y-5">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-muted/30 border border-border/40">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                                                        Shift Name
                                                    </span>
                                                    <h4 className="text-lg font-bold text-foreground">
                                                        {currentShift.name}
                                                    </h4>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className="px-3 py-1.5 rounded-lg bg-background border shadow-2xs text-center">
                                                        <span className="text-[10px] text-muted-foreground block">START</span>
                                                        <span className="font-bold text-sm text-foreground">{currentShift.startTime}</span>
                                                    </div>
                                                    <span className="text-muted-foreground font-semibold">—</span>
                                                    <div className="px-3 py-1.5 rounded-lg bg-background border shadow-2xs text-center">
                                                        <span className="text-[10px] text-muted-foreground block">END</span>
                                                        <span className="font-bold text-sm text-foreground">{currentShift.endTime}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Days of Week Work Schedule */}
                                            <div className="space-y-2">
                                                <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold block">
                                                    Weekly Work Days ({currentShift.workDays?.length || 0} days active)
                                                </span>
                                                <div className="grid grid-cols-7 gap-1.5">
                                                    {DAYS_OF_WEEK.map((day) => {
                                                        const isWorkDay = currentShift.workDays?.some(
                                                            (d: string) => d.toLowerCase().startsWith(day.toLowerCase())
                                                        );
                                                        return (
                                                            <div
                                                                key={day}
                                                                className={`py-2 text-center rounded-lg text-xs font-semibold transition-all ${
                                                                    isWorkDay
                                                                        ? "bg-primary text-primary-foreground shadow-xs"
                                                                        : "bg-muted/40 text-muted-foreground/60 border border-dashed border-border/50"
                                                                }`}
                                                            >
                                                                {day}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-8 text-center rounded-xl border border-dashed border-border/60 bg-muted/20">
                                            <Clock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                                            <p className="text-sm font-medium text-foreground">No Active Shift Assigned</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Assign a shift to this staff member through shift management.
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column (1 Col on Large Screens): Job Info, Salary & Bank Account */}
                        <div className="space-y-6">
                            {/* Job & Organization Overview */}
                            <Card className="border border-border/50 shadow-xs rounded-2xl overflow-hidden bg-card">
                                <CardHeader className="border-b border-border/40 bg-muted/20 pb-4 pt-5 px-6">
                                    <CardTitle className="text-base font-semibold flex items-center gap-2.5">
                                        <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400">
                                            <Briefcase className="h-4 w-4" />
                                        </div>
                                        Job & Organization
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-border/40 text-sm">
                                        <div className="flex justify-between items-center p-4 px-6 hover:bg-muted/10 transition-colors">
                                            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                                                Designation
                                            </span>
                                            <span className="font-semibold text-foreground text-right">
                                                {staff.designation || "N/A"}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center p-4 px-6 hover:bg-muted/10 transition-colors">
                                            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                                                Department
                                            </span>
                                            <span className="font-medium text-foreground text-right">
                                                {staff.department || "N/A"}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center p-4 px-6 hover:bg-muted/10 transition-colors">
                                            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                                                Branch
                                            </span>
                                            <span className="font-medium text-foreground text-right">
                                                {branch?.name || "N/A"}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center p-4 px-6 hover:bg-muted/10 transition-colors">
                                            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                                                System Role
                                            </span>
                                            <Badge variant="outline" className="text-xs uppercase font-mono">
                                                {user?.role?.replace("_", " ") || "Staff"}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Base Monthly Salary Card */}
                            {canViewSalary && (
                                <Card className="border border-primary/20 bg-primary/5 dark:bg-primary/10 shadow-xs rounded-2xl overflow-hidden">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <span className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                                                    <Banknote className="h-4 w-4" />
                                                    Base Monthly Salary
                                                </span>
                                                {!staff.salaryVisibleToEmployee && canEdit && (
                                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                        <ShieldCheck className="h-3 w-3" />
                                                        Confidential (Admin only)
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary">
                                                    ৳ {staff.salary ? staff.salary.toLocaleString() : "0"}
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Bank Details Card */}
                            <Card className="border border-border/50 shadow-xs rounded-2xl overflow-hidden bg-card">
                                <CardHeader className="border-b border-border/40 bg-muted/20 pb-4 pt-5 px-6">
                                    <CardTitle className="text-base font-semibold flex items-center gap-2.5">
                                        <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400">
                                            <CreditCard className="h-4 w-4" />
                                        </div>
                                        Bank Account Details
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-border/40 text-sm">
                                        <div className="flex justify-between items-center p-4 px-6 hover:bg-muted/10 transition-colors">
                                            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                                                Bank Name
                                            </span>
                                            <span className="font-medium text-foreground text-right">
                                                {staff.bank?.bankName || staff.bankName || (
                                                    <span className="text-muted-foreground/60 italic font-normal">N/A</span>
                                                )}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center p-4 px-6 hover:bg-muted/10 transition-colors">
                                            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                                                Account No
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-semibold text-foreground text-right">
                                                    {staff.bank?.accountNumber || staff.bankAccountNo || (
                                                        <span className="text-muted-foreground/60 italic font-normal font-sans">N/A</span>
                                                    )}
                                                </span>
                                                {(staff.bank?.accountNumber || staff.bankAccountNo) && (
                                                    <button
                                                        onClick={() => handleCopy(staff.bank?.accountNumber || staff.bankAccountNo || "", "Account Number")}
                                                        className="text-muted-foreground hover:text-foreground p-0.5"
                                                        title="Copy Account Number"
                                                    >
                                                        {copiedField === "Account Number" ? (
                                                            <Check className="h-3 w-3 text-emerald-500" />
                                                        ) : (
                                                            <Copy className="h-3 w-3" />
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center p-4 px-6 hover:bg-muted/10 transition-colors">
                                            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                                                Account Holder
                                            </span>
                                            <span className="font-medium text-foreground text-right truncate max-w-[160px]">
                                                {staff.bank?.accountHolderName || staff.bankAccountName || (
                                                    <span className="text-muted-foreground/60 italic font-normal">N/A</span>
                                                )}
                                            </span>
                                        </div>

                                        {(staff.bank?.branch || staff.bankBranch) && (
                                            <div className="flex justify-between items-center p-4 px-6 hover:bg-muted/10 transition-colors">
                                                <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                                                    Bank Branch
                                                </span>
                                                <span className="font-medium text-foreground text-right">
                                                    {staff.bank?.branch || staff.bankBranch}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* TAB CONTENT: Attendance */}
                <TabsContent value="attendance">
                    <Card className="border border-border/50 shadow-xs rounded-2xl overflow-hidden bg-card">
                        <CardHeader className="border-b border-border/40 pb-4 pt-5 px-6">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <CalendarCheck className="h-5 w-5 text-primary" />
                                Attendance History
                            </CardTitle>
                            <CardDescription>
                                Complete attendance log, check-in, check-out times and daily working hours.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <StaffAttendanceTab staffId={id} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB CONTENT: Leaves */}
                <TabsContent value="leave">
                    <Card className="border border-border/50 shadow-xs rounded-2xl overflow-hidden bg-card">
                        <CardHeader className="border-b border-border/40 pb-4 pt-5 px-6">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <CalendarOff className="h-5 w-5 text-primary" />
                                Leave Applications
                            </CardTitle>
                            <CardDescription>
                                Submitted leave applications, date ranges, reasons, and approval status.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <StaffLeaveTab staffId={id} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB CONTENT: Overtime */}
                <TabsContent value="overtime">
                    <Card className="border border-border/50 shadow-xs rounded-2xl overflow-hidden bg-card">
                        <CardHeader className="border-b border-border/40 pb-4 pt-5 px-6">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Clock className="h-5 w-5 text-primary" />
                                Overtime Records
                            </CardTitle>
                            <CardDescription>
                                Logged extra working hours, approval statuses, and calculated overtime dues.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <StaffOvertimeTab staffId={id} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB CONTENT: Payments */}
                {canViewSalary && (
                    <TabsContent value="payments">
                        <Card className="border border-border/50 shadow-xs rounded-2xl overflow-hidden bg-card">
                            <CardHeader className="border-b border-border/40 pb-4 pt-5 px-6">
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    <CreditCard className="h-5 w-5 text-primary" />
                                    Salary & Payment History
                                </CardTitle>
                                <CardDescription>
                                    Monthly salary distributions, overtime disbursements, and payment receipts.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-6">
                                <PaymentHistoryTab
                                    staffId={id}
                                    isPinSet={staff.isSalaryPinSet || false}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}
