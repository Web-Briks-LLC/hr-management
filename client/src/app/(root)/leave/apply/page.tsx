'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '@/lib/auth-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useDropzone } from 'react-dropzone';
import {
    useApplyForLeaveMutation,
    useGetLeaveBalanceQuery,
    useGetMyLeaveApplicationsQuery,
    useLazyCalculateWorkingDaysQuery,
    useCancelLeaveApplicationMutation,
    useUploadMedicalDocumentMutation,
} from '@/redux/features/leave/leaveApi';
import { useGetStaffsQuery } from '@/redux/features/staff/staffApi';
import type { LeaveType, ILeaveApplication } from '@/types/leave.type';
import { LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS } from '@/types/leave.type';

interface FormData {
    leaveType: LeaveType;
    reason: string;
}

const ADMIN_ROLES = ['admin', 'super_admin', 'hr_admin'];

export default function LeaveApplyPage() {
    const { data: session } = useSession();
    const userRole = session?.user?.role as string | undefined;
    const isAdmin = userRole && ADMIN_ROLES.includes(userRole);

    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();
    const [workingDaysCount, setWorkingDaysCount] = useState(0);
    const [workingDates, setWorkingDates] = useState<string[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedStaffId, setSelectedStaffId] = useState<string>('');

    const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
        defaultValues: {
            leaveType: 'annual',
            reason: '',
        },
    });

    const leaveType = watch('leaveType');

    // Fetch staff list for admin
    const { data: staffsData } = useGetStaffsQuery({ limit: 200 }, { skip: !isAdmin });
    const staffs = staffsData?.data || [];

    const { data: balanceData, isLoading: isLoadingBalance } = useGetLeaveBalanceQuery();
    const { data: myApplicationsData, isLoading: isLoadingApplications } = useGetMyLeaveApplicationsQuery({ limit: 10 });
    const [calculateWorkingDays] = useLazyCalculateWorkingDaysQuery();
    const [applyForLeave, { isLoading: isApplying }] = useApplyForLeaveMutation();
    const [cancelApplication, { isLoading: isCancelling }] = useCancelLeaveApplicationMutation();
    const [uploadDocument, { isLoading: isUploading }] = useUploadMedicalDocumentMutation();

    const balance = balanceData?.data;
    const myApplications = myApplicationsData?.data || [];

    // Calculate working days when dates change
    useEffect(() => {
        const fetchWorkingDays = async () => {
            if (startDate && endDate) {
                try {
                    const result = await calculateWorkingDays({
                        startDate: format(startDate, 'yyyy-MM-dd'),
                        endDate: format(endDate, 'yyyy-MM-dd'),
                    }).unwrap();
                    setWorkingDaysCount(result.data.count);
                    setWorkingDates(result.data.dates);
                } catch (error) {
                    console.error('Error calculating working days:', error);
                }
            } else {
                setWorkingDaysCount(0);
                setWorkingDates([]);
            }
        };

        fetchWorkingDays();
    }, [startDate, endDate, calculateWorkingDays]);

    const handleStartDateSelect = (date: Date | undefined) => {
        setStartDate(date);
        // If end date is before start date, reset it
        if (date && endDate && endDate < date) {
            setEndDate(undefined);
        }
    };

    const handleEndDateSelect = (date: Date | undefined) => {
        setEndDate(date);
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles && acceptedFiles.length > 0) {
            setSelectedFile(acceptedFiles[0]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
        },
        maxFiles: 1,
        maxSize: 5 * 1024 * 1024, // 5MB
    });

    const onSubmit = async (data: FormData) => {
        if (!startDate || !endDate) {
            toast.error('Please select start and end dates');
            return;
        }

        if (workingDaysCount === 0) {
            toast.error('No working days in the selected range');
            return;
        }

        // Admin must select a staff member
        if (isAdmin && !selectedStaffId) {
            toast.error('Please select a staff member');
            return;
        }

        // Check balance (only for non-admin applying for themselves)
        if (!isAdmin) {
            if (data.leaveType === 'annual' && balance && workingDaysCount > balance.annualLeaveRemaining) {
                toast.error(`Insufficient annual leave. Remaining: ${balance.annualLeaveRemaining}`);
                return;
            }

            if (data.leaveType === 'sick' && balance && workingDaysCount > balance.sickLeaveRemaining) {
                toast.error(`Insufficient sick leave. Remaining: ${balance.sickLeaveRemaining}`);
                return;
            }
        }

        try {
            const payload: any = {
                leaveType: data.leaveType,
                startDate: format(startDate, 'yyyy-MM-dd'),
                endDate: format(endDate, 'yyyy-MM-dd'),
                reason: data.reason,
            };

            // Add staffId if admin is applying on behalf of someone
            if (isAdmin && selectedStaffId) {
                payload.staffId = selectedStaffId;
            }

            const result = await applyForLeave(payload).unwrap();

            // If sick leave and file selected, upload document
            if (data.leaveType === 'sick' && selectedFile && result.data._id) {
                try {
                    await uploadDocument({
                        id: result.data._id,
                        file: selectedFile,
                    }).unwrap();
                    toast.success('Medical document uploaded successfully');
                } catch (uploadError: any) {
                    console.error('Document upload failed:', uploadError);
                    toast.error('Application submitted but document upload failed. Please contact HR.');
                }
            }

            toast.success('Leave application submitted! It will expire at 11:59 PM today if not approved.');
            reset();
            setStartDate(undefined);
            setEndDate(undefined);
            setSelectedFile(null);
            setSelectedStaffId('');
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to submit application');
        }
    };

    const handleCancel = async (id: string) => {
        try {
            await cancelApplication(id).unwrap();
            toast.success('Leave application cancelled');
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to cancel application');
        }
    };

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'approved':
                return 'default';
            case 'partially_approved':
                return 'secondary';
            case 'pending':
                return 'outline';
            case 'rejected':
            case 'expired':
            case 'revoked':
                return 'destructive';
            default:
                return 'outline';
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Leave Application</h1>
                <p className="text-muted-foreground">
                    {isAdmin ? 'Apply for leave on behalf of staff members' : 'Apply for leave and track your applications'}
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Leave Balance Cards - Only show for non-admin */}
                {!isAdmin && (
                    <div className="lg:col-span-1 space-y-4">
                        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg">Annual Leave</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isLoadingBalance ? (
                                    <Skeleton className="h-10 w-20" />
                                ) : (
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-bold text-blue-600">
                                            {balance?.annualLeaveRemaining || 0}
                                        </span>
                                        <span className="text-muted-foreground">
                                            / {balance?.annualLeaveTotal || 12} remaining
                                        </span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg">Sick Leave</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isLoadingBalance ? (
                                    <Skeleton className="h-10 w-20" />
                                ) : (
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-bold text-orange-600">
                                            {balance?.sickLeaveRemaining || 0}
                                        </span>
                                        <span className="text-muted-foreground">
                                            / {balance?.sickLeaveTotal || 18} remaining
                                        </span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Application Form */}
                <Card className={isAdmin ? 'lg:col-span-3' : 'lg:col-span-2'}>
                    <CardHeader>
                        <CardTitle>Apply for Leave</CardTitle>
                        <CardDescription>
                            {isAdmin
                                ? 'Select a staff member and submit leave application on their behalf.'
                                : 'Submit your leave application. It must be approved by 11:59 PM today.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            {/* Staff Selection - Only for Admin */}
                            {isAdmin && (
                                <div className="space-y-2">
                                    <Label>Staff Member *</Label>
                                    <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a staff member" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {staffs.map((staff: any) => (
                                                <SelectItem key={staff._id} value={staff._id}>
                                                    {staff.user?.name} ({staff.staffId})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Leave Type */}
                            <div className="space-y-2">
                                <Label>Leave Type</Label>
                                <Select
                                    value={leaveType}
                                    onValueChange={(value) => setValue('leaveType', value as LeaveType)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="annual">Annual Leave</SelectItem>
                                        <SelectItem value="sick">Sick Leave</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Date Range */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Start Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    'w-full justify-start text-left font-normal',
                                                    !startDate && 'text-muted-foreground'
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {startDate ? format(startDate, 'PPP') : 'Select date'}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={startDate}
                                                onSelect={handleStartDateSelect}
                                                disabled={(date) => date < new Date()}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="space-y-2">
                                    <Label>End Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    'w-full justify-start text-left font-normal',
                                                    !endDate && 'text-muted-foreground'
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {endDate ? format(endDate, 'PPP') : 'Select date'}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={endDate}
                                                onSelect={handleEndDateSelect}
                                                disabled={(date) => date < (startDate || new Date())}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            {/* Working Days Info */}
                            {workingDaysCount > 0 && (
                                <div className="p-4 bg-muted/50 rounded-lg">
                                    <p className="font-medium">
                                        Working Days: <span className="text-primary">{workingDaysCount}</span>
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        (Weekends based on your shift are excluded)
                                    </p>
                                </div>
                            )}

                            {/* Document Upload for Sick Leave */}
                            {leaveType === 'sick' && (
                                <div className="space-y-4">
                                    <Label>Medical Document (Optional)</Label>
                                    <div
                                        {...getRootProps()}
                                        className={cn(
                                            'border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors',
                                            isDragActive
                                                ? 'border-primary bg-primary/5'
                                                : 'border-muted-foreground/25 hover:border-primary/50'
                                        )}
                                    >
                                        <input {...getInputProps()} />
                                        {selectedFile ? (
                                            <div className="flex items-center gap-2 text-sm text-primary font-medium">
                                                <div className="bg-primary/10 p-2 rounded-full">
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        width="24"
                                                        height="24"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        className="h-4 w-4"
                                                    >
                                                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                                        <polyline points="14 2 14 8 20 8" />
                                                    </svg>
                                                </div>
                                                {selectedFile.name}
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 ml-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedFile(null);
                                                    }}
                                                >
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        width="24"
                                                        height="24"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        className="h-4 w-4"
                                                    >
                                                        <path d="M18 6 6 18" />
                                                        <path d="m6 6 12 12" />
                                                    </svg>
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="bg-muted p-2 rounded-full mb-2">
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        width="24"
                                                        height="24"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        className="h-6 w-6 text-muted-foreground"
                                                    >
                                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                        <polyline points="17 8 12 3 7 8" />
                                                        <line x1="12" x2="12" y1="3" y2="15" />
                                                    </svg>
                                                </div>
                                                <p className="text-sm font-medium">
                                                    {isDragActive
                                                        ? 'Drop the file here'
                                                        : 'Drag & drop file here, or click to select'}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Supports: PDF, JPG, PNG (Max 5MB)
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Reason */}
                            <div className="space-y-2">
                                <Label>Reason</Label>
                                <Textarea
                                    {...register('reason', { required: 'Reason is required' })}
                                    placeholder="Please provide the reason for your leave..."
                                    rows={3}
                                />
                                {errors.reason && (
                                    <p className="text-sm text-destructive">{errors.reason.message}</p>
                                )}
                            </div>

                            <Button type="submit" disabled={isApplying || isUploading || !startDate || !endDate} className="w-full">
                                {isApplying || isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isApplying ? 'Submitting Application...' : isUploading ? 'Uploading Document...' : 'Submit Leave Application'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>

            {/* My Applications - Only show for non-admin */}
            {!isAdmin && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            My Leave Applications
                        </CardTitle>
                        <CardDescription>Track your leave requests and their current status</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoadingApplications ? (
                            <div className="space-y-3">
                                <Skeleton className="h-20 w-full" />
                                <Skeleton className="h-20 w-full" />
                                <Skeleton className="h-20 w-full" />
                            </div>
                        ) : myApplications.length === 0 ? (
                            <div className="text-center py-12">
                                <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="mt-2 text-muted-foreground">No leave applications yet</p>
                                <p className="text-sm text-muted-foreground">Your leave requests will appear here</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {myApplications.map((app: ILeaveApplication) => (
                                    <div key={app._id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <Badge variant={getStatusBadgeVariant(app.status)} className="text-xs">
                                                        {LEAVE_STATUS_LABELS[app.status]}
                                                    </Badge>
                                                    <span className="text-sm font-medium">{LEAVE_TYPE_LABELS[app.leaveType]}</span>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <CalendarIcon className="h-3.5 w-3.5" />
                                                        {format(new Date(app.startDate), 'MMM dd')} - {format(new Date(app.endDate), 'MMM dd, yyyy')}
                                                    </span>
                                                    <span className="font-medium text-foreground">{app.requestedDates.length} day(s)</span>
                                                </div>

                                                {/* Status Details */}
                                                {app.status === 'approved' && app.approvedDates && (
                                                    <p className="text-xs text-green-600">✓ Approved: {app.approvedDates.length} day(s)</p>
                                                )}
                                                {app.status === 'partially_approved' && (
                                                    <div className="flex gap-3 text-xs">
                                                        {app.approvedDates?.length > 0 && <span className="text-green-600">✓ Approved: {app.approvedDates.length}</span>}
                                                        {app.paidLeaveDates?.length > 0 && <span className="text-blue-600">💰 Paid: {app.paidLeaveDates.length}</span>}
                                                        {app.rejectedDates?.length > 0 && <span className="text-red-600">✗ Rejected: {app.rejectedDates.length}</span>}
                                                    </div>
                                                )}
                                                {app.status === 'rejected' && app.commentByApprover && (
                                                    <p className="text-xs text-red-600">Reason: {app.commentByApprover}</p>
                                                )}
                                                {app.status === 'revoked' && (
                                                    <p className="text-xs text-orange-600">⚠️ This leave was revoked. Balance restored.</p>
                                                )}

                                                <p className="text-xs text-muted-foreground">
                                                    Applied on {format(new Date(app.createdAt), 'MMM dd, yyyy')}
                                                    {app.approvedAt && ` • ${app.status === 'rejected' ? 'Rejected' : 'Approved'} on ${format(new Date(app.approvedAt), 'MMM dd')}`}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {app.status === 'pending' && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleCancel(app._id)}
                                                        disabled={isCancelling}
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        Cancel
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Reason */}
                                        {app.reason && (
                                            <div className="mt-3 pt-3 border-t">
                                                <p className="text-xs text-muted-foreground">
                                                    <span className="font-medium">Your reason:</span> {app.reason}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
