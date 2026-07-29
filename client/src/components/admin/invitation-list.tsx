'use client';

import { useState, useMemo } from 'react';
import {
    useGetInvitationsQuery,
    useResendInvitationMutation,
    useCancelInvitationMutation,
} from '@/redux/features/invitation/invitationApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Mail,
    RefreshCcw,
    AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import InviteEmployeeDialog from './invite-employee-dialog';

// Import modular redesign components
import { InvitationStats } from './invitations/invitation-stats';
import { InvitationToolbar } from './invitations/invitation-toolbar';
import { InvitationsTable } from './invitations/invitations-table';
import { InvitationMobileList } from './invitations/invitation-mobile-card';
import { InvitationPagination } from './invitations/invitation-pagination';
import {
    isInvitationExpired,
    isInvitationPending,
    StatusFilterType,
} from './invitations/types';

export default function InvitationList() {
    const { data, isLoading, isFetching, refetch } = useGetInvitationsQuery(undefined);
    const [resendInvitation, { isLoading: isResending }] = useResendInvitationMutation();
    const [cancelInvitation, { isLoading: isCanceling }] = useCancelInvitationMutation();

    // Filter and search states
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const handleResend = async (id: string) => {
        try {
            await resendInvitation(id).unwrap();
            toast.success('Invitation resent successfully!');
            refetch();
        } catch (err) {
            const error = err as { data?: { message?: string } };
            toast.error(error?.data?.message || 'Failed to resend invitation');
        }
    };

    const handleCancel = async (id: string) => {
        try {
            await cancelInvitation(id).unwrap();
            toast.success('Invitation cancelled successfully!');
            refetch();
        } catch (err) {
            const error = err as { data?: { message?: string } };
            toast.error(error?.data?.message || 'Failed to cancel invitation');
        }
    };

    const invitations = useMemo(() => data?.data || [], [data]);

    // Calculate overall stats based on all invitations
    const stats = useMemo(() => {
        const total = invitations.length;
        const pending = invitations.filter(isInvitationPending).length;
        const accepted = invitations.filter((inv) => inv.isUsed).length;
        const expired = invitations.filter(isInvitationExpired).length;
        return { total, pending, accepted, expired };
    }, [invitations]);

    // Filter invitations based on search query and status filter
    const filteredInvitations = useMemo(() => {
        let result = invitations;

        // Apply status filter
        if (statusFilter === 'pending') {
            result = result.filter(isInvitationPending);
        } else if (statusFilter === 'accepted') {
            result = result.filter((inv) => inv.isUsed);
        } else if (statusFilter === 'expired') {
            result = result.filter(isInvitationExpired);
        }

        // Apply search query (by email, designation, department, or role)
        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (inv) =>
                    inv.email.toLowerCase().includes(query) ||
                    (inv.designation && inv.designation.toLowerCase().includes(query)) ||
                    (inv.department && inv.department.toLowerCase().includes(query)) ||
                    inv.role.toLowerCase().includes(query)
            );
        }

        return result;
    }, [invitations, statusFilter, searchQuery]);

    // Reset filters handler
    const isFiltered = searchQuery !== '' || statusFilter !== 'all';
    const handleResetFilters = () => {
        setSearchQuery('');
        setStatusFilter('all');
        setCurrentPage(1);
    };

    const handleSearchChange = (val: string) => {
        setSearchQuery(val);
        setCurrentPage(1);
    };

    const handleStatusFilterChange = (val: StatusFilterType) => {
        setStatusFilter(val);
        setCurrentPage(1);
    };

    const handlePageSizeChange = (size: number) => {
        setPageSize(size);
        setCurrentPage(1);
    };

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(filteredInvitations.length / pageSize));
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedInvitations = useMemo(() => {
        return filteredInvitations.slice(startIndex, startIndex + pageSize);
    }, [filteredInvitations, startIndex, pageSize]);

    return (
        <div className="space-y-8 p-1">
            {/* Header & Stats Overview (Matching Earnings Layout Exactly) */}
            <div className="flex flex-col gap-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text">
                        Invitations Overview
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Invite team members and manage existing invitations.
                    </p>
                </div>

                <InvitationStats stats={stats} isLoading={isLoading} />
            </div>

            {/* Main Content Area (Matching Recent Earnings Section Card) */}
            <Card className="border-border/60 shadow-md">
                <CardHeader className="pb-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Mail className="h-5 w-5 text-primary" />
                            Invitation Management
                        </CardTitle>
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                className="border-primary text-primary hover:bg-accent hover:text-accent-foreground shadow-xs"
                                onClick={() => refetch()}
                                disabled={isFetching}
                            >
                                <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                            <InviteEmployeeDialog />
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Filters Toolbar */}
                    <InvitationToolbar
                        searchQuery={searchQuery}
                        onSearchChange={handleSearchChange}
                        statusFilter={statusFilter}
                        onStatusFilterChange={handleStatusFilterChange}
                        onReset={handleResetFilters}
                        isFiltered={isFiltered}
                    />

                    {/* Table / Mobile Cards / Empty State */}
                    {isLoading ? (
                        <div className="space-y-3">
                            {[...Array(4)].map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full bg-muted animate-pulse rounded-md" />
                            ))}
                        </div>
                    ) : filteredInvitations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-md border border-border/60">
                            <div className="p-3 bg-muted/50 text-muted-foreground/60 rounded-full mb-3">
                                <Mail className="h-7 w-7 opacity-75" />
                            </div>
                            {isFiltered ? (
                                <>
                                    <h3 className="font-semibold text-foreground text-base">No matches found</h3>
                                    <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                                        No invitations match your current search query or status filter.
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleResetFilters}
                                        className="mt-4 text-xs font-semibold"
                                    >
                                        Reset Filters
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <h3 className="font-semibold text-foreground text-base">No invitations yet</h3>
                                    <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                                        Invite your first team member to get started with your workspace.
                                    </p>
                                    <div className="mt-4">
                                        <InviteEmployeeDialog />
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <>
                            <InvitationsTable
                                invitations={paginatedInvitations}
                                isResending={isResending}
                                isCanceling={isCanceling}
                                onResend={handleResend}
                                onCancel={handleCancel}
                            />
                            <InvitationMobileList
                                invitations={paginatedInvitations}
                                isResending={isResending}
                                isCanceling={isCanceling}
                                onResend={handleResend}
                                onCancel={handleCancel}
                            />
                        </>
                    )}

                    {/* Pagination Footer */}
                    <InvitationPagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={handlePageSizeChange}
                        startIndex={startIndex}
                        totalItems={filteredInvitations.length}
                    />
                </CardContent>
            </Card>

            {/* Expired warning banner */}
            {stats.expired > 0 && statusFilter !== 'expired' && (
                <div className="flex items-start gap-3 p-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
                    <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-semibold text-orange-800 dark:text-orange-400 text-sm">
                            {stats.expired} expired invitation{stats.expired > 1 ? 's' : ''}
                        </h4>
                        <p className="text-xs text-orange-700 dark:text-orange-500 mt-0.5">
                            These invitation links are past their expiration deadline. You can resend them or revoke them to clear up pending records.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
