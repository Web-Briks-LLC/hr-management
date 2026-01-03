'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import {
    Calendar as CalendarIcon,
    Loader2,
    FileCheck,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Upload,
    X,
    CalendarDays,
    Briefcase,
    ThermometerSun,
} from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
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

            toast.success('Leave application submitted! Admin will review it shortly.');
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

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'approved':
                return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case 'partially_approved':
                return <CheckCircle2 className="h-4 w-4 text-yellow-500" />;
            case 'pending':
                return <Clock className="h-4 w-4 text-blue-500" />;
            case 'rejected':
            case 'expired':
            case 'revoked':
                return <XCircle className="h-4 w-4 text-red-500" />;
            default:
                return <AlertCircle className="h-4 w-4" />;
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

    // Calculate progress percentages
    const annualProgress = balance ? ((balance.annualLeaveUsed / balance.annualLeaveTotal) * 100) : 0;
    const sickProgress = balance ? ((balance.sickLeaveUsed / balance.sickLeaveTotal) * 100) : 0;

    return (
        <div className="container mx-auto p-6 max-w-7xl">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Leave Application</h1>
                <p className="text-muted-foreground mt-1">
                    {isAdmin ? 'Apply for leave on behalf of staff members' : 'Request time off and track your applications'}
                </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Left Column - Balance & Form */}
                <div className="xl:col-span-2 space-y-6">
                    {/* Leave Balance Cards - Only show for non-admin */}
                    {!isAdmin && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Annual Leave Card */}
                            <Card className="relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full" />
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                                    <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <span className="font-medium">Annual Leave</span>
                                            </div>
                                            {isLoadingBalance ? (
                                                <Skeleton className="h-10 w-24" />
                                            ) : (
                                                <>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                                                            {balance?.annualLeaveRemaining || 0}
                                                        </span>
                                                        <span className="text-muted-foreground text-sm">
                                                            / {balance?.annualLeaveTotal || 12} days left
                                                        </span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Progress value={annualProgress} className="h-2" />
                                                        <p className="text-xs text-muted-foreground">
                                                            {balance?.annualLeaveUsed || 0} days used this year
                                                        </p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Sick Leave Card */}
                            <Card className="relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 bg-gradient-to-br from-orange-500/20 to-transparent rounded-full" />
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                                                    <ThermometerSun className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                                </div>
                                                <span className="font-medium">Sick Leave</span>
                                            </div>
                                            {isLoadingBalance ? (
                                                <Skeleton className="h-10 w-24" />
                                            ) : (
                                                <>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-4xl font-bold text-orange-600 dark:text-orange-400">
                                                            {balance?.sickLeaveRemaining || 0}
                                                        </span>
                                                        <span className="text-muted-foreground text-sm">
                                                            / {balance?.sickLeaveTotal || 14} days left
                                                        </span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Progress value={sickProgress} className="h-2 [&>div]:bg-orange-500" />
                                                        <p className="text-xs text-muted-foreground">
                                                            {balance?.sickLeaveUsed || 0} days used this year
                                                        </p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Application Form */}
                    <Card>
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <FileCheck className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Request Leave</CardTitle>
                                    <CardDescription>
                                        {isAdmin
                                            ? 'Select a staff member and submit leave application on their behalf'
                                            : 'Fill in the details below to submit your leave request'}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                {/* Staff Selection - Only for Admin */}
                                {isAdmin && (
                                    <div className="space-y-2">
                                        <Label className="text-base">Staff Member</Label>
                                        <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                                            <SelectTrigger className="h-12">
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

                                {/* Leave Type Selection as Buttons */}
                                <div className="space-y-3">
                                    <Label className="text-base">Leave Type</Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setValue('leaveType', 'annual')}
                                            className={cn(
                                                "p-4 rounded-xl border-2 transition-all duration-200 text-left",
                                                leaveType === 'annual'
                                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                                    : "border-border hover:border-blue-300 hover:bg-muted/50"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "p-2 rounded-lg",
                                                    leaveType === 'annual' ? "bg-blue-100 dark:bg-blue-800" : "bg-muted"
                                                )}>
                                                    <Briefcase className={cn(
                                                        "h-5 w-5",
                                                        leaveType === 'annual' ? "text-blue-600" : "text-muted-foreground"
                                                    )} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold">Annual Leave</p>
                                                    <p className="text-sm text-muted-foreground">Vacation, personal days</p>
                                                </div>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setValue('leaveType', 'sick')}
                                            className={cn(
                                                "p-4 rounded-xl border-2 transition-all duration-200 text-left",
                                                leaveType === 'sick'
                                                    ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
                                                    : "border-border hover:border-orange-300 hover:bg-muted/50"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "p-2 rounded-lg",
                                                    leaveType === 'sick' ? "bg-orange-100 dark:bg-orange-800" : "bg-muted"
                                                )}>
                                                    <ThermometerSun className={cn(
                                                        "h-5 w-5",
                                                        leaveType === 'sick' ? "text-orange-600" : "text-muted-foreground"
                                                    )} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold">Sick Leave</p>
                                                    <p className="text-sm text-muted-foreground">Medical reasons</p>
                                                </div>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Date Range */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-base">From</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        'w-full h-12 justify-start text-left font-normal',
                                                        !startDate && 'text-muted-foreground'
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {startDate ? format(startDate, 'PPP') : 'Select start date'}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
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
                                        <Label className="text-base">To</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        'w-full h-12 justify-start text-left font-normal',
                                                        !endDate && 'text-muted-foreground'
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {endDate ? format(endDate, 'PPP') : 'Select end date'}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
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
                                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20">
                                        <div className="p-3 bg-primary/10 rounded-full">
                                            <CalendarDays className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-lg">
                                                {workingDaysCount} Working {workingDaysCount === 1 ? 'Day' : 'Days'}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                Weekends based on your shift are excluded
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Document Upload for Sick Leave */}
                                {leaveType === 'sick' && (
                                    <div className="space-y-3">
                                        <Label className="text-base">Medical Document (Optional)</Label>
                                        <div
                                            {...getRootProps()}
                                            className={cn(
                                                'border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200',
                                                isDragActive
                                                    ? 'border-primary bg-primary/5 scale-[1.02]'
                                                    : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
                                            )}
                                        >
                                            <input {...getInputProps()} />
                                            {selectedFile ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                                                        <FileCheck className="h-6 w-6 text-green-600" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="font-medium">{selectedFile.name}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {(selectedFile.size / 1024).toFixed(1)} KB
                                                        </p>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="ml-2 h-8 w-8 text-destructive hover:bg-destructive/10"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedFile(null);
                                                        }}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="p-4 bg-muted rounded-full mb-3">
                                                        <Upload className="h-8 w-8 text-muted-foreground" />
                                                    </div>
                                                    <p className="font-medium">
                                                        {isDragActive ? 'Drop the file here' : 'Drop file here or click to upload'}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        PDF, JPG, PNG (Max 5MB)
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Reason */}
                                <div className="space-y-2">
                                    <Label className="text-base">Reason</Label>
                                    <Textarea
                                        {...register('reason', { required: 'Please provide a reason for your leave' })}
                                        placeholder="Please describe the reason for your leave request..."
                                        className="min-h-[120px] resize-none"
                                    />
                                    {errors.reason && (
                                        <p className="text-sm text-destructive flex items-center gap-1">
                                            <AlertCircle className="h-3.5 w-3.5" />
                                            {errors.reason.message}
                                        </p>
                                    )}
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isApplying || isUploading || !startDate || !endDate}
                                    className="w-full h-12 text-base font-semibold"
                                    size="lg"
                                >
                                    {isApplying || isUploading ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            {isApplying ? 'Submitting...' : 'Uploading...'}
                                        </>
                                    ) : (
                                        <>
                                            <FileCheck className="mr-2 h-5 w-5" />
                                            Submit Leave Request
                                        </>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - My Applications */}
                {!isAdmin && (
                    <div className="xl:col-span-1">
                        <Card className="sticky top-6">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <Clock className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">My Applications</CardTitle>
                                        <CardDescription>Recent leave requests</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {isLoadingApplications ? (
                                    <div className="space-y-3">
                                        <Skeleton className="h-24 w-full rounded-xl" />
                                        <Skeleton className="h-24 w-full rounded-xl" />
                                        <Skeleton className="h-24 w-full rounded-xl" />
                                    </div>
                                ) : myApplications.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-4">
                                            <CalendarDays className="h-10 w-10 text-muted-foreground" />
                                        </div>
                                        <p className="font-medium text-muted-foreground">No applications yet</p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Your leave requests will appear here
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                                        {myApplications.map((app: ILeaveApplication) => (
                                            <div
                                                key={app._id}
                                                className="p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
                                            >
                                                <div className="flex items-start justify-between gap-2 mb-3">
                                                    <div className="flex items-center gap-2">
                                                        {getStatusIcon(app.status)}
                                                        <Badge variant={getStatusBadgeVariant(app.status)} className="text-xs">
                                                            {LEAVE_STATUS_LABELS[app.status]}
                                                        </Badge>
                                                    </div>
                                                    <Badge variant="outline" className="text-xs font-normal">
                                                        {LEAVE_TYPE_LABELS[app.leaveType]}
                                                    </Badge>
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                                        <span>
                                                            {format(new Date(app.startDate), 'MMM dd')} - {format(new Date(app.endDate), 'MMM dd, yyyy')}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm font-medium">
                                                        {app.requestedDates.length} day{app.requestedDates.length > 1 ? 's' : ''}
                                                    </p>
                                                </div>

                                                {/* Status specific info */}
                                                {app.status === 'rejected' && app.commentByApprover && (
                                                    <p className="text-xs text-destructive mt-2 p-2 bg-destructive/10 rounded-lg">
                                                        Reason: {app.commentByApprover}
                                                    </p>
                                                )}

                                                {app.status === 'pending' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleCancel(app._id)}
                                                        disabled={isCancelling}
                                                        className="w-full mt-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    >
                                                        Cancel Request
                                                    </Button>
                                                )}

                                                <p className="text-xs text-muted-foreground mt-2">
                                                    Applied {format(new Date(app.createdAt), 'MMM dd, yyyy')}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
