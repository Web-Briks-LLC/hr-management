"use client";

import React from "react";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface StackedAvatarsProps {
    users: Array<{
        _id: string;
        name: string;
        avatar?: string;
    }>;
    maxVisible?: number;
}

export function StackedAvatars({ users, maxVisible = 3 }: StackedAvatarsProps) {
    if (users.length === 0) return <span className="text-muted-foreground text-xs italic">No acceptances</span>;

    const visibleUsers = users.slice(0, maxVisible);
    const remainingCount = users.length - maxVisible;

    return (
        <div className="flex -space-x-2 overflow-hidden items-center">
            <TooltipProvider>
                {visibleUsers.map((user) => (
                    <Tooltip key={user._id}>
                        <TooltipTrigger asChild>
                            <Avatar className="inline-block h-6 w-6 rounded-full ring-2 ring-background hover:z-10 transition-transform">
                                <AvatarImage src={user.avatar} alt={user.name} />
                                <AvatarFallback className="text-[10px] bg-slate-200">
                                    {user.name.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="text-xs">{user.name}</p>
                        </TooltipContent>
                    </Tooltip>
                ))}
            </TooltipProvider>

            {remainingCount > 0 && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-medium text-slate-600 ring-2 ring-background">
                    +{remainingCount}
                </div>
            )}
        </div>
    );
}
