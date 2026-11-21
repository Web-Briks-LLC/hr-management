"use client";
import type { ComponentProps } from "react";
import {
  TableHeader as BaseHeader,
  TableRow as BaseRow,
  TableHead as BaseHead,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
export {
  TableBody,
  TableCell,
  TableFooter,
  TableCaption,
} from "@/components/ui/table";

/** Table that scrolls sideways inside a shadcn ScrollArea on narrow screens. */
export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <ScrollArea className="w-full">
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
export function TableFrame({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-md border border-border/60 overflow-hidden",
        className,
      )}
    />
  );
}
export function TableHeader({
  className,
  ...props
}: ComponentProps<typeof BaseHeader>) {
  return (
    <BaseHeader
      {...props}
      className={cn(
        className,
        "bg-muted/40 [&_tr]:hover:bg-muted/40 [&_tr]:border-b-border/60",
      )}
    />
  );
}
export function TableRow({
  className,
  ...props
}: ComponentProps<typeof BaseRow>) {
  return (
    <BaseRow
      {...props}
      className={cn(className, "hover:bg-muted/20 transition-colors")}
    />
  );
}
export function TableHead({
  className,
  ...props
}: ComponentProps<typeof BaseHead>) {
  return <BaseHead {...props} className={cn(className, "font-semibold")} />;
}
