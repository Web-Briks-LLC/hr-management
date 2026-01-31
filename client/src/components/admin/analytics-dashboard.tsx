'use client';

import { useEffect, useState } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Loader, Users, DollarSign, Building2, TrendingUp } from 'lucide-react';

export default function AnalyticsDashboard() {
    const [analytics, setAnalytics] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const response = await fetch('/api/analytics/dashboard', {
                credentials: 'include',
            });
            const data = await response.json();
            if (data.success) {
                setAnalytics(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch analytics:', err);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-10">
                <Loader className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!analytics) return null;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">
                    Analytics Dashboard
                </h2>
                <p className="text-muted-foreground">
                    Overview of your organization's key metrics
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Staff
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {analytics.totalStaff}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Active employees
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Departments
                        </CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {analytics.totalDepartments}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Active departments
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Avg Salary
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ৳
                            {Math.round(
                                analytics.salary?.avgSalary || 0,
                            ).toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Per employee
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Payroll
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ৳
                            {Math.round(
                                analytics.salary?.totalSalary || 0,
                            ).toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">Monthly</p>
                    </CardContent>
                </Card>
            </div>

            {/* Department Distribution */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Department Distribution</CardTitle>
                        <CardDescription>
                            Staff count by department
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {analytics.departments?.map((dept: any) => (
                                <div
                                    key={dept._id}
                                    className="flex items-center"
                                >
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">
                                            {dept._id || 'Unassigned'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary"
                                                style={{
                                                    width: `${(dept.count / analytics.totalStaff) * 100}%`,
                                                }}
                                            />
                                        </div>
                                        <span className="text-sm font-medium w-8 text-right">
                                            {dept.count}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Role Distribution</CardTitle>
                        <CardDescription>Users by role</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {analytics.roles?.map((role: any) => (
                                <div
                                    key={role._id}
                                    className="flex items-center"
                                >
                                    <div className="flex-1">
                                        <p className="text-sm font-medium capitalize">
                                            {role._id?.replace('_', ' ')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500"
                                                style={{
                                                    width: `${(role.count / analytics.totalStaff) * 100}%`,
                                                }}
                                            />
                                        </div>
                                        <span className="text-sm font-medium w-8 text-right">
                                            {role.count}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Salary Range */}
            <Card>
                <CardHeader>
                    <CardTitle>Salary Range</CardTitle>
                    <CardDescription>
                        Minimum to maximum salary distribution
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Minimum
                            </p>
                            <p className="text-2xl font-bold">
                                ৳
                                {(
                                    analytics.salary?.minSalary || 0
                                ).toLocaleString()}
                            </p>
                        </div>
                        <div className="flex-1 mx-8">
                            <div className="h-2 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full" />
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">
                                Maximum
                            </p>
                            <p className="text-2xl font-bold">
                                ৳
                                {(
                                    analytics.salary?.maxSalary || 0
                                ).toLocaleString()}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
