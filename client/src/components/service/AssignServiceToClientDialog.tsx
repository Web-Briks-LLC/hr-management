"use client";

import { useState, useEffect, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { useGetAllClientsQuery, useUpdateClientMutation } from "@/redux/features/client/clientApi";
import { useGetServicesQuery } from "@/redux/features/service/serviceApi";
import { useSession } from "@/lib/auth-client";
import { Role } from "@/constants/role";
import type { IService } from "@/types/order.type";
import type { Client } from "@/types/client.type";
import { toast } from "sonner";
import { Loader2, UserPlus, Info } from "lucide-react";

interface AssignServiceToClientDialogProps {
    isOpen: boolean;
    onClose: () => void;
    service?: IService | null;
}

export function AssignServiceToClientDialog({
    isOpen,
    onClose,
    service,
}: AssignServiceToClientDialogProps) {
    const { data: session } = useSession();
    const isHRManager = session?.user?.role === Role.HR_MANAGER;

    const { data: clientsData, isLoading: isLoadingClients } = useGetAllClientsQuery({
        status: "active",
    });
    const { data: servicesData, isLoading: isLoadingServices } = useGetServicesQuery({
        isActive: true,
        limit: 1000,
    });

    const [updateClient, { isLoading: isSubmitting }] = useUpdateClientMutation();

    const [selectedServiceId, setSelectedServiceId] = useState<string>("");
    const [selectedClientId, setSelectedClientId] = useState<string>("");
    const [price, setPrice] = useState<number | string>("");
    const [error, setError] = useState<string>("");

    const clients: Client[] = useMemo(() => clientsData || [], [clientsData]);
    const services: IService[] = useMemo(() => servicesData?.data || [], [servicesData]);

    const selectedClient = useMemo(
        () => clients.find((c) => c._id === selectedClientId),
        [clients, selectedClientId]
    );

    const activeService = useMemo(
        () => services.find((s) => s._id === selectedServiceId) || service,
        [services, selectedServiceId, service]
    );

    // Check if the selected service is already assigned to the chosen client
    const existingAssignment = useMemo(() => {
        if (!selectedClient || !selectedServiceId) return null;
        return (selectedClient.assignedServices || []).find((a: any) => {
            const sId = typeof a.service === "object" ? a.service?._id : a.service || a._id;
            return String(sId) === selectedServiceId;
        });
    }, [selectedClient, selectedServiceId]);

    // Initialize or reset when dialog opens / service prop changes
    useEffect(() => {
        if (isOpen) {
            if (service) {
                setSelectedServiceId(service._id);
                setPrice(service.price ?? 0);
            } else {
                setSelectedServiceId("");
                setPrice(0);
            }
            setSelectedClientId("");
            setError("");
        }
    }, [isOpen, service]);

    // When client changes or service changes, if already assigned, pre-populate existing price
    useEffect(() => {
        if (existingAssignment) {
            setPrice(existingAssignment.price);
        } else if (activeService) {
            setPrice(activeService.price ?? 0);
        }
    }, [existingAssignment, activeService, selectedClientId]);

    const clientOptions = useMemo(
        () =>
            clients.map((c) => ({
                value: c._id,
                label: isHRManager ? c.clientId : `${c.name} (${c.clientId})`,
                description: isHRManager ? undefined : (c.emails?.[0] || c.phone || "No email"),
            })),
        [clients, isHRManager]
    );

    const serviceOptions = useMemo(
        () =>
            services.map((s) => ({
                value: s._id,
                label: s.name,
                description: `Base price: $${s.price?.toFixed(2) || "0.00"}`,
            })),
        [services]
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!selectedClientId) {
            setError("Please select a client.");
            return;
        }

        if (!selectedServiceId) {
            setError("Please select a service.");
            return;
        }

        const numericPrice = Number(price);
        if (isNaN(numericPrice) || numericPrice < 0) {
            setError("Price must be a valid non-negative number.");
            return;
        }

        if (!selectedClient) {
            setError("Client details not found.");
            return;
        }

        try {
            // Normalize existing assigned services to clean string IDs
            const currentAssignments = (selectedClient.assignedServices || []).map((a: any) => {
                const sId =
                    typeof a.service === "object"
                        ? a.service?._id
                        : a.service || a._id;
                return {
                    service: String(sId),
                    price: Number(a.price || 0),
                };
            });

            let newAssignments: { service: string; price: number }[] = [];

            if (existingAssignment) {
                // Update price for existing assignment
                newAssignments = currentAssignments.map((a) =>
                    a.service === selectedServiceId
                        ? { ...a, price: numericPrice }
                        : a
                );
            } else {
                // Add new assignment
                newAssignments = [
                    ...currentAssignments,
                    {
                        service: selectedServiceId,
                        price: numericPrice,
                    },
                ];
            }

            await updateClient({
                id: selectedClientId,
                assignedServices: newAssignments as any,
            }).unwrap();

            const displayName = isHRManager ? selectedClient.clientId : selectedClient.name;
            toast.success(
                existingAssignment
                    ? `Updated pricing for ${displayName}`
                    : `Assigned service to ${displayName} successfully`
            );
            onClose();
        } catch (err: any) {
            toast.error(err?.data?.message || "Failed to assign service to client");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <UserPlus className="h-5 w-5 text-primary" />
                            Assign Service to Client
                        </DialogTitle>
                        <DialogDescription>
                            Assign custom pricing for this service to a specific client.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Service Selection */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Service</Label>
                            {service ? (
                                <div className="p-3 rounded-lg border border-border/60 bg-muted/30 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">
                                            {service.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Base price: ${service.price?.toFixed(2) || "0.00"}
                                        </p>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                        Fixed
                                    </Badge>
                                </div>
                            ) : (
                                <Combobox
                                    options={serviceOptions}
                                    value={selectedServiceId}
                                    onChange={(val) => setSelectedServiceId(val)}
                                    placeholder="Select a service..."
                                    searchPlaceholder="Search service..."
                                    emptyText="No service found."
                                    isLoading={isLoadingServices}
                                />
                            )}
                        </div>

                        {/* Client Selection */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">
                                Client {isHRManager ? "(Client ID)" : ""}
                            </Label>
                            <Combobox
                                options={clientOptions}
                                value={selectedClientId}
                                onChange={(val) => setSelectedClientId(val)}
                                placeholder="Select a client..."
                                searchPlaceholder={
                                    isHRManager
                                        ? "Search client ID..."
                                        : "Search client by name or ID..."
                                }
                                emptyText="No active client found."
                                isLoading={isLoadingClients}
                            />
                        </div>

                        {/* Custom Price Input */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold">
                                    Custom Price ({selectedClient?.currency || "USD"})
                                </Label>
                                {existingAssignment && (
                                    <Badge
                                        variant="secondary"
                                        className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold"
                                    >
                                        Already assigned (${existingAssignment.price})
                                    </Badge>
                                )}
                            </div>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="h-9 text-sm font-medium"
                                required
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Set the custom rate that will apply when this client orders this service.
                            </p>
                        </div>

                        {/* Status / Alert Indicator */}
                        {existingAssignment && (
                            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/40 text-xs text-muted-foreground">
                                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                <span>
                                    This client already has this service. Submitting will update their custom rate to{" "}
                                    <strong className="text-foreground font-semibold">
                                        {price} {selectedClient?.currency || "USD"}
                                    </strong>.
                                </span>
                            </div>
                        )}

                        {error && (
                            <p className="text-xs font-medium text-destructive">{error}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                                    Saving...
                                </>
                            ) : existingAssignment ? (
                                "Update Price"
                            ) : (
                                "Assign Service"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
