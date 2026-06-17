"use client";

import { useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { sidebarGroups } from "@/constants/sidebar";
import { useSession } from "@/lib/auth-client";
import { Role } from "@/constants/role";
import { useGetMeQuery } from "@/redux/features/staff/staffApi";
import { Skeleton } from "../ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
    SidebarGroup,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";

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

    // 1. Search Query State
    const [search, setSearch] = useState("");

    // 2. Get all accessible items for active URL matching
    const accessibleItems = useMemo(() => {
        return sidebarGroups.flatMap((group) =>
            group.items.filter((item) => {
                if (!userRole) return false;
                if (!item.access.includes(userRole)) return false;

                if (
                    (userRole === Role.STAFF || userRole === Role.TEAM_LEADER) &&
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
            })
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
                        if (
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
        <SidebarGroup className="py-2 px-1">
            {/* Real-time Search Input Bar */}
            <div className="px-2 mb-4 relative group/search">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 transition-colors group-focus-within/search:text-primary" />
                <Input
                    placeholder="Search navigation..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 bg-sidebar-accent/30 border-sidebar-border/40 focus-visible:bg-background h-8.5 rounded-lg text-xs font-semibold placeholder:text-muted-foreground/50 placeholder:font-medium transition-all duration-200"
                />
            </div>

            <div className="space-y-5">
                {filteredGroups.length === 0 ? (
                    <div className="text-center text-xs font-medium text-muted-foreground py-8 italic bg-muted/10 rounded-lg border border-dashed border-border/40 mx-2">
                        No matches found.
                    </div>
                ) : (
                    filteredGroups.map((group) => (
                        <div key={group.groupLabel} className="space-y-1">
                            <div className="px-2.5 text-[9px] font-bold text-muted-foreground/45 uppercase tracking-widest select-none">
                                {group.groupLabel}
                            </div>
                            <SidebarMenu className="space-y-0.5">
                                {group.items.map((item) => {
                                    const isActive = item.url === activeItemUrl;
                                    return (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={isActive}
                                                className={cn(
                                                    "w-full flex items-center gap-2.5 py-1.5 px-2.5 text-xs font-medium rounded-lg transition-all duration-200",
                                                    isActive
                                                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                                                        : "text-muted-foreground/80 hover:bg-sidebar-accent/50 hover:text-foreground"
                                                )}
                                            >
                                                <Link href={item.url}>
                                                    {item.icon && (
                                                        <item.icon
                                                            strokeWidth={2}
                                                            className={cn(
                                                                "size-4 shrink-0 transition-colors",
                                                                isActive
                                                                    ? "text-foreground"
                                                                    : "text-muted-foreground/60 group-hover:text-foreground"
                                                            )}
                                                        />
                                                    )}
                                                    <span className="truncate">{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    );
                                })}
                            </SidebarMenu>
                        </div>
                    ))
                )}
            </div>
        </SidebarGroup>
    );
}
