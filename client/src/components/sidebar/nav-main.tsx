"use client";

import {
    SidebarGroup,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { sidebarData } from "@/constants/sidebar";
import { useSession } from "@/lib/auth-client";
import { Skeleton } from "../ui/skeleton";
import { Role } from "@/constants/role";
import Link from "next/link";

import { useGetMeQuery } from "@/redux/features/staff/staffApi";

export function NavMain() {
    const {
        data: session,
        isPending: isSessionPending,
        isRefetching,
    } = useSession();
    const { data: meData, isLoading: isMeLoading } = useGetMeQuery({});
    const pathname = usePathname();

    const userRole = session?.user?.role as Role | undefined;
    const staff = meData?.staff;

    // Filter items based on user role and designation for specific items
    const filteredItems = sidebarData.filter((item) => {
        if (!userRole) return false;
        if (!item.access.includes(userRole)) return false;

        // Restriction: STAFF and TEAM_LEADER must match requiredDesignation if specified
        if (
            (userRole === Role.STAFF || userRole === Role.TEAM_LEADER) &&
            item.requiredDesignation
        ) {
            return (
                staff?.designation?.toLowerCase() ===
                item.requiredDesignation.toLowerCase()
            );
        }

        return true;
    });


    const isLoading =
        isSessionPending || isMeLoading || (isRefetching && !session);

    if (isLoading) {
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
                                    "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
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
