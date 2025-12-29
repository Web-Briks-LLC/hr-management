'use client';

import { useState } from 'react';
import {
    useGetInvitationsQuery,
    useResendInvitationMutation,
    useCancelInvitationMutation,
} from '@/redux/features/invitation/invitationApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    Loader2,
    Mail,
    Trash2,
    Clock,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import InviteEmployeeDialog from './invite-employee-dialog';

export default function InvitationList() {
    const [filter, setFilter] = useState<'all' | 'pending' | 'used' | 'expired'>('all');
    const { data, isLoading, isFetching, refetch } = useGetInvitationsQuery(
        filter === 'all' ? undefined : { isUsed: filter === 'used' }
    );
    const [resendInvitation, { isLoading: isResending }] = useResendInvitationMutation();
    const [cancelInvitation, { isLoading: isCanceling }] = useCancelInvitationMutation();

    const handleResend = async (id: string) => {
        try {
            await resendInvitation(id).unwrap();
            toast.success('Invitation resent successfully!');
            refetch();
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to resend invitation');
        }
    };

    const handleCancel = async (id: string) => {
        if (!confirm('Are you sure you want to cancel this invitation?')) return;

        try {
            await cancelInvitation(id).unwrap();
            toast.success('Invitation cancelled successfully!');
            refetch();
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to cancel invitation');
        }
    };

    const invitations = data?.data || [];
    const pendingInvitations = invitations.filter(
        (inv) => !inv.isUsed && new Date(inv.expiresAt) > new Date()
    );
    const usedInvitations = invitations.filter((inv) => inv.isUsed);
    const expiredInvitations = invitations.filter(
        (inv) => !inv.isUsed && new Date(inv.expiresAt) <= new Date()
    );

    const getFilteredInvitations = () => {
        switch (filter) {
            case 'pending':
                return pendingInvitations;
            case 'used':
                return usedInvitations;
            case 'expired':
                return expiredInvitations;
            default:
                return invitations;
        }
    };

    const getStatusBadge = (invitation: any) => {
        if (invitation.isUsed) {
            return (
                <Badge variant="default" className="gap-1 bg-emerald-500 hover:bg-emerald-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Accepted
                </Badge>
            );
        }
        if (new Date(invitation.expiresAt) <= new Date()) {
            return (
                <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    Expired
                </Badge>
            );
        }
        return (
            <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-500">
                <Clock className="h-3 w-3" />
                Pending
            </Badge>
        );
    };

    const getRoleBadge = (role: string) => {
        const roleColors: Record<string, string> = {
            super_admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
            admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
            hr_manager: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
            team_leader: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
            staff: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
        };

        return (
            <Badge variant="outline" className={`font-medium ${roleColors[role] || ''}`}>
                {role.replace('_', ' ')}
            </Badge>
        );
    };

    const renderTable = (invitations: any[]) => (
        <div className="rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Employee Details</TableHead>
                        <TableHead className="font-semibold">Role & Salary</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Expires</TableHead>
                        <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {invitations.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-32 text-center">
                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                    <Mail className="h-8 w-8 opacity-50" />
                                    <p>No invitations found</p>
                                    <p className="text-sm">
                                        Click &quot;Invite Employee&quot; to send a new invitation
                                    </p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        invitations.map((invitation) => (
                            <TableRow key={invitation._id} className="hover:bg-muted/30">
                                <TableCell>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-medium">{invitation.email}</span>
                                        <span className="text-sm text-muted-foreground">
                                            {invitation.designation}
                                            {invitation.department && ` • ${invitation.department}`}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1.5">
                                        {getRoleBadge(invitation.role)}
                                        <span className="text-sm font-medium">
                                            ৳{invitation.salary.toLocaleString()}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>{getStatusBadge(invitation)}</TableCell>
                                <TableCell>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="text-sm cursor-help">
                                                    {new Date(invitation.expiresAt) > new Date()
                                                        ? formatDistanceToNow(new Date(invitation.expiresAt), {
                                                            addSuffix: true,
                                                        })
                                                        : 'Expired'}
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                {format(new Date(invitation.expiresAt), 'PPpp')}
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                        {!invitation.isUsed && (
                                            <>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() =>
                                                                    handleResend(invitation._id)
                                                                }
                                                                disabled={isResending}
                                                                className="h-8 w-8"
                                                            >
                                                                <RefreshCw className={`h-4 w-4 ${isResending ? 'animate-spin' : ''}`} />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Resend invitation</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() =>
                                                                    handleCancel(invitation._id)
                                                                }
                                                                disabled={isCanceling}
                                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Cancel invitation</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-16">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Loading invitations...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Manage Invitations</CardTitle>
                        <CardDescription className="mt-1">
                            Send invitations and track their status
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="h-9 w-9"
                        >
                            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                        </Button>
                        <InviteEmployeeDialog />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Stats Overview */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-lg border p-3 bg-muted/30">
                        <p className="text-2xl font-bold">{invitations.length}</p>
                        <p className="text-xs text-muted-foreground">Total Invitations</p>
                    </div>
                    <div className="rounded-lg border p-3 bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
                        <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                            {pendingInvitations.length}
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-500">Pending</p>
                    </div>
                    <div className="rounded-lg border p-3 bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800">
                        <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                            {usedInvitations.length}
                        </p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-500">Accepted</p>
                    </div>
                    <div className="rounded-lg border p-3 bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800">
                        <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                            {expiredInvitations.length}
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-500">Expired</p>
                    </div>
                </div>

                {/* Filter Tabs */}
                <Tabs
                    defaultValue="all"
                    value={filter}
                    onValueChange={(v: string) => setFilter(v as any)}
                >
                    <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:inline-flex">
                        <TabsTrigger value="all" className="text-xs sm:text-sm">
                            All
                        </TabsTrigger>
                        <TabsTrigger value="pending" className="text-xs sm:text-sm">
                            Pending
                        </TabsTrigger>
                        <TabsTrigger value="used" className="text-xs sm:text-sm">
                            Accepted
                        </TabsTrigger>
                        <TabsTrigger value="expired" className="text-xs sm:text-sm">
                            Expired
                        </TabsTrigger>
                    </TabsList>

                    <div className="mt-4">{renderTable(getFilteredInvitations())}</div>
                </Tabs>

                {/* Expired Warning */}
                {expiredInvitations.length > 0 && filter !== 'expired' && (
                    <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800">
                        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-amber-800 dark:text-amber-300">
                                {expiredInvitations.length} expired invitation
                                {expiredInvitations.length > 1 ? 's' : ''}
                            </p>
                            <p className="text-sm text-amber-700 dark:text-amber-400">
                                These invitations need to be resent or cancelled.
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
