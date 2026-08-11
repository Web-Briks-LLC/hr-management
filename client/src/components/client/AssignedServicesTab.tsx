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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Edit2, Trash2, Plus, RefreshCcw, Loader2, Layers } from "lucide-react";
import {
    useGetAssignedServicesQuery,
    useUpdateClientMutation,
} from "@/redux/features/client/clientApi";
import type { Client } from "@/types/client.type";
import { AssignServiceDialog } from "./AssignServiceDialog";
import { toast } from "sonner";

interface AssignedServicesTabProps {
    client: Client;
}

export function AssignedServicesTab({ client }: AssignedServicesTabProps) {
    const { data: assignedServices, isLoading, refetch, isFetching } = useGetAssignedServicesQuery(client._id);
    const [updateClient, { isLoading: isDeleting }] = useUpdateClientMutation();
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
    const [editingService, setEditingService] = useState<{ service: string; price: number } | null>(null);
    const [serviceToDelete, setServiceToDelete] = useState<{
        serviceId: string;
        serviceName: string;
    } | null>(null);

    const handleEdit = (serviceId: string, currentPrice: number) => {
        setEditingService({ service: serviceId, price: currentPrice });
        setIsAssignDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsAssignDialogOpen(false);
        setEditingService(null);
    };

    const handleDeleteConfirm = async () => {
        if (!serviceToDelete) return;
        try {
            const currentList = assignedServices || client.assignedServices || [];
            const newAssignments = currentList
                .map((a: any) => {
                    const sId =
                        typeof a.service === "object"
                            ? a.service?._id
                            : a.service || a._id;
                    return {
                        service: String(sId),
                        price: Number(a.price || 0),
                    };
                })
                .filter((a) => a.service !== serviceToDelete.serviceId);

            await updateClient({
                id: client._id,
                assignedServices: newAssignments as any,
            }).unwrap();

            toast.success("Assigned service removed successfully");
            setServiceToDelete(null);
            refetch();
        } catch (error: unknown) {
            const err = error as { data?: { message?: string } };
            toast.error(err?.data?.message || "Failed to remove assigned service");
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <RefreshCcw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const hasServices = assignedServices && assignedServices.length > 0;

    return (
        <TooltipProvider>
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-base font-semibold text-foreground">
                            Custom Service Pricing
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Manage client-specific prices for assigned services. Total: {assignedServices?.length || 0}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => refetch()} 
                            disabled={isFetching}
                            className="h-8 text-xs font-medium"
                        >
                            <RefreshCcw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => setIsAssignDialogOpen(true)}
                            className="h-8 text-xs font-medium"
                        >
                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                            Assign Service
                        </Button>
                    </div>
                </div>

                <div className="border border-border/60 rounded-md overflow-hidden bg-card">
                    <Table>
                        <TableHeader className="bg-muted/40">
                            <TableRow className="border-b border-border/60">
                                <TableHead className="font-semibold py-3 pl-4 text-xs uppercase tracking-wider text-muted-foreground">
                                    Service Name
                                </TableHead>
                                <TableHead className="font-semibold py-3 text-center text-xs uppercase tracking-wider text-muted-foreground">
                                    Custom Price
                                </TableHead>
                                <TableHead className="font-semibold py-3 text-center text-xs uppercase tracking-wider text-muted-foreground">
                                    Assigned Date
                                </TableHead>
                                <TableHead className="font-semibold py-3 text-center text-xs uppercase tracking-wider text-muted-foreground">
                                    Assigned By
                                </TableHead>
                                <TableHead className="font-semibold py-3 text-right pr-4 text-xs uppercase tracking-wider text-muted-foreground">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {hasServices ? (
                                assignedServices.map((assignment: any) => {
                                    const serviceId =
                                        typeof assignment.service === "object"
                                            ? assignment.service?._id
                                            : assignment.service || assignment._id;
                                    const serviceName =
                                        assignment.serviceDetails?.name ||
                                        assignment.name ||
                                        "Unknown Service";

                                    return (
                                        <TableRow
                                            key={assignment._id}
                                            className="hover:bg-muted/25 transition-colors border-b border-border/40 last:border-b-0"
                                        >
                                            <TableCell className="py-3.5 pl-4 font-medium">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                                                        <Layers className="h-3.5 w-3.5" />
                                                    </div>
                                                    <span className="text-sm font-semibold text-foreground">
                                                        {serviceName}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-3.5 text-center font-mono font-semibold text-sm text-foreground">
                                                {assignment.price} {client.currency || "USD"}
                                            </TableCell>
                                            <TableCell className="py-3.5 text-center text-xs text-muted-foreground">
                                                {assignment.assignedDate
                                                    ? format(new Date(assignment.assignedDate), "MMM dd, yyyy")
                                                    : "N/A"}
                                            </TableCell>
                                            <TableCell className="py-3.5 text-center text-xs font-medium text-foreground">
                                                {assignment.assignedByDetails?.name || "System"}
                                            </TableCell>
                                            <TableCell className="py-3.5 pr-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                                onClick={() => handleEdit(serviceId, assignment.price)}
                                                            >
                                                                <Edit2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Edit Price</TooltipContent>
                                                    </Tooltip>

                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                                onClick={() =>
                                                                    setServiceToDelete({
                                                                        serviceId,
                                                                        serviceName,
                                                                    })
                                                                }
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Remove Service</TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-16 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center justify-center space-y-2">
                                            <div className="p-3 rounded-full bg-muted/60">
                                                <Layers className="h-6 w-6 text-muted-foreground" />
                                            </div>
                                            <p className="text-sm font-medium text-foreground">
                                                No services assigned
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Assign custom services and pricing to this client.
                                            </p>
                                        </div>
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

                <AlertDialog
                    open={!!serviceToDelete}
                    onOpenChange={(open) => !open && setServiceToDelete(null)}
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Remove Assigned Service</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to remove &quot;
                                {serviceToDelete?.serviceName}&quot; from this client&apos;s assigned services?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeleteConfirm}
                                disabled={isDeleting}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                {isDeleting && (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                )}
                                Remove
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </TooltipProvider>
    );
}
