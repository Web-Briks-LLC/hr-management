'use client';

import {
    SidebarGroup,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { sidebarData } from '@/constants/sidebar';
import { useSession } from '@/lib/auth-client';
import { Skeleton } from '../ui/skeleton';
import { Role } from '@/constants/role';
import Link from 'next/link';

export function NavMain() {
    const { data: session, isPending, isRefetching } = useSession();
    const pathname = usePathname();

    const userRole = session?.user?.role as Role | undefined;

    // Filter items based on user role
    const filteredItems = sidebarData.filter((item) =>
        userRole ? item.access.includes(userRole) : false,
    );

    if (isPending || (isRefetching && !session)) {
        return (
            <SidebarGroup className="px-4">
                <SidebarMenu className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                        <SidebarMenuItem key={i}>
                            <Skeleton className="h-8 w-full bg-muted animate-pulse" />
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroup>
        );
    }

    return (
        <SidebarGroup className="py-0">
            <SidebarMenu className="space-y-1">
                {filteredItems.map((item) => (
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
        </SidebarGroup>
    );
}
