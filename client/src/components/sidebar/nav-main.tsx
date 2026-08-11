"use client";

import { useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { sidebarGroups } from "@/constants/sidebar";
import { useSession } from "@/lib/auth-client";
import { Role } from "@/constants/role";
import { useGetMeQuery } from "@/redux/features/staff/staffApi";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarInput,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";

export function NavMain() {
    const {
        data: session,
        isPending: isSessionPending,
    } = useSession();
    const { data: meData, isLoading: isMeLoading } = useGetMeQuery({});
    const pathname = usePathname();

    const userRole = session?.user?.role as Role | undefined;
    const staff = meData?.staff;

    // 1. Search Query State
    const [search, setSearch] = useState("");

    // 2. Get all accessible items for active URL matching
    const accessibleItems = useMemo(() => {
        return sidebarGroups.flatMap((group) =>
            group.items.filter((item) => {
                if (!userRole) return false;
                if (!item.access.includes(userRole)) return false;

                if (
                    (userRole === Role.STAFF ||
                        userRole === Role.TEAM_LEADER) &&
                    item.requiredDesignation
                ) {
                    if (
                        staff?.designation?.toLowerCase() !==
                        item.requiredDesignation.toLowerCase()
                    ) {
                        return false;
                    }
                }
                return true;
            }),
        );
    }, [userRole, staff]);

    // 3. Determine the single best matching active sidebar item URL
    const activeItemUrl = useMemo(() => {
        let bestMatchUrl = "";
        for (const item of accessibleItems) {
            if (
                pathname === item.url ||
                (item.url !== "/" && pathname.startsWith(item.url + "/"))
            ) {
                if (item.url.length > bestMatchUrl.length) {
                    bestMatchUrl = item.url;
                }
            }
        }
        return bestMatchUrl;
    }, [accessibleItems, pathname]);

    // 4. Filter and group items based on role, designation, and search query
    const filteredGroups = useMemo(() => {
        return sidebarGroups
            .map((group) => {
                const items = group.items.filter((item) => {
                    // A. Role check
                    if (!userRole) return false;
                    if (!item.access.includes(userRole)) return false;

                    // B. Restriction: STAFF and TEAM_LEADER must match requiredDesignation if specified
                    if (
                        (userRole === Role.STAFF || userRole === Role.TEAM_LEADER) &&
                        item.requiredDesignation
                    ) {
                        if (userRole === Role.TEAM_LEADER && item.url === "/orders") {
                            // Team Leaders can always see Orders
                        } else if (
                            staff?.designation?.toLowerCase() !==
                            item.requiredDesignation.toLowerCase()
                        ) {
                            return false;
                        }
                    }

                    // C. Search filter check
                    if (
                        search &&
                        !item.title.toLowerCase().includes(search.toLowerCase())
                    ) {
                        return false;
                    }

                    return true;
                });
                return { ...group, items };
            })
            .filter((group) => group.items.length > 0);
    }, [userRole, staff, search]);

    const isLoading = isSessionPending || (isMeLoading && !meData);

    if (isLoading) {
        return (
            <div className="space-y-4 px-2">
                {[...Array(3)].map((_, groupIndex) => (
                    <SidebarGroup key={groupIndex} className="py-1 px-0">
                        <Skeleton className="h-3.5 w-20 mb-2 bg-sidebar-accent/50 rounded-md animate-pulse" />
                        <SidebarGroupContent>
                            <SidebarMenu className="space-y-1">
                                {[...Array(3)].map((_, itemIndex) => (
                                    <SidebarMenuItem key={itemIndex}>
                                        <Skeleton className="h-8.5 w-full bg-sidebar-accent/30 rounded-lg animate-pulse" />
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Real-time Search Input Bar */}
            <SidebarGroup className="py-0 px-3">
                <div className="relative group/search">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sidebar-foreground/40 transition-colors group-focus-within/search:text-sidebar-foreground/80" />
                    <SidebarInput
                        placeholder="Search navigation..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 bg-sidebar-accent/40 border-sidebar-border/50 focus-visible:bg-sidebar-accent h-9 rounded-md text-xs font-medium placeholder:text-sidebar-foreground/45 transition-all duration-200"
                    />
                </div>
            </SidebarGroup>

            <div className="space-y-1">
                {filteredGroups.length === 0 ? (
                    <div className="text-center text-xs font-medium text-muted-foreground py-8 italic bg-muted/15 rounded-lg border border-dashed border-border/40 mx-3">
                        No matches found.
                    </div>
                ) : (
                    filteredGroups.map((group) => (
                        <SidebarGroup key={group.groupLabel} className="py-1">
                            <SidebarGroupLabel className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest px-3 select-none">
                                {group.groupLabel}
                            </SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu className="space-y-0.5 px-1">
                                    {group.items.map((item) => {
                                        const isActive =
                                            item.url === activeItemUrl;
                                        return (
                                            <SidebarMenuItem key={item.title}>
                                                <SidebarMenuButton
                                                    asChild
                                                    isActive={isActive}
                                                    className={cn(
                                                        "transition-all duration-200 relative group/btn",
                                                        isActive
                                                            ? "bg-sidebar-primary! text-sidebar-primary-foreground! font-semibold shadow-xs"
                                                            : "hover:bg-sidebar-accent/50",
                                                    )}
                                                >
                                                    <Link
                                                        href={item.url}
                                                        className="flex items-center gap-2 w-full"
                                                    >
                                                        {item.icon && (
                                                            <item.icon />
                                                        )}
                                                        <span className="truncate">
                                                            {item.title}
                                                        </span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        );
                                    })}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    ))
                )}
            </div>
        </div>
    );
}
