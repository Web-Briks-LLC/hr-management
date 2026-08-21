'use client';

import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export type AppDialogMaxWidth =
    | 'sm'
    | 'md'
    | 'lg'
    | 'xl'
    | '2xl'
    | '3xl'
    | '4xl'
    | '5xl'
    | 'full';

const maxWidthMap: Record<AppDialogMaxWidth, string> = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
    '3xl': 'sm:max-w-3xl',
    '4xl': 'sm:max-w-4xl',
    '5xl': 'sm:max-w-5xl',
    full: 'sm:max-w-[95vw]',
};

export interface AppDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: React.ReactNode;
    title?: React.ReactNode;
    description?: React.ReactNode;
    icon?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    maxWidth?: AppDialogMaxWidth;
    className?: string;
    bodyClassName?: string;
    headerClassName?: string;
    footerClassName?: string;
    showCloseButton?: boolean;
    hideHeaderSeparator?: boolean;
    hideFooterSeparator?: boolean;
}

/**
 * Shared AppDialog component built with Shadcn UI:
 * - Ceiling height at max-h-[85vh]
 * - Solid pinned Header with Separator
 * - Smooth scrollable Body using Shadcn UI ScrollArea
 * - Solid pinned Footer with Separator (cleanly anchored, never overlapping)
 */
export function AppDialog({
    open,
    onOpenChange,
    trigger,
    title,
    description,
    icon,
    children,
    footer,
    maxWidth = 'lg',
    className,
    bodyClassName,
    headerClassName,
    footerClassName,
    showCloseButton = true,
    hideHeaderSeparator = false,
    hideFooterSeparator = false,
}: AppDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent
                showCloseButton={showCloseButton}
                style={{ display: 'flex', flexDirection: 'column' }}
                className={cn(
                    '!flex !flex-col !p-0 !gap-0 max-h-[85vh] overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-2xl min-h-0',
                    maxWidthMap[maxWidth] || maxWidthMap.lg,
                    className
                )}
            >
                {/* Fixed Dialog Header with Solid Background */}
                {(title || description || icon) && (
                    <div className="shrink-0 bg-card z-20 relative">
                        <DialogHeader
                            className={cn(
                                'px-6 py-4 text-left',
                                headerClassName
                            )}
                        >
                            <div className="flex items-center gap-3 pr-8">
                                {icon && (
                                    <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0">
                                        {icon}
                                    </div>
                                )}
                                <div className="space-y-1">
                                    {title && (
                                        <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
                                            {title}
                                        </DialogTitle>
                                    )}
                                    {description && (
                                        <DialogDescription className="text-sm text-muted-foreground">
                                            {description}
                                        </DialogDescription>
                                    )}
                                </div>
                            </div>
                        </DialogHeader>
                        {!hideHeaderSeparator && <Separator className="shrink-0 bg-border/60" />}
                    </div>
                )}

                {/* Scrollable Dialog Content with Shadcn ScrollArea */}
                <div className="flex-1 min-h-0 overflow-y-auto relative bg-card">
                    <ScrollArea className="h-full w-full">
                        <div className={cn('px-6 py-5', bodyClassName)}>
                            {children}
                        </div>
                    </ScrollArea>
                </div>

                {/* Fixed Dialog Footer with Solid Background */}
                {footer && (
                    <div className="shrink-0 bg-card z-20 relative">
                        {!hideFooterSeparator && <Separator className="shrink-0 bg-border/60" />}
                        <DialogFooter
                            className={cn(
                                'px-6 py-4 bg-muted/40 !flex !flex-col-reverse sm:!flex-row sm:!justify-end gap-2.5',
                                footerClassName
                            )}
                        >
                            {footer}
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

/**
 * Modular sub-components for compound dialog usage
 */
export function AppDialogBody({
    className,
    children,
    ...props
}: React.ComponentProps<typeof ScrollArea>) {
    return (
        <div className="flex-1 min-h-0 overflow-y-auto relative bg-card">
            <ScrollArea className={cn('h-full w-full', className)} {...props}>
                <div className="px-6 py-5">{children}</div>
            </ScrollArea>
        </div>
    );
}

export {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
    DialogClose,
    Separator,
    ScrollArea,
};
