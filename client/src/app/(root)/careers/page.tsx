'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
    Briefcase,
    Trash2,
    Users,
    FileText,
    Download,
    Eye,
    Filter,
    UserCheck,
    UserX,
    Clock,
    CheckCircle,
    Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    useGetAllApplicationsQuery,
    useDeleteApplicationMutation,
    useGetApplicationsStatsQuery,
    useUpdateApplicationStatusMutation,
} from '@/redux/features/career/careerApi';
import { ApplicationDetailsModal } from '@/components/careers/ApplicationDetailsModal';
import type { IJobApplication, ApplicationStatus } from '@/types/career.type';
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS } from '@/types/career.type';
import { toast } from 'sonner';

// Inline status select component
function StatusSelect({ 
    application, 
    onStatusChange 
}: { 
    application: IJobApplication; 
    onStatusChange: (id: string, status: ApplicationStatus) => Promise<void>;
}) {
    const [isUpdating, setIsUpdating] = useState(false);

    const handleChange = async (newStatus: string) => {
        if (newStatus === application.status) return;
        setIsUpdating(true);
        try {
            await onStatusChange(application._id, newStatus as ApplicationStatus);
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="relative">
            <Select 
                value={application.status} 
                onValueChange={handleChange}
                disabled={isUpdating}
            >
                <SelectTrigger className={`w-[130px] h-8 text-xs ${APPLICATION_STATUS_COLORS[application.status]}`}>
                    {isUpdating ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                        <SelectValue />
                    )}
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="pending">
                        <span className="flex items-center gap-2">
                            <Clock className="h-3 w-3" /> Pending
                        </span>
                    </SelectItem>
                    <SelectItem value="reviewed">
                        <span className="flex items-center gap-2">
                            <FileText className="h-3 w-3" /> Reviewed
                        </span>
                    </SelectItem>
                    <SelectItem value="shortlisted">
                        <span className="flex items-center gap-2">
                            <UserCheck className="h-3 w-3 text-green-500" /> Shortlisted
                        </span>
                    </SelectItem>
                    <SelectItem value="rejected">
                        <span className="flex items-center gap-2">
                            <UserX className="h-3 w-3 text-red-500" /> Rejected
                        </span>
                    </SelectItem>
                    <SelectItem value="hired">
                        <span className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-purple-500" /> Hired
                        </span>
                    </SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}

export default function CareersPage() {
    const [applicationFilter, setApplicationFilter] = useState<string>('all');
    const [experienceFilter, setExperienceFilter] = useState<string>('all');

    // Modals state
    const [selectedApplication, setSelectedApplication] = useState<IJobApplication | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

    // API queries
    const { data: applicationsData, isLoading: applicationsLoading } = useGetAllApplicationsQuery({
        ...(applicationFilter !== 'all' && { status: applicationFilter as ApplicationStatus }),
        ...(experienceFilter !== 'all' && { hasExperience: experienceFilter === 'experienced' }),
    });
    const { data: statsData } = useGetApplicationsStatsQuery();

    // Mutations
    const [deleteApplication] = useDeleteApplicationMutation();
    const [updateStatus] = useUpdateApplicationStatusMutation();

    const applications = applicationsData?.data || [];
    const stats = statsData?.data;

    const totalApplications = stats ? 
        Object.values(stats.byStatus).reduce((a: number, b: number) => a + b, 0) : 0;

    const handleStatusChange = async (id: string, status: ApplicationStatus) => {
        try {
            await updateStatus({ id, status }).unwrap();
            toast.success(`Status updated to ${APPLICATION_STATUS_LABELS[status]}`);
        } catch {
            toast.error('Failed to update status');
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteApplication(deleteTarget).unwrap();
            toast.success('Application deleted successfully');
        } catch {
            toast.error('Failed to delete application');
        } finally {
            setDeleteTarget(null);
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Briefcase className="h-6 w-6" />
                        Careers
                    </h1>
                    <p className="text-muted-foreground">Manage and review job applications</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-blue-500" />
                            <div>
                                <div className="text-2xl font-bold">{totalApplications}</div>
                                <p className="text-xs text-muted-foreground">Total</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-yellow-500" />
                            <div>
                                <div className="text-2xl font-bold">{stats?.byStatus.pending || 0}</div>
                                <p className="text-xs text-muted-foreground">Pending</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-500" />
                            <div>
                                <div className="text-2xl font-bold">{stats?.byStatus.reviewed || 0}</div>
                                <p className="text-xs text-muted-foreground">Reviewed</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                            <UserCheck className="h-5 w-5 text-green-500" />
                            <div>
                                <div className="text-2xl font-bold">{stats?.byStatus.shortlisted || 0}</div>
                                <p className="text-xs text-muted-foreground">Shortlisted</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-purple-500" />
                            <div>
                                <div className="text-2xl font-bold">{stats?.byStatus.hired || 0}</div>
                                <p className="text-xs text-muted-foreground">Hired</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Filter:</span>
                </div>
                <Select value={applicationFilter} onValueChange={setApplicationFilter}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="reviewed">Reviewed</SelectItem>
                        <SelectItem value="shortlisted">Shortlisted</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="hired">Hired</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={experienceFilter} onValueChange={setExperienceFilter}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Experience" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="experienced">Experienced</SelectItem>
                        <SelectItem value="fresher">Fresher</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Applications Table */}
            <Card>
                <CardContent className="p-0">
                    {applicationsLoading ? (
                        <div className="p-6 space-y-4">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="h-16 w-full" />
                            ))}
                        </div>
                    ) : applications.length === 0 ? (
                        <div className="p-12 text-center">
                            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                            <h3 className="text-lg font-medium">No applications yet</h3>
                            <p className="text-muted-foreground text-sm mt-1">
                                Applications will appear here when candidates apply
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Applicant</TableHead>
                                    <TableHead>Position</TableHead>
                                    <TableHead>Experience</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Applied</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {applications.map((app) => (
                                    <TableRow key={app._id}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{app.firstName} {app.lastName}</div>
                                                <div className="text-sm text-muted-foreground">{app.email}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                {app.jobPosition?.title || 'Unknown'}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {app.hasExperience ? 'Experienced' : 'Fresher'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <StatusSelect 
                                                application={app} 
                                                onStatusChange={handleStatusChange}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(app.createdAt), 'MMM dd, yyyy')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setSelectedApplication(app)}
                                                    title="View Details"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    asChild
                                                    title="Download CV"
                                                >
                                                    <a href={app.cvFile?.url} target="_blank" rel="noopener noreferrer">
                                                        <Download className="h-4 w-4" />
                                                    </a>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setDeleteTarget(app._id)}
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Application Details Modal */}
            {selectedApplication && (
                <ApplicationDetailsModal
                    application={selectedApplication}
                    onClose={() => setSelectedApplication(null)}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the application.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
