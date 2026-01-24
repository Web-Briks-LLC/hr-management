'use client';

import { useState, useEffect } from 'react';
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { sidebarGroups } from '@/constants/sidebar';
import { useSession } from '@/lib/auth-client';
import { Skeleton } from '../ui/skeleton';
import { Role } from '@/constants/role';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

export function NavMain() {
    const { data: session, isPending, isRefetching } = useSession();
    const pathname = usePathname();
    const [openGroup, setOpenGroup] = useState<string | null>(null);

    const userRole = session?.user?.role as Role | undefined;

    // Filter groups and items based on user role
    const filteredGroups = sidebarGroups
        .map((group) => ({
            ...group,
            items: group.items.filter((item) =>
                userRole ? item.access.includes(userRole) : false,
            ),
        }))
        .filter((group) => group.items.length > 0);

    // Auto-open the group containing the active route
    useEffect(() => {
        const activeGroup = filteredGroups.find((group) =>
            group.items.some((item) => pathname.startsWith(item.url)),
        );
        if (activeGroup) {
            setOpenGroup(activeGroup.groupLabel);
        }
    }, [pathname, filteredGroups]);

    const handleToggle = (groupLabel: string) => {
        setOpenGroup((prev) => (prev === groupLabel ? null : groupLabel));
    };

    if (isPending || (isRefetching && !session)) {
        return (
            <SidebarGroup className="px-4">
                <SidebarGroupContent>
                    <SidebarMenu className="space-y-2">
                        {[...Array(5)].map((_, i) => (
                            <SidebarMenuItem key={i}>
                                <Skeleton className="h-8 w-full bg-muted animate-pulse" />
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
        );
    }

    return (
        <>
            {filteredGroups.map((group) => {
                const isOpen = openGroup === group.groupLabel;
                const hasActiveItem = group.items.some((item) =>
                    pathname.startsWith(item.url),
                );

                return (
                    <SidebarGroup key={group.groupLabel} className="py-0">
                        <Collapsible
                            open={isOpen}
                            onOpenChange={() => handleToggle(group.groupLabel)}
                        >
                            <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:bg-accent hover:text-accent-foreground rounded-md transition-colors group">
                                <span
                                    className={cn(
                                        hasActiveItem && 'text-primary',
                                    )}
                                >
                                    {group.groupLabel}
                                </span>
                                <ChevronDown
                                    className={cn(
                                        'h-4 w-4 transition-transform duration-200',
                                        isOpen && 'rotate-180',
                                        hasActiveItem && 'text-primary',
                                    )}
                                />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                                <SidebarGroupContent className="pt-1">
                                    <SidebarMenu className="space-y-0.5">
                                        {group.items.map((item) => (
                                            <SidebarMenuItem key={item.title}>
                                                <SidebarMenuButton
                                                    tooltip={item.title}
                                                    className={cn(
                                                        pathname.startsWith(
                                                            item.url,
                                                        ) &&
                                                            'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
                                                    )}
                                                    asChild
                                                >
                                                    <Link href={item.url}>
                                                        {item.icon && (
                                                            <item.icon
                                                                strokeWidth={2}
                                                                className="size-4 shrink-0"
                                                            />
                                                        )}
                                                        <span>
                                                            {item.title}
                                                        </span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        ))}
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </CollapsibleContent>
                        </Collapsible>
                    </SidebarGroup>
                );
            })}
        </>
    );
}
