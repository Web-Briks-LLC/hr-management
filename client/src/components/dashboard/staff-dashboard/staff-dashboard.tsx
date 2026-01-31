'use client';

import { useState } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
    Clock,
    CalendarDays,
    TrendingUp,
    AlertCircle,
    LogIn,
    LogOut,
    FileText,
    MapPin,
    Mail,
    Phone,
    Briefcase,
} from 'lucide-react';
import { User } from 'better-auth';
import StaffHeader from './staff-header';
import StaffTracking from './staff-tracking';

import { useGetMonthlyStatsQuery } from '@/redux/features/attendance/attendanceApi';
import { Skeleton } from '@/components/ui/skeleton';
import StaffAttendanceTable from './staff-attendance-table';

// Mock data - replace with real data from your API
const mockUser = {
    id: '1',
    name: 'MD. Masud Kamal',
    email: 'masumkamal31@gmail.com',
    phone: '01301101116',
    role: 'junior designer',
    status: 'active',
    image: '/api/placeholder/100/100',
    location: 'kashdha, sundhorgonj, gaubandha',
    dob: '2006-10-10',
    employeeId: 'EMP001',
};

// Removed mockAttendance.thisMonth usage

const mockSalary = {
    monthly: '••••',
    pfStatus: 'de-active',
    pfPercentage: 5,
    totalPfBalance: 0,
    isUnlocked: false,
};

const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
};

export default function StaffDashboard({ user }: { user: User }) {
    const { data: monthlyStats, isLoading } = useGetMonthlyStatsQuery({});

    return (
        <div className="min-h-screen bg-background space-y-6">
            <StaffHeader />

            <StaffTracking />

            {/* This Month & Salary */}
            <div className="grid lg:grid-cols-2 gap-6 items-start">
                {/* This Month Stats */}
                <Card>
                    <CardHeader>
                        <CardTitle>This Month</CardTitle>
                        <CardDescription>
                            {isLoading ? (
                                <Skeleton className="h-4 w-20" />
                            ) : (
                                monthlyStats?.month || 'Loading...'
                            )}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <div className="text-sm text-muted-foreground mb-2">
                                        Present
                                    </div>
                                    <div className="text-3xl font-bold text-green-600">
                                        {isLoading ? (
                                            <Skeleton className="h-8 w-12 mx-auto" />
                                        ) : (
                                            monthlyStats?.present || 0
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <div className="text-sm text-muted-foreground mb-2">
                                        Late In
                                    </div>
                                    <div className="text-3xl font-bold text-orange-600">
                                        {isLoading ? (
                                            <Skeleton className="h-8 w-12 mx-auto" />
                                        ) : (
                                            monthlyStats?.late || 0
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <div className="text-sm text-muted-foreground mb-2">
                                        Total OT
                                    </div>
                                    <div className="text-xl font-bold text-blue-600">
                                        {isLoading ? (
                                            <Skeleton className="h-8 w-16 mx-auto" />
                                        ) : (
                                            formatDuration(
                                                monthlyStats?.totalOvertimeMinutes ||
                                                    0,
                                            )
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                            <TrendingUp className="h-4 w-4" />
                            <span>Updated now</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Salary & PF */}
                <Card>
                    <CardHeader>
                        <CardTitle>Salary & PF</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <Card>
                                <CardContent className="p-4">
                                    <div className="text-sm text-muted-foreground mb-2">
                                        Monthly Salary
                                    </div>
                                    <div className="text-3xl font-bold mb-2">
                                        {mockSalary.monthly}
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full"
                                    >
                                        <AlertCircle className=" h-4 w-4" />
                                        Unlock
                                    </Button>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="text-sm text-muted-foreground mb-2">
                                        PF Status
                                    </div>
                                    <Badge
                                        variant="destructive"
                                        className="mb-4"
                                    >
                                        {mockSalary.pfStatus}
                                    </Badge>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full"
                                    >
                                        <FileText className=" h-4 w-4" />
                                        PIN
                                    </Button>
                                </CardContent>
                            </Card>
                            <Card className="col-span-2">
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm text-muted-foreground">
                                            Monthly PF (
                                            {mockSalary.pfPercentage}%)
                                        </span>
                                        <span className="font-bold">
                                            {mockSalary.monthly}
                                        </span>
                                    </div>
                                    <Separator className="my-2" />
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">
                                            Total PF Balance
                                        </span>
                                        <span className="font-bold">
                                            {mockSalary.totalPfBalance}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <StaffAttendanceTable />

            {/* Notifications */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Notifications</CardTitle>
                        <Button variant="ghost" size="sm">
                            Recent
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Your account has been de-activated. You can no
                            longer access the portal.
                            <span className="text-xs text-muted-foreground ml-2">
                                3 months ago
                            </span>
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        </div>
    );
}
