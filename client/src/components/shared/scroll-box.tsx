"use client";
import type { CSSProperties, ReactNode } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

/** shadcn ScrollArea that grows with its content up to `maxHeight`, then scrolls. */
export function ScrollBox({
  maxHeight = "16rem",
  className,
  children,
}: {
  maxHeight?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <ScrollArea
      className={cn(
        "[&>[data-slot=scroll-area-viewport]]:max-h-(--scroll-max)",
        className,
      )}
      style={{ "--scroll-max": maxHeight } as CSSProperties}
    >
      {children}
    </ScrollArea>
  );
}
