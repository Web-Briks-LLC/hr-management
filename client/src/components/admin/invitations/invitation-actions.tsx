'use client';

import { useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { MoreHorizontal, Copy, Check, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { IInvitation } from '@/types/invitation.type';

interface InvitationActionsProps {
    invitation: IInvitation;
    isResending: boolean;
    isCanceling: boolean;
    onResend: (id: string) => Promise<void>;
    onCancel: (id: string) => Promise<void>;
}

export function InvitationActions({
    invitation,
    isResending,
    isCanceling,
    onResend,
    onCancel,
}: InvitationActionsProps) {
    const [copied, setCopied] = useState(false);
    const [showCancelDialog, setShowCancelDialog] = useState(false);

    const handleCopy = async () => {
        try {
            const url = `${window.location.origin}/sign-up/${invitation.token}`;
            await navigator.clipboard.writeText(url);
            setCopied(true);
            toast.success('Invitation link copied!');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Failed to copy link');
        }
    };

    const handleConfirmCancel = async () => {
        await onCancel(invitation._id);
        setShowCancelDialog(false);
    };

    // If accepted/used, no management actions are valid
    if (invitation.isUsed) {
        return null;
    }

    return (
        <>
            <DropdownMenu modal={false}>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-muted focus-visible:ring-0 focus-visible:ring-offset-0"
                                    aria-label="Actions Menu"
                                >
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent>Actions</TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem 
                        onClick={handleCopy}
                        className="cursor-pointer gap-2"
                    >
                        {copied ? (
                            <Check className="h-4 w-4 text-emerald-500" />
                        ) : (
                            <Copy className="h-4 w-4" />
                        )}
                        <span>{copied ? 'Copied' : 'Copy link'}</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        onClick={() => onResend(invitation._id)}
                        disabled={isResending}
                        className="cursor-pointer gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${isResending ? 'animate-spin' : ''}`} />
                        <span>Resend Email</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                        onClick={() => setShowCancelDialog(true)}
                        disabled={isCanceling}
                        className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 gap-2"
                    >
                        <Trash2 className="h-4 w-4" />
                        <span>Revoke Invite</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Revoke confirmation dialog */}
            <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Revoke Invitation?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to revoke the invitation sent to <strong>{invitation.email}</strong>? 
                            This action will invalidate the link and prevent them from completing registration.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmCancel}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Revoke Invitation
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
