"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

/** Avatar + name + employee ID, used wherever an editor is listed. */
export function EditorCell({
  name,
  image,
  employeeId,
}: {
  name: string;
  image?: string | null;
  employeeId?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-9 w-9 border">
        <AvatarImage src={image || undefined} alt={name} />
        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="truncate font-semibold text-foreground">{name}</div>
        {employeeId && (
          <div className="font-mono text-[11px] text-muted-foreground">
            {employeeId}
          </div>
        )}
      </div>
    </div>
  );
}
