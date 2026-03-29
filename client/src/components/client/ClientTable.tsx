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
      <div className="border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="border-r text-center">Client ID</TableHead>
              <TableHead className="border-r text-center">Name</TableHead>
              <TableHead className="border-r text-center">Email</TableHead>
              <TableHead className="border-r text-center">Phone</TableHead>
              <TableHead className="border-r text-center">
                Team Members
              </TableHead>
              <TableHead className="border-r text-center">Status</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell className="border-r">
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell className="border-r">
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell className="border-r">
                  <Skeleton className="h-4 w-40" />
                </TableCell>
                <TableCell className="border-r">
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell className="border-r">
                  <Skeleton className="h-4 w-12 mx-auto" />
                </TableCell>
                <TableCell className="border-r text-center">
                  <Skeleton className="h-6 w-16 mx-auto rounded-full" />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="border-r text-center">Client ID</TableHead>
            <TableHead className="border-r text-center">Name</TableHead>
            <TableHead className="border-r text-center">Email</TableHead>
            <TableHead className="border-r text-center">Phone</TableHead>
            <TableHead className="border-r text-center">Team Members</TableHead>
            <TableHead className="border-r text-center">Status</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center py-8 text-muted-foreground"
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
                <TableRow key={client._id}>
                  <TableCell className="border-r font-mono">
                    {client.clientId}
                  </TableCell>
                  <TableCell className="font-medium border-r">
                    {client.name}
                  </TableCell>
                  <TableCell className="border-r">
                    <div className="flex items-center gap-1">
                      <span className="truncate max-w-[150px]">
                        {client.emails?.[0] || "-"}
                      </span>
                      {client.emails && client.emails.length > 1 && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded-sm bg-teal-50 text-teal-600 text-[10px] font-bold">
                          +{client.emails.length - 1}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="border-r">
                    {client.phone || "-"}
                  </TableCell>
                  <TableCell className="border-r">
                    <div className="flex justify-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1.5 cursor-default hover:bg-muted/50 px-2 py-1 rounded-md transition-colors">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold text-sm">
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
                                    <span className="font-medium">
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
                  <TableCell className="border-r text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${statusOpt?.color}`}
                    >
                      {statusOpt?.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/clients/${client._id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      {!isTelemarketer && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(client)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
