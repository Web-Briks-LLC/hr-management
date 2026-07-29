'use client';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import type { IInvitation } from '@/types/invitation.type';
import { InvitationStatusBadge } from './invitation-status-badge';
import { InvitationActions } from './invitation-actions';

interface InvitationsTableProps {
    invitations: IInvitation[];
    isResending: boolean;
    isCanceling: boolean;
    onResend: (id: string) => Promise<void>;
    onCancel: (id: string) => Promise<void>;
}

export function InvitationsTable({
    invitations,
    isResending,
    isCanceling,
    onResend,
    onCancel,
}: InvitationsTableProps) {
    const getRoleBadge = (role: string) => {
        const roleColors: Record<string, string> = {
            super_admin: 'bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-400',
            admin: 'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400',
            hr_manager: 'bg-pink-500/10 text-pink-700 border-pink-500/20 dark:text-pink-400',
            team_leader: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20 dark:text-cyan-400',
            staff: 'bg-slate-500/10 text-slate-700 border-slate-500/20 dark:text-slate-400',
        };

        return (
            <Badge
                variant="outline"
                className={`font-semibold capitalize text-[10px] px-2 py-0.5 select-none ${roleColors[role] || ''}`}
            >
                {role.replace('_', ' ')}
            </Badge>
        );
    };

    return (
        <div className="hidden md:block rounded-md border border-border/60 overflow-hidden">
            <Table>
                <TableHeader className="bg-muted/40">
                    <TableRow className="hover:bg-muted/40 border-b-border/60">
                        <TableHead className="font-semibold py-3 pl-4">Member</TableHead>
                        <TableHead className="font-semibold py-3">Role</TableHead>
                        <TableHead className="font-semibold py-3">Salary</TableHead>
                        <TableHead className="font-semibold py-3">Status</TableHead>
                        <TableHead className="font-semibold py-3">Expires</TableHead>
                        <TableHead className="text-right font-semibold py-3 pr-4">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {invitations.map((invitation) => (
                        <TableRow key={invitation._id} className="hover:bg-muted/15 transition-colors border-b last:border-b-0">
                            {/* Member Details */}
                            <TableCell className="py-3 pl-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-8.5 w-8.5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase shrink-0 border border-primary/10 select-none">
                                        {invitation.email.charAt(0)}
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-medium text-foreground text-sm">
                                            {invitation.email}
                                        </span>
                                        <span className="text-xs text-muted-foreground capitalize">
                                            {invitation.designation}
                                            {invitation.department && ` • ${invitation.department}`}
                                        </span>
                                    </div>
                                </div>
                            </TableCell>

                            {/* Role badge */}
                            <TableCell className="py-3">
                                {getRoleBadge(invitation.role)}
                            </TableCell>

                            {/* Salary details */}
                            <TableCell className="py-3">
                                <span className="text-xs font-semibold text-muted-foreground">
                                    ৳ {invitation.salary.toLocaleString()}
                                </span>
                            </TableCell>

                            {/* Status */}
                            <TableCell className="py-3">
                                <InvitationStatusBadge invitation={invitation} />
                            </TableCell>

                            {/* Expiry relative time */}
                            <TableCell className="py-3">
                                {invitation.isUsed ? (
                                    <span className="text-xs text-muted-foreground">Accepted</span>
                                ) : (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="text-xs text-muted-foreground underline decoration-dotted cursor-help select-none">
                                                    {new Date(invitation.expiresAt) > new Date()
                                                        ? formatDistanceToNow(new Date(invitation.expiresAt), { addSuffix: true })
                                                        : 'Expired'
                                                    }
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                {format(new Date(invitation.expiresAt), 'PPpp')}
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </TableCell>

                            {/* Actions Dropdown */}
                            <TableCell className="text-right py-3 pr-4">
                                <InvitationActions
                                    invitation={invitation}
                                    isResending={isResending}
                                    isCanceling={isCanceling}
                                    onResend={onResend}
                                    onCancel={onCancel}
                                />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
export default InvitationsTable;
