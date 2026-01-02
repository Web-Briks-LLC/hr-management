'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { format, addDays, differenceInDays } from 'date-fns';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
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
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    useApplyForLeaveMutation,
    useGetLeaveBalanceQuery,
    useGetMyLeaveApplicationsQuery,
    useLazyCalculateWorkingDaysQuery,
    useCancelLeaveApplicationMutation,
    useUploadMedicalDocumentMutation,
} from '@/redux/features/leave/leaveApi';
import type { LeaveType, ILeaveApplication } from '@/types/leave.type';
import { LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS } from '@/types/leave.type';

interface FormData {
    leaveType: LeaveType;
    reason: string;
}

export default function LeaveApplyPage() {
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();
    const [workingDaysCount, setWorkingDaysCount] = useState(0);
    const [workingDates, setWorkingDates] = useState<string[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
        defaultValues: {
            leaveType: 'annual',
            reason: '',
        },
    });

    const leaveType = watch('leaveType');

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

        // Check balance
        if (data.leaveType === 'annual' && balance && workingDaysCount > balance.annualLeaveRemaining) {
            toast.error(`Insufficient annual leave. Remaining: ${balance.annualLeaveRemaining}`);
            return;
        }

        if (data.leaveType === 'sick' && balance && workingDaysCount > balance.sickLeaveRemaining) {
            toast.error(`Insufficient sick leave. Remaining: ${balance.sickLeaveRemaining}`);
            return;
        }

        try {
            const result = await applyForLeave({
                leaveType: data.leaveType,
                startDate: format(startDate, 'yyyy-MM-dd'),
                endDate: format(endDate, 'yyyy-MM-dd'),
                reason: data.reason,
            }).unwrap();

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
                <p className="text-muted-foreground">Apply for leave and track your applications</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Leave Balance Cards */}
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

                {/* Application Form */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Apply for Leave</CardTitle>
                        <CardDescription>
                            Submit your leave application. It must be approved by 11:59 PM today.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

            {/* My Applications */}
            <Card>
                <CardHeader>
                    <CardTitle>My Leave Applications</CardTitle>
                    <CardDescription>Recent leave applications and their status</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingApplications ? (
                        <div className="space-y-2">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    ) : myApplications.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No leave applications found</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Dates</TableHead>
                                    <TableHead>Days</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Applied On</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {myApplications.map((app: ILeaveApplication) => (
                                    <TableRow key={app._id}>
                                        <TableCell>{LEAVE_TYPE_LABELS[app.leaveType]}</TableCell>
                                        <TableCell>
                                            {format(new Date(app.startDate), 'MMM dd')} - {format(new Date(app.endDate), 'MMM dd, yyyy')}
                                        </TableCell>
                                        <TableCell>{app.requestedDates.length}</TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusBadgeVariant(app.status)}>
                                                {LEAVE_STATUS_LABELS[app.status]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{format(new Date(app.createdAt), 'MMM dd, yyyy')}</TableCell>
                                        <TableCell>
                                            {app.status === 'pending' && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleCancel(app._id)}
                                                    disabled={isCancelling}
                                                >
                                                    Cancel
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
