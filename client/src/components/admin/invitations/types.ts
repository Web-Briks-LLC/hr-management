import type { IInvitation } from '@/types/invitation.type';

export interface InvitationStatsData {
    total: number;
    pending: number;
    accepted: number;
    expired: number;
}

export type StatusFilterType = 'all' | 'pending' | 'accepted' | 'expired';

export const isInvitationExpired = (inv: IInvitation): boolean => {
    return !inv.isUsed && new Date(inv.expiresAt) <= new Date();
};

export const isInvitationPending = (inv: IInvitation): boolean => {
    return !inv.isUsed && new Date(inv.expiresAt) > new Date();
};
