'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Building, Briefcase, MapPin } from 'lucide-react';
import DepartmentTab from '@/components/organization/department-tab';
import DesignationTab from '@/components/organization/designation-tab';
import BranchTab from '@/components/organization/branch-tab';
import { useGetAllDepartmentsQuery } from '@/redux/features/department/departmentApi';
import { useGetAllDesignationsQuery } from '@/redux/features/designation/designationApi';
import { useGetAllBranchesQuery } from '@/redux/features/branch/branchApi';

export default function OrganizationPage() {
    const { data: depData } = useGetAllDepartmentsQuery(undefined);
    const { data: desData } = useGetAllDesignationsQuery(undefined);
    const { data: branchData } = useGetAllBranchesQuery(undefined);

    const departmentsCount = depData?.departments?.length || 0;
    const designationsCount = desData?.designations?.length || 0;
    const branchesCount = branchData?.branches?.length || 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Organization Structure</h1>
                <p className="text-sm text-muted-foreground">
                    Manage your company departments, employee designations, and branch locations.
                </p>
            </div>

            {/* Quick Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-xl text-primary">
                            <Building className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Departments
                            </p>
                            <h3 className="text-2xl font-bold tracking-tight">{departmentsCount}</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
                            <Briefcase className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Designations
                            </p>
                            <h3 className="text-2xl font-bold tracking-tight">{designationsCount}</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
                            <MapPin className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Branches
                            </p>
                            <h3 className="text-2xl font-bold tracking-tight">{branchesCount}</h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Tabs */}
            <Tabs defaultValue="departments" className="w-full space-y-4">
                <TabsList className="grid w-full sm:w-[400px] grid-cols-3">
                    <TabsTrigger value="departments">Departments</TabsTrigger>
                    <TabsTrigger value="designations">Designations</TabsTrigger>
                    <TabsTrigger value="branches">Branches</TabsTrigger>
                </TabsList>

                <TabsContent value="departments" className="pt-2">
                    <DepartmentTab />
                </TabsContent>

                <TabsContent value="designations" className="pt-2">
                    <DesignationTab />
                </TabsContent>

                <TabsContent value="branches" className="pt-2">
                    <BranchTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}
