'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Check, X, RotateCcw, Eye, Loader2 } from 'lucide-react';
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
import {
    useGetLeaveApplicationsQuery,
    useGetPendingLeavesQuery,
    useApproveLeaveMutation,
    useRejectLeaveMutation,
    useRevokeLeaveMutation,
} from '@/redux/features/leave/leaveApi';
import type { ILeaveApplication, LeaveStatus } from '@/types/leave.type';
import { LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS } from '@/types/leave.type';

export default function LeaveManagePage() {
    const [statusFilter, setStatusFilter] = useState<LeaveStatus | 'all'>('all');
    const [selectedApplication, setSelectedApplication] = useState<ILeaveApplication | null>(null);
    const [showApproveDialog, setShowApproveDialog] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [showRevokeDialog, setShowRevokeDialog] = useState(false);
    const [showDetailsDialog, setShowDetailsDialog] = useState(false);
    const [comment, setComment] = useState('');

    const { data: pendingData } = useGetPendingLeavesQuery();
    const { data: applicationsData, isLoading } = useGetLeaveApplicationsQuery(
        statusFilter === 'all' ? { limit: 50 } : { status: statusFilter, limit: 50 }
    );

    const [approveLeave, { isLoading: isApproving }] = useApproveLeaveMutation();
    const [rejectLeave, { isLoading: isRejecting }] = useRejectLeaveMutation();
    const [revokeLeave, { isLoading: isRevoking }] = useRevokeLeaveMutation();

    const pendingCount = pendingData?.count || 0;
    const applications = applicationsData?.data || [];

    const handleApprove = async () => {
        if (!selectedApplication) return;

        try {
            await approveLeave({
                id: selectedApplication._id,
                data: { comment },
            }).unwrap();
            toast.success('Leave approved successfully');
            setShowApproveDialog(false);
            setSelectedApplication(null);
            setComment('');
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to approve leave');
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
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to reject leave');
        }
    };

    const handleRevoke = async () => {
        if (!selectedApplication) return;

        try {
            await revokeLeave({
                id: selectedApplication._id,
                reason: comment,
            }).unwrap();
            toast.success('Leave revoked. Balance has been restored.');
            setShowRevokeDialog(false);
            setSelectedApplication(null);
            setComment('');
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to revoke leave');
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
            case 'cancelled':
                return 'secondary';
            default:
                return 'outline';
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
        setShowRevokeDialog(true);
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

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                        <Label>Filter by Status:</Label>
                        <Select
                            value={statusFilter}
                            onValueChange={(value) => setStatusFilter(value as LeaveStatus | 'all')}
                        >
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

            {/* Applications Table */}
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
                                        <TableCell className="font-medium">
                                            {app.staffId?.userId?.name || 'N/A'}
                                        </TableCell>
                                        <TableCell>{LEAVE_TYPE_LABELS[app.leaveType]}</TableCell>
                                        <TableCell>
                                            {format(new Date(app.startDate), 'MMM dd')} - {format(new Date(app.endDate), 'MMM dd')}
                                        </TableCell>
                                        <TableCell>{app.requestedDates.length}</TableCell>
                                        <TableCell className="max-w-[200px] truncate" title={app.reason}>
                                            {app.reason}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusBadgeVariant(app.status)}>
                                                {LEAVE_STATUS_LABELS[app.status]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{format(new Date(app.createdAt), 'MMM dd, HH:mm')}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openDetailsDialog(app)}
                                                    title="View Details"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                {app.status === 'pending' && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openApproveDialog(app)}
                                                            className="text-green-600 hover:text-green-700"
                                                            title="Approve"
                                                        >
                                                            <Check className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openRejectDialog(app)}
                                                            className="text-red-600 hover:text-red-700"
                                                            title="Reject"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                                {(app.status === 'approved' || app.status === 'partially_approved') && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openRevokeDialog(app)}
                                                        className="text-orange-600 hover:text-orange-700"
                                                        title="Revoke"
                                                    >
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

            {/* Approve Dialog */}
            <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Approve Leave</DialogTitle>
                        <DialogDescription>
                            Approve leave application for {selectedApplication?.staffId?.userId?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="bg-muted p-4 rounded-lg">
                            <p><strong>Type:</strong> {selectedApplication && LEAVE_TYPE_LABELS[selectedApplication.leaveType]}</p>
                            <p><strong>Dates:</strong> {selectedApplication && `${format(new Date(selectedApplication.startDate), 'PPP')} - ${format(new Date(selectedApplication.endDate), 'PPP')}`}</p>
                            <p><strong>Days:</strong> {selectedApplication?.requestedDates.length}</p>
                            <p><strong>Reason:</strong> {selectedApplication?.reason}</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Comment (Optional)</Label>
                            <Textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Add a comment..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleApprove} disabled={isApproving} className="bg-green-600 hover:bg-green-700">
                            {isApproving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Approve
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Leave</DialogTitle>
                        <DialogDescription>
                            Reject leave application for {selectedApplication?.staffId?.userId?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Reason for Rejection</Label>
                            <Textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Please provide a reason..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleReject} disabled={isRejecting} variant="destructive">
                            {isRejecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Reject
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Revoke Dialog */}
            <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Revoke Leave</DialogTitle>
                        <DialogDescription>
                            Revoke approved leave for {selectedApplication?.staffId?.userId?.name}. Leave balance will be restored.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Reason for Revocation</Label>
                            <Textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Please provide a reason..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRevokeDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleRevoke} disabled={isRevoking} className="bg-orange-600 hover:bg-orange-700">
                            {isRevoking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Revoke
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Details Dialog */}
            <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Leave Application Details</DialogTitle>
                    </DialogHeader>
                    {selectedApplication && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-muted-foreground">Employee</Label>
                                    <p className="font-medium">{selectedApplication.staffId?.userId?.name}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Status</Label>
                                    <div>
                                        <Badge variant={getStatusBadgeVariant(selectedApplication.status)}>
                                            {LEAVE_STATUS_LABELS[selectedApplication.status]}
                                        </Badge>
                                    </div>
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
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
