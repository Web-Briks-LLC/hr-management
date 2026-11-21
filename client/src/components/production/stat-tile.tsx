"use client";
import type { ComponentType, ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export type StatTone = "slate" | "green" | "orange" | "blue" | "purple";

const tones: Record<StatTone, { card: string; blur: string; icon: string }> = {
  slate: {
    card: "from-slate-500/10 hover:shadow-slate-500/5 hover:border-slate-500/30",
    blur: "bg-slate-500/10 group-hover:bg-slate-500/20",
    icon: "bg-slate-500/10 text-slate-500",
  },
  green: {
    card: "from-green-500/10 hover:shadow-green-500/5 hover:border-green-500/30",
    blur: "bg-green-500/10 group-hover:bg-green-500/20",
    icon: "bg-green-500/10 text-green-500",
  },
  orange: {
    card: "from-orange-500/10 hover:shadow-orange-500/5 hover:border-orange-500/30",
    blur: "bg-orange-500/10 group-hover:bg-orange-500/20",
    icon: "bg-orange-500/10 text-orange-500",
  },
  blue: {
    card: "from-blue-500/10 hover:shadow-blue-500/5 hover:border-blue-500/30",
    blur: "bg-blue-500/10 group-hover:bg-blue-500/20",
    icon: "bg-blue-500/10 text-blue-500",
  },
  purple: {
    card: "from-purple-500/10 hover:shadow-purple-500/5 hover:border-purple-500/30",
    blur: "bg-purple-500/10 group-hover:bg-purple-500/20",
    icon: "bg-purple-500/10 text-purple-500",
  },
};

/** Gradient number card used at the top of every production tab. */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  isLoading,
}: {
  label: string;
  value: ReactNode;
  hint: string;
  icon: ComponentType<{ className?: string }>;
  tone: StatTone;
  isLoading?: boolean;
}) {
  const t = tones[tone];
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-linear-to-br via-card to-card p-5 transition-all duration-300 hover:shadow-xl ${t.card}`}
    >
      <div
        className={`absolute -right-4 -top-4 h-20 w-20 rounded-full blur-2xl transition-all duration-300 ${t.blur}`}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <h3 className="mt-2 text-3xl font-bold tracking-tight">
            {isLoading ? <Skeleton className="h-8 w-14" /> : value}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 ${t.icon}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
