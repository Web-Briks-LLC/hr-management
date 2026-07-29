import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Eye, Edit2, Users } from "lucide-react";
import Link from "next/link";
import { Client } from "@/types/client.type";
import { CLIENT_STATUS_OPTIONS } from "@/lib/constants";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ClientTableProps {
  clients: Client[];
  isLoading: boolean;
  isTelemarketer: boolean;
  onEdit: (client: Client) => void;
}

export function ClientTable({
  clients,
  isLoading,
  isTelemarketer,
  onEdit,
}: ClientTableProps) {
  if (isLoading) {
    return (
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-muted/40 border-b-border/60">
            <TableHead className="font-semibold py-3 pl-4">Client ID</TableHead>
            <TableHead className="font-semibold py-3">Name</TableHead>
            <TableHead className="font-semibold py-3">Email</TableHead>
            <TableHead className="font-semibold py-3">Phone</TableHead>
            <TableHead className="font-semibold py-3 text-center">Team Members</TableHead>
            <TableHead className="font-semibold py-3">Status</TableHead>
            <TableHead className="font-semibold py-3 text-right pr-4">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(5)].map((_, i) => (
            <TableRow key={i} className="border-b last:border-b-0">
              <TableCell className="py-3 pl-4">
                <Skeleton className="h-4 w-20 bg-muted animate-pulse rounded-md" />
              </TableCell>
              <TableCell className="py-3">
                <Skeleton className="h-4 w-32 bg-muted animate-pulse rounded-md" />
              </TableCell>
              <TableCell className="py-3">
                <Skeleton className="h-4 w-40 bg-muted animate-pulse rounded-md" />
              </TableCell>
              <TableCell className="py-3">
                <Skeleton className="h-4 w-24 bg-muted animate-pulse rounded-md" />
              </TableCell>
              <TableCell className="py-3">
                <Skeleton className="h-4 w-12 mx-auto bg-muted animate-pulse rounded-md" />
              </TableCell>
              <TableCell className="py-3">
                <Skeleton className="h-6 w-16 rounded-full bg-muted animate-pulse" />
              </TableCell>
              <TableCell className="py-3 pr-4 text-right">
                <div className="flex justify-end gap-2">
                  <Skeleton className="h-8 w-8 bg-muted animate-pulse rounded-md" />
                  <Skeleton className="h-8 w-8 bg-muted animate-pulse rounded-md" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <Table>
      <TableHeader className="bg-muted/40">
        <TableRow className="hover:bg-muted/40 border-b-border/60">
          <TableHead className="font-semibold py-3 pl-4">Client ID</TableHead>
          <TableHead className="font-semibold py-3">Name</TableHead>
          <TableHead className="font-semibold py-3">Email</TableHead>
          <TableHead className="font-semibold py-3">Phone</TableHead>
          <TableHead className="font-semibold py-3 text-center">Team Members</TableHead>
          <TableHead className="font-semibold py-3">Status</TableHead>
          <TableHead className="font-semibold py-3 text-right pr-4">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={7}
              className="text-center py-12 text-muted-foreground"
            >
              No clients found
            </TableCell>
          </TableRow>
        ) : (
          clients.map((client) => {
            const statusOpt = CLIENT_STATUS_OPTIONS.find(
              (s) => s.value === client.status,
            );
            return (
              <TableRow key={client._id} className="hover:bg-muted/15 transition-colors border-b last:border-b-0">
                <TableCell className="py-3 pl-4 font-mono text-xs">
                  {client.clientId}
                </TableCell>
                <TableCell className="py-3 font-medium text-sm text-foreground">
                  {client.name}
                </TableCell>
                <TableCell className="py-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate max-w-[180px]">
                      {client.emails?.[0] || "-"}
                    </span>
                    {client.emails && client.emails.length > 1 && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary text-[10px] font-bold">
                        +{client.emails.length - 1}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-3 text-xs text-muted-foreground">
                  {client.phone || "-"}
                </TableCell>
                <TableCell className="py-3">
                  <div className="flex justify-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5 cursor-default hover:bg-muted/50 px-2 py-1 rounded-md transition-colors">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold text-xs">
                            {client.teamMembers?.length || 0}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="p-3 min-w-[150px]"
                      >
                        {client.teamMembers &&
                        client.teamMembers.length > 0 ? (
                          <div className="space-y-2">
                            <ul className="space-y-1.5">
                              {client.teamMembers.map((member, idx) => (
                                <li key={idx} className="flex flex-col">
                                  <span className="font-medium text-xs">
                                    {idx + 1}. {member.name}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <p className="text-xs">No team members assigned</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
                <TableCell className="py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold select-none ${statusOpt?.color}`}
                  >
                    {statusOpt?.label}
                  </span>
                </TableCell>
                <TableCell className="py-3 pr-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted border border-transparent hover:border-border transition-all" asChild>
                      <Link href={`/clients/${client._id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-muted border border-transparent hover:border-border transition-all"
                      onClick={() => onEdit(client)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
