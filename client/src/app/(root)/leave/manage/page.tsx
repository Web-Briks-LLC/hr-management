'use client';

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Check, X, RotateCcw, Eye, Loader2, FileText, ExternalLink, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    useGetLeaveApplicationsQuery,
    useGetPendingLeavesQuery,
    useApproveLeaveMutation,
    useRejectLeaveMutation,
    useRevokeLeaveMutation,
} from '@/redux/features/leave/leaveApi';
import type { ILeaveApplication, LeaveStatus } from '@/types/leave.type';
import { LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS } from '@/types/leave.type';

type DateDecision = 'approve' | 'paid' | 'reject';

interface DateSelection {
    date: string;
    decision: DateDecision;
}

export default function LeaveManagePage() {
    const [statusFilter, setStatusFilter] = useState<LeaveStatus | 'all'>('all');
    const [selectedApplication, setSelectedApplication] = useState<ILeaveApplication | null>(null);
    const [showApproveDialog, setShowApproveDialog] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [showRevokeDialog, setShowRevokeDialog] = useState(false);
    const [showDetailsDialog, setShowDetailsDialog] = useState(false);
    const [comment, setComment] = useState('');

    // Approval states
    const [approvalMode, setApprovalMode] = useState<'full' | 'partial'>('full');
    const [dateSelections, setDateSelections] = useState<DateSelection[]>([]);

    // Revoke states
    const [revokeMode, setRevokeMode] = useState<'full' | 'partial'>('full');
    const [datesToRevoke, setDatesToRevoke] = useState<string[]>([]);

    const { data: pendingData } = useGetPendingLeavesQuery();
    const { data: applicationsData, isLoading } = useGetLeaveApplicationsQuery(
        statusFilter === 'all' ? { limit: 50 } : { status: statusFilter, limit: 50 }
    );

    const [approveLeave, { isLoading: isApproving }] = useApproveLeaveMutation();
    const [rejectLeave, { isLoading: isRejecting }] = useRejectLeaveMutation();
    const [revokeLeave, { isLoading: isRevoking }] = useRevokeLeaveMutation();

    const pendingCount = pendingData?.count || 0;
    const applications = applicationsData?.data || [];

    useEffect(() => {
        if (selectedApplication && showApproveDialog) {
            const initialSelections = selectedApplication.requestedDates.map((date) => ({
                date: new Date(date).toISOString(),
                decision: 'approve' as DateDecision,
            }));
            setDateSelections(initialSelections);
            setApprovalMode('full');
        }
    }, [selectedApplication, showApproveDialog]);

    const handleDateDecisionChange = (dateStr: string, decision: DateDecision) => {
        setDateSelections((prev) =>
            prev.map((ds) => (ds.date === dateStr ? { ...ds, decision } : ds))
        );
    };

    const approvedDates = useMemo(
        () => dateSelections.filter((ds) => ds.decision === 'approve').map((ds) => ds.date),
        [dateSelections]
    );

    const paidLeaveDates = useMemo(
        () => dateSelections.filter((ds) => ds.decision === 'paid').map((ds) => ds.date),
        [dateSelections]
    );

    const handleApprove = async () => {
        if (!selectedApplication) return;

        try {
            const payload: { comment?: string; approvedDates?: string[]; paidLeaveDates?: string[] } = {};
            if (comment) payload.comment = comment;

            if (approvalMode === 'partial') {
                payload.approvedDates = approvedDates;
                payload.paidLeaveDates = paidLeaveDates;
            }

            await approveLeave({
                id: selectedApplication._id,
                data: payload,
            }).unwrap();

            toast.success('Leave approved successfully');
            setShowApproveDialog(false);
            setSelectedApplication(null);
            setComment('');
            setApprovalMode('full');
        } catch (error: unknown) {
            const err = error as { data?: { message?: string } };
            toast.error(err?.data?.message || 'Failed to approve leave');
        }
    };

    const handleReject = async () => {
        if (!selectedApplication) return;

        try {
            await rejectLeave({
                id: selectedApplication._id,
                comment,
            }).unwrap();
            toast.success('Leave rejected');
            setShowRejectDialog(false);
            setSelectedApplication(null);
            setComment('');
        } catch (error: unknown) {
            const err = error as { data?: { message?: string } };
            toast.error(err?.data?.message || 'Failed to reject leave');
        }
    };

    const handleRevoke = async () => {
        if (!selectedApplication) return;

        try {
            const payload: { reason?: string; datesToRevoke?: string[] } = {};
            if (comment) payload.reason = comment;
            if (revokeMode === 'partial' && datesToRevoke.length > 0) {
                payload.datesToRevoke = datesToRevoke;
            }

            await revokeLeave({
                id: selectedApplication._id,
                ...payload,
            }).unwrap();

            const msg = revokeMode === 'partial'
                ? `${datesToRevoke.length} day(s) revoked. Balance restored.`
                : 'Leave fully revoked. Balance restored.';
            toast.success(msg);
            setShowRevokeDialog(false);
            setSelectedApplication(null);
            setComment('');
            setRevokeMode('full');
            setDatesToRevoke([]);
        } catch (error: unknown) {
            const err = error as { data?: { message?: string } };
            toast.error(err?.data?.message || 'Failed to revoke leave');
        }
    };

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'approved': return 'default';
            case 'partially_approved': return 'secondary';
            case 'pending': return 'outline';
            case 'rejected':
            case 'expired':
            case 'revoked': return 'destructive';
            case 'cancelled': return 'secondary';
            default: return 'outline';
        }
    };

    const openApproveDialog = (app: ILeaveApplication) => {
        setSelectedApplication(app);
        setComment('');
        setShowApproveDialog(true);
    };

    const openRejectDialog = (app: ILeaveApplication) => {
        setSelectedApplication(app);
        setComment('');
        setShowRejectDialog(true);
    };

    const openRevokeDialog = (app: ILeaveApplication) => {
        setSelectedApplication(app);
        setComment('');
        setRevokeMode('full');
        setDatesToRevoke([]);
        setShowRevokeDialog(true);
    };

    const toggleDateToRevoke = (dateStr: string) => {
        setDatesToRevoke(prev =>
            prev.includes(dateStr)
                ? prev.filter(d => d !== dateStr)
                : [...prev, dateStr]
        );
    };

    const openDetailsDialog = (app: ILeaveApplication) => {
        setSelectedApplication(app);
        setShowDetailsDialog(true);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Leave Management</h1>
                    <p className="text-muted-foreground">Review and manage leave applications</p>
                </div>
                {pendingCount > 0 && (
                    <Badge variant="destructive" className="text-lg px-4 py-2">
                        {pendingCount} Pending
                    </Badge>
                )}
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                        <Label>Filter by Status:</Label>
                        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as LeaveStatus | 'all')}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Applications</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="partially_approved">Partially Approved</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                                <SelectItem value="expired">Expired</SelectItem>
                                <SelectItem value="revoked">Revoked</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Leave Applications</CardTitle>
                    <CardDescription>
                        {statusFilter === 'all' ? 'All leave applications' : `${LEAVE_STATUS_LABELS[statusFilter as LeaveStatus]} applications`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    ) : applications.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No applications found</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Dates</TableHead>
                                    <TableHead>Days</TableHead>
                                    <TableHead>Reason</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Applied</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {applications.map((app: ILeaveApplication) => (
                                    <TableRow key={app._id}>
                                        <TableCell className="font-medium">{app.staffId?.userId?.name || 'N/A'}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {LEAVE_TYPE_LABELS[app.leaveType]}
                                                {app.leaveType === 'sick' && app.medicalDocuments && app.medicalDocuments.length > 0 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        <FileText className="h-3 w-3 mr-1" />
                                                        {app.medicalDocuments.length}
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(app.startDate), 'MMM dd')} - {format(new Date(app.endDate), 'MMM dd')}
                                        </TableCell>
                                        <TableCell>{app.requestedDates.length}</TableCell>
                                        <TableCell className="max-w-[200px] truncate" title={app.reason}>{app.reason}</TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusBadgeVariant(app.status)}>{LEAVE_STATUS_LABELS[app.status]}</Badge>
                                        </TableCell>
                                        <TableCell>{format(new Date(app.createdAt), 'MMM dd, HH:mm')}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => openDetailsDialog(app)} title="View Details">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                {app.status === 'pending' && (
                                                    <>
                                                        <Button variant="ghost" size="icon" onClick={() => openApproveDialog(app)} className="text-green-600 hover:text-green-700" title="Approve">
                                                            <Check className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => openRejectDialog(app)} className="text-red-600 hover:text-red-700" title="Reject">
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                                {(app.status === 'approved' || app.status === 'partially_approved') && (
                                                    <Button variant="ghost" size="icon" onClick={() => openRevokeDialog(app)} className="text-orange-600 hover:text-orange-700" title="Revoke">
                                                        <RotateCcw className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Enhanced Approve Dialog */}
            <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Approve Leave</DialogTitle>
                        <DialogDescription>Approve leave application for {selectedApplication?.staffId?.userId?.name}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="bg-muted p-4 rounded-lg">
                            <p><strong>Type:</strong> {selectedApplication && LEAVE_TYPE_LABELS[selectedApplication.leaveType]}</p>
                            <p><strong>Period:</strong> {selectedApplication && `${format(new Date(selectedApplication.startDate), 'PPP')} - ${format(new Date(selectedApplication.endDate), 'PPP')}`}</p>
                            <p><strong>Total Days:</strong> {selectedApplication?.requestedDates.length}</p>
                            <p><strong>Reason:</strong> {selectedApplication?.reason}</p>
                        </div>

                        <Separator />

                        <div className="space-y-3">
                            <Label className="text-base font-semibold">Approval Mode</Label>
                            <RadioGroup value={approvalMode} onValueChange={(v) => setApprovalMode(v as 'full' | 'partial')}>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="full" id="full" />
                                    <Label htmlFor="full" className="cursor-pointer">Approve All Dates</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="partial" id="partial" />
                                    <Label htmlFor="partial" className="cursor-pointer">Partial Approve (Select dates individually)</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {approvalMode === 'partial' && (
                            <div className="space-y-3">
                                <Label className="text-base font-semibold flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Date Decisions
                                </Label>
                                <ScrollArea className="h-[200px] border rounded-lg p-3">
                                    <div className="space-y-2">
                                        {dateSelections.map((ds) => (
                                            <div key={ds.date} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                                                <span className="font-medium">{format(new Date(ds.date), 'EEE, MMM dd, yyyy')}</span>
                                                <div className="flex items-center gap-4">
                                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                                        <Checkbox checked={ds.decision === 'approve'} onCheckedChange={() => handleDateDecisionChange(ds.date, 'approve')} />
                                                        <span className="text-sm text-green-600">Approve</span>
                                                    </label>
                                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                                        <Checkbox checked={ds.decision === 'paid'} onCheckedChange={() => handleDateDecisionChange(ds.date, 'paid')} />
                                                        <span className="text-sm text-blue-600">Paid Leave</span>
                                                    </label>
                                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                                        <Checkbox checked={ds.decision === 'reject'} onCheckedChange={() => handleDateDecisionChange(ds.date, 'reject')} />
                                                        <span className="text-sm text-red-600">Reject</span>
                                                    </label>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                                <div className="flex gap-4 text-sm">
                                    <span className="text-green-600">✓ Approved: {approvedDates.length}</span>
                                    <span className="text-blue-600">💰 Paid: {paidLeaveDates.length}</span>
                                    <span className="text-red-600">✕ Rejected: {dateSelections.filter(ds => ds.decision === 'reject').length}</span>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Comment (Optional)</Label>
                            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowApproveDialog(false)}>Cancel</Button>
                        <Button onClick={handleApprove} disabled={isApproving || (approvalMode === 'partial' && approvedDates.length === 0 && paidLeaveDates.length === 0)} className="bg-green-600 hover:bg-green-700">
                            {isApproving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {approvalMode === 'full' ? 'Approve All' : 'Approve Selected'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Leave</DialogTitle>
                        <DialogDescription>Reject leave application for {selectedApplication?.staffId?.userId?.name}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Reason for Rejection</Label>
                            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Please provide a reason..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
                        <Button onClick={handleReject} disabled={isRejecting} variant="destructive">
                            {isRejecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Reject
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Enhanced Revoke Dialog */}
            <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg">Revoke Leave</DialogTitle>
                        <DialogDescription className="text-sm">Revoke approved leave for {selectedApplication?.staffId?.userId?.name}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {/* Leave Info Card */}
                        <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <p className="text-xs text-muted-foreground">Leave Type</p>
                                    <p className="font-semibold">{selectedApplication && LEAVE_TYPE_LABELS[selectedApplication.leaveType]}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Approved Days</p>
                                    <p className="font-semibold">{selectedApplication?.approvedDates?.length || 0} days</p>
                                </div>
                            </div>
                        </div>

                        {/* Revoke Mode Selection */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Choose Action</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <div
                                    onClick={() => setRevokeMode('full')}
                                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${revokeMode === 'full'
                                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'
                                        : 'border-muted hover:border-orange-300'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${revokeMode === 'full' ? 'border-orange-500' : 'border-muted'}`}>
                                            {revokeMode === 'full' && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">Revoke All Dates</p>
                                            <p className="text-xs text-muted-foreground">Cancel entire leave</p>
                                        </div>
                                    </div>
                                </div>
                                <div
                                    onClick={() => setRevokeMode('partial')}
                                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${revokeMode === 'partial'
                                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'
                                        : 'border-muted hover:border-orange-300'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${revokeMode === 'partial' ? 'border-orange-500' : 'border-muted'}`}>
                                            {revokeMode === 'partial' && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">Select Specific Dates</p>
                                            <p className="text-xs text-muted-foreground">Choose which days to revoke</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Partial Revoke Date Selection */}
                        {revokeMode === 'partial' && selectedApplication?.approvedDates && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-semibold flex items-center gap-1.5">
                                        <Calendar className="h-4 w-4" />
                                        Select Dates to Revoke
                                    </Label>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => {
                                            if (datesToRevoke.length === selectedApplication.approvedDates.length) {
                                                setDatesToRevoke([]);
                                            } else {
                                                setDatesToRevoke(selectedApplication.approvedDates.map(d => new Date(d).toISOString()));
                                            }
                                        }}
                                    >
                                        {datesToRevoke.length === selectedApplication.approvedDates.length ? 'Deselect All' : 'Select All'}
                                    </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-2 max-h-[180px] overflow-y-auto p-1">
                                    {selectedApplication.approvedDates.map((date) => {
                                        const dateStr = new Date(date).toISOString();
                                        const isSelected = datesToRevoke.includes(dateStr);
                                        return (
                                            <div
                                                key={date}
                                                onClick={() => toggleDateToRevoke(dateStr)}
                                                className={`flex items-center gap-3 p-2.5 rounded-lg border-2 cursor-pointer transition-all ${isSelected
                                                    ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
                                                    : 'border-muted hover:border-red-300 bg-muted/30'
                                                    }`}
                                            >
                                                <Checkbox checked={isSelected} className="h-4 w-4" />
                                                <div>
                                                    <p className={`font-medium text-sm ${isSelected ? 'text-red-700 dark:text-red-400' : ''}`}>
                                                        {format(new Date(date), 'EEE, MMM dd')}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-800">
                                    <span className="text-sm font-medium">Days to Revoke:</span>
                                    <span className="font-bold text-red-600">{datesToRevoke.length} day(s)</span>
                                </div>
                            </div>
                        )}

                        {/* Reason */}
                        <div className="space-y-1">
                            <Label className="text-sm">Reason (Optional)</Label>
                            <Textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Please provide a reason..."
                                className="min-h-[60px]"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setShowRevokeDialog(false)}>Cancel</Button>
                        <Button
                            onClick={handleRevoke}
                            disabled={isRevoking || (revokeMode === 'partial' && datesToRevoke.length === 0)}
                            className="bg-orange-600 hover:bg-orange-700 min-w-[140px]"
                        >
                            {isRevoking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {revokeMode === 'full' ? 'Revoke All' : `Revoke ${datesToRevoke.length} Day(s)`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Details Dialog with Document Viewing */}
            <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Leave Application Details</DialogTitle>
                    </DialogHeader>
                    {selectedApplication && (
                        <ScrollArea className="max-h-[70vh]">
                            <div className="space-y-4 pr-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-muted-foreground">Employee</Label>
                                        <p className="font-medium">{selectedApplication.staffId?.userId?.name}</p>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground">Status</Label>
                                        <div><Badge variant={getStatusBadgeVariant(selectedApplication.status)}>{LEAVE_STATUS_LABELS[selectedApplication.status]}</Badge></div>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground">Leave Type</Label>
                                        <p className="font-medium">{LEAVE_TYPE_LABELS[selectedApplication.leaveType]}</p>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground">Days Requested</Label>
                                        <p className="font-medium">{selectedApplication.requestedDates.length}</p>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground">Start Date</Label>
                                        <p className="font-medium">{format(new Date(selectedApplication.startDate), 'PPP')}</p>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground">End Date</Label>
                                        <p className="font-medium">{format(new Date(selectedApplication.endDate), 'PPP')}</p>
                                    </div>
                                </div>

                                {(selectedApplication.status === 'approved' || selectedApplication.status === 'partially_approved') && (
                                    <div className="space-y-2">
                                        {selectedApplication.approvedDates && selectedApplication.approvedDates.length > 0 && (
                                            <div>
                                                <Label className="text-muted-foreground">Approved Dates ({selectedApplication.approvedDates.length})</Label>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {selectedApplication.approvedDates.map((date) => (
                                                        <Badge key={date} variant="default" className="text-xs">{format(new Date(date), 'MMM dd')}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {selectedApplication.paidLeaveDates && selectedApplication.paidLeaveDates.length > 0 && (
                                            <div>
                                                <Label className="text-muted-foreground">Paid Leave Dates ({selectedApplication.paidLeaveDates.length})</Label>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {selectedApplication.paidLeaveDates.map((date) => (
                                                        <Badge key={date} variant="secondary" className="text-xs bg-blue-100 text-blue-800">{format(new Date(date), 'MMM dd')}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {selectedApplication.rejectedDates && selectedApplication.rejectedDates.length > 0 && (
                                            <div>
                                                <Label className="text-muted-foreground">Rejected Dates ({selectedApplication.rejectedDates.length})</Label>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {selectedApplication.rejectedDates.map((date) => (
                                                        <Badge key={date} variant="destructive" className="text-xs">{format(new Date(date), 'MMM dd')}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <Label className="text-muted-foreground">Reason</Label>
                                    <p className="mt-1 p-3 bg-muted rounded-lg">{selectedApplication.reason}</p>
                                </div>

                                {selectedApplication.commentByApprover && (
                                    <div>
                                        <Label className="text-muted-foreground">Approver Comment</Label>
                                        <p className="mt-1 p-3 bg-muted rounded-lg">{selectedApplication.commentByApprover}</p>
                                    </div>
                                )}

                                {selectedApplication.revokeReason && (
                                    <div>
                                        <Label className="text-muted-foreground">Revoke Reason</Label>
                                        <p className="mt-1 p-3 bg-muted rounded-lg">{selectedApplication.revokeReason}</p>
                                    </div>
                                )}

                                {/* Medical Documents */}
                                {selectedApplication.leaveType === 'sick' && selectedApplication.medicalDocuments && selectedApplication.medicalDocuments.length > 0 && (
                                    <div>
                                        <Label className="text-muted-foreground flex items-center gap-2">
                                            <FileText className="h-4 w-4" />
                                            Medical Documents ({selectedApplication.medicalDocuments.length})
                                        </Label>
                                        <div className="mt-2 space-y-2">
                                            {selectedApplication.medicalDocuments.map((doc, index) => (
                                                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="h-5 w-5 text-blue-600" />
                                                        <div>
                                                            <p className="font-medium text-sm">{doc.fileName || `Document ${index + 1}`}</p>
                                                            {doc.uploadedAt && <p className="text-xs text-muted-foreground">Uploaded: {format(new Date(doc.uploadedAt), 'PPP p')}</p>}
                                                        </div>
                                                    </div>
                                                    <Button variant="outline" size="sm" onClick={() => window.open(doc.url, '_blank')}>
                                                        <ExternalLink className="h-4 w-4 mr-1" />
                                                        View
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <Label className="text-muted-foreground">Applied On</Label>
                                        <p>{format(new Date(selectedApplication.createdAt), 'PPP p')}</p>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground">Expires At</Label>
                                        <p>{format(new Date(selectedApplication.expiresAt), 'PPP p')}</p>
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
