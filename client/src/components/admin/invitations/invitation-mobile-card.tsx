'use client';

import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import type { IInvitation } from '@/types/invitation.type';
import { InvitationStatusBadge } from './invitation-status-badge';
import { InvitationActions } from './invitation-actions';

interface InvitationMobileListProps {
    invitations: IInvitation[];
    isResending: boolean;
    isCanceling: boolean;
    onResend: (id: string) => Promise<void>;
    onCancel: (id: string) => Promise<void>;
}

export function InvitationMobileList({
    invitations,
    isResending,
    isCanceling,
    onResend,
    onCancel,
}: InvitationMobileListProps) {
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
        <div className="block md:hidden divide-y bg-card rounded-md border overflow-hidden">
            {invitations.map((invitation) => (
                <div key={invitation._id} className="p-4 space-y-3.5 hover:bg-muted/10 transition-colors">
                    {/* Header: Initial bubble + email + action */}
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="h-8.5 w-8.5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase shrink-0 border border-primary/10 select-none">
                                {invitation.email.charAt(0)}
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="font-medium text-foreground text-sm break-all">
                                    {invitation.email}
                                </span>
                                <span className="text-xs text-muted-foreground capitalize">
                                    {invitation.designation}
                                    {invitation.department && ` • ${invitation.department}`}
                                </span>
                            </div>
                        </div>
                        <div className="shrink-0">
                            <InvitationActions
                                invitation={invitation}
                                isResending={isResending}
                                isCanceling={isCanceling}
                                onResend={onResend}
                                onCancel={onCancel}
                            />
                        </div>
                    </div>

                    {/* Metadata Section */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div className="flex flex-col gap-1">
                            <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Role</span>
                            <div>{getRoleBadge(invitation.role)}</div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Salary</span>
                            <span className="font-semibold text-foreground">৳ {invitation.salary.toLocaleString()}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Status</span>
                            <div><InvitationStatusBadge invitation={invitation} /></div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Expires</span>
                            <span className="text-muted-foreground font-medium">
                                {invitation.isUsed ? (
                                    'Accepted'
                                ) : new Date(invitation.expiresAt) > new Date() ? (
                                    formatDistanceToNow(new Date(invitation.expiresAt), { addSuffix: true })
                                ) : (
                                    'Expired'
                                )}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
