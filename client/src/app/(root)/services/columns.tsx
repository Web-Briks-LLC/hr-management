"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { IService } from "@/types/order.type";
import { cn } from "@/lib/utils";

export type ServiceColumnData = IService & { usageCount: number };

interface ColumnOptions {
  onEdit: (service: ServiceColumnData) => void;
  onDelete: (service: ServiceColumnData) => void;
}

export const getColumns = (
  options: ColumnOptions
): ColumnDef<ServiceColumnData>[] => [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const service = row.original;
      return (
        <div>
          <div className="font-medium">{service.name}</div>
          <div className="text-sm text-muted-foreground line-clamp-1 truncate max-w-[200px]">
            {service.description}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.getValue("isActive") as boolean;
      return (
        <Badge variant={isActive ? "default" : "secondary"}>
          {isActive ? "Active" : "Inactive"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "usageCount",
    header: "Usage",
    cell: ({ row }) => {
      const usageCount = row.getValue("usageCount") as number;
      return <div>{usageCount} Orders</div>;
    },
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => {
      const service = row.original;
      return (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => options.onEdit(service)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => options.onDelete(service)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      );
    },
  },
];
