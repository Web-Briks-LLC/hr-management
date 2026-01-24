'use client';

import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { sidebarGroups } from '@/constants/sidebar';
import { useSession } from '@/lib/auth-client';
import { Skeleton } from '../ui/skeleton';
import { Role } from '@/constants/role';
import Link from 'next/link';

export function NavMain() {
    const { data: session, isPending, isRefetching } = useSession();
    const pathname = usePathname();

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

    return (
        <>
            {filteredGroups.map((group) => (
                <SidebarGroup key={group.groupLabel}>
                    <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">
                        {group.groupLabel}
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu className="space-y-0.5">
                            {group.items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        tooltip={item.title}
                                        className={cn(
                                            pathname.startsWith(item.url) &&
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
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            ))}
        </>
    );
}
