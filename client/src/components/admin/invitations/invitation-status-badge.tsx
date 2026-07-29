'use client';

import { Badge } from '@/components/ui/badge';
import type { IInvitation } from '@/types/invitation.type';
import { isInvitationExpired } from './types';

interface InvitationStatusBadgeProps {
    invitation: IInvitation;
}

export function InvitationStatusBadge({ invitation }: InvitationStatusBadgeProps) {
    if (invitation.isUsed) {
        return (
            <Badge
                variant="secondary"
                className="gap-1.5 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0"
            >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                Accepted
            </Badge>
        );
    }

    if (isInvitationExpired(invitation)) {
        return (
            <Badge
                variant="destructive"
                className="gap-1.5 bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20 px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0"
            >
                <span className="h-1.5 w-1.5 rounded-full bg-destructive" aria-hidden="true" />
                Expired
            </Badge>
        );
    }

    return (
        <Badge
            variant="outline"
            className="gap-1.5 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20 px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0"
        >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
            Pending
        </Badge>
    );
}
