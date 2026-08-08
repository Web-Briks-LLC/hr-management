"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Edit2, Plus, RefreshCcw } from "lucide-react";
import { useGetAssignedServicesQuery } from "@/redux/features/client/clientApi";
import type { Client } from "@/types/client.type";
import { AssignServiceDialog } from "./AssignServiceDialog";

interface AssignedServicesTabProps {
    client: Client;
}

export function AssignedServicesTab({ client }: AssignedServicesTabProps) {
    const { data: assignedServices, isLoading, refetch, isFetching } = useGetAssignedServicesQuery(client._id);
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
    const [editingService, setEditingService] = useState<{ service: string; price: number } | null>(null);

    const handleEdit = (serviceId: string, currentPrice: number) => {
        setEditingService({ service: serviceId, price: currentPrice });
        setIsAssignDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsAssignDialogOpen(false);
        setEditingService(null);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <RefreshCcw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const hasServices = assignedServices && assignedServices.length > 0;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Assigned Services</h3>
                    <p className="text-sm text-muted-foreground">
                        Manage services currently assigned to this client. Total assigned: {assignedServices?.length || 0}.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => refetch()} 
                        disabled={isFetching}
                    >
                        <RefreshCcw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button size="sm" onClick={() => setIsAssignDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Assign Service
                    </Button>
                </div>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Service</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Assigned Date</TableHead>
                            <TableHead>Assigned By</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {hasServices ? (
                            assignedServices.map((assignment) => (
                                <TableRow key={assignment._id}>
                                    <TableCell className="font-medium">
                                        {assignment.serviceDetails?.name || "Unknown Service"}
                                    </TableCell>
                                    <TableCell>
                                        {assignment.price} {client.currency || "USD"}
                                    </TableCell>
                                    <TableCell>
                                        {assignment.assignedDate
                                            ? format(new Date(assignment.assignedDate), "PPp")
                                            : "N/A"}
                                    </TableCell>
                                    <TableCell>
                                        {assignment.assignedByDetails?.name || "System"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEdit(assignment.service, assignment.price)}
                                            title="Edit Price"
                                        >
                                            <Edit2 className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No services assigned to this client yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <AssignServiceDialog
                isOpen={isAssignDialogOpen}
                onClose={handleCloseDialog}
                client={client}
                editingService={editingService}
            />
        </div>
    );
}
