'use client';

import { useParams, useRouter } from 'next/navigation';
import { useGetStaffByIdQuery } from '@/redux/features/staff/staffApi';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Loader,
    ArrowLeft,
    Mail,
    Phone,
    MapPin,
    Briefcase,
    Calendar,
    Clock,
    Building,
    User,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Banknote,
} from 'lucide-react';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { StaffAttendanceTab } from '@/app/(root)/staffs/[id]/_components/attendance-tab';
import { StaffLeaveTab } from '@/app/(root)/staffs/[id]/_components/staff-leave-tab';
import { StaffOvertimeTab } from '@/app/(root)/staffs/[id]/_components/overtime-tab';
import { useSession } from '@/lib/auth-client';
import { Role } from '@/constants/role';
import { EditStaffDialog } from '@/components/staff/edit-staff-dialog';

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
        return (
            <div className="flex items-center justify-center p-12">
                <Loader className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
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
            .split(' ')
            .map((n) => n[0])
            .join('')
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
            <Card>
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        <Avatar className="h-24 w-24 border-2 border-primary/10">
                            <AvatarImage src={user?.image || undefined} />
                            <AvatarFallback className="text-2xl">
                                {getInitials(user?.name || 'Staff User')}
                            </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 space-y-2">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h1 className="text-2xl font-bold flex items-center gap-2">
                                        {user?.name}
                                        <Badge
                                            variant={
                                                staff.status === 'active'
                                                    ? 'default'
                                                    : 'destructive'
                                            }
                                            className="ml-2"
                                        >
                                            {staff.status}
                                        </Badge>
                                    </h1>
                                    <p className="text-muted-foreground flex items-center gap-2 mt-1">
                                        <Briefcase className="h-4 w-4" />
                                        {staff.designation} &bull;{' '}
                                        {staff.department}
                                    </p>
                                </div>
                                {canEdit && (
                                    <EditStaffDialog
                                        staff={staff}
                                        currentShiftId={currentShift?._id}
                                    />
                                )}
                            </div>

                            <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <Mail className="h-4 w-4" />
                                    {user?.email}
                                </div>
                                <div className="flex items-center gap-1">
                                    <Phone className="h-4 w-4" />
                                    {staff.phone || 'N/A'}
                                </div>
                                <div className="flex items-center gap-1">
                                    <Building className="h-4 w-4" />
                                    {branch?.name || 'No Branch'}
                                </div>
                                <div className="flex items-center gap-1">
                                    <User className="h-4 w-4" />
                                    ID: {staff.staffId}
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="attendance">Attendance</TabsTrigger>
                    <TabsTrigger value="leave">Leaves</TabsTrigger>
                    <TabsTrigger value="overtime">Overtime</TabsTrigger>
                </TabsList>

                <div className="mt-6">
                    <TabsContent value="overview">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">
                                        Personal Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">
                                                Date of Birth
                                            </p>
                                            <p className="font-medium">
                                                {staff.dateOfBirth
                                                    ? format(
                                                          new Date(
                                                              staff.dateOfBirth,
                                                          ),
                                                          'PPP',
                                                      )
                                                    : 'N/A'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">
                                                Blood Group
                                            </p>
                                            <p className="font-medium">
                                                {staff.bloodGroup || 'N/A'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">
                                                National ID
                                            </p>
                                            <p className="font-medium">
                                                {staff.nationalId || 'N/A'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">
                                                Join Date
                                            </p>
                                            <p className="font-medium">
                                                {staff.joinDate
                                                    ? format(
                                                          new Date(
                                                              staff.joinDate,
                                                          ),
                                                          'PPP',
                                                      )
                                                    : 'N/A'}
                                            </p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-muted-foreground">
                                                Address
                                            </p>
                                            <p className="font-medium">
                                                {staff.address || 'N/A'}
                                            </p>
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="space-y-2">
                                        <h4 className="font-medium text-sm">
                                            Emergency Contact
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-muted-foreground">
                                                    Name
                                                </p>
                                                <p>
                                                    {staff.emergencyContact
                                                        ?.name || 'N/A'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">
                                                    Relation
                                                </p>
                                                <p>
                                                    {staff.emergencyContact
                                                        ?.relation || 'N/A'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">
                                                    Phone
                                                </p>
                                                <p>
                                                    {staff.emergencyContact
                                                        ?.phone || 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">
                                            Job & Shift
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-muted-foreground">
                                                    Department
                                                </p>
                                                <p className="font-medium">
                                                    {staff.department}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">
                                                    Designation
                                                </p>
                                                <p className="font-medium">
                                                    {staff.designation}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">
                                                    Branch
                                                </p>
                                                <p className="font-medium">
                                                    {branch?.name}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">
                                                    Staff ID
                                                </p>
                                                <p className="font-medium">
                                                    {staff.staffId}
                                                </p>
                                            </div>
                                        </div>

                                        <Separator />

                                        <div className="space-y-2">
                                            <h4 className="font-medium text-sm flex items-center gap-2">
                                                <Clock className="h-4 w-4" />
                                                Current Shift
                                            </h4>
                                            {currentShift ? (
                                                <div className="bg-muted/50 p-3 rounded-md border text-sm grid gap-2">
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">
                                                            Shift Name
                                                        </span>
                                                        <span className="font-medium">
                                                            {currentShift.name}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">
                                                            Time
                                                        </span>
                                                        <span className="font-medium">
                                                            {
                                                                currentShift.startTime
                                                            }{' '}
                                                            -{' '}
                                                            {
                                                                currentShift.endTime
                                                            }
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">
                                                            Work Days
                                                        </span>
                                                        <span className="font-medium">
                                                            {currentShift
                                                                .workDays
                                                                ?.length ||
                                                                0}{' '}
                                                            days/week
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground italic">
                                                    No active shift assigned.
                                                </p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                {canViewSalary && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Banknote className="h-5 w-5" />
                                                Compensation
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-muted-foreground">
                                                        Base Salary (Monthly)
                                                    </span>
                                                    <span className="font-bold text-lg">
                                                        ৳{' '}
                                                        {staff.salary?.toLocaleString() ||
                                                            0}
                                                    </span>
                                                </div>
                                                {!staff.salaryVisibleToEmployee &&
                                                    canEdit && (
                                                        <div className="bg-yellow-500/10 text-yellow-600 text-xs px-2 py-1 rounded flex items-center gap-1">
                                                            <AlertCircle className="h-3 w-3" />
                                                            Hidden from staff
                                                            member
                                                        </div>
                                                    )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
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
                </div>
            </Tabs>
        </div>
    );
}
