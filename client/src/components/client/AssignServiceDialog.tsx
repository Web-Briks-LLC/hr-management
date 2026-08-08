"use client";

import { useState, useEffect } from "react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useGetServicesQuery } from "@/redux/features/service/serviceApi";
import { useUpdateClientMutation } from "@/redux/features/client/clientApi";
import type { Client } from "@/types/client.type";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AssignServiceDialogProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client;
    editingService?: {
        service: string;
        price: number;
    } | null;
}

export function AssignServiceDialog({
    isOpen,
    onClose,
    client,
    editingService,
}: AssignServiceDialogProps) {
    const { data: servicesData, isLoading: isLoadingServices } = useGetServicesQuery({
        isActive: true,
        limit: 1000,
    });
    
    const [updateClient, { isLoading: isUpdating }] = useUpdateClientMutation();
    const services = servicesData?.data || [];

    const [selectedService, setSelectedService] = useState("");
    const [price, setPrice] = useState<number | string>(0);
    const [error, setError] = useState("");

    useEffect(() => {
        if (editingService && isOpen) {
            setSelectedService(editingService.service);
            setPrice(editingService.price);
            setError("");
        } else if (isOpen) {
            setSelectedService("");
            setPrice(0);
            setError("");
        }
    }, [editingService, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        
        if (!selectedService) {
            setError("Please select a service.");
            return;
        }

        const numericPrice = Number(price);
        if (isNaN(numericPrice) || numericPrice < 0) {
            setError("Price must be a valid positive number.");
            return;
        }

        try {
            // Get current assigned services
            const currentAssignments = client.assignedServices || [];
            let newAssignments = [...currentAssignments];

            if (editingService) {
                // Update existing
                newAssignments = newAssignments.map((a) =>
                    a.service === editingService.service
                        ? { ...a, price: numericPrice }
                        : a
                );
            } else {
                // Check if already assigned
                const alreadyAssigned = currentAssignments.some(
                    (a) => a.service === selectedService
                );
                
                if (alreadyAssigned) {
                    toast.error("This service is already assigned to the client.");
                    return;
                }

                // Push new
                newAssignments.push({
                    service: selectedService,
                    price: numericPrice,
                    // assignedDate and assignedBy are handled by the backend
                });
            }

            await updateClient({
                id: client._id,
                assignedServices: newAssignments as any,
            }).unwrap();

            toast.success(
                editingService
                    ? "Service updated successfully"
                    : "Service assigned successfully"
            );
            onClose();
        } catch (error: any) {
            toast.error(error?.data?.message || "Failed to assign service");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {editingService ? "Edit Assigned Service" : "Assign Service"}
                    </DialogTitle>
                    <DialogDescription>
                        {editingService
                            ? "Update the price for this assigned service."
                            : "Assign a new service to this client with a specific price."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="service">Service</Label>
                        <Select
                            disabled={isLoadingServices || !!editingService}
                            onValueChange={setSelectedService}
                            value={selectedService}
                        >
                            <SelectTrigger id="service">
                                <SelectValue placeholder="Select a service" />
                            </SelectTrigger>
                            <SelectContent>
                                {services.map((service) => (
                                    <SelectItem
                                        key={service._id}
                                        value={service._id}
                                    >
                                        {service.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="price">Price ({client.currency || "USD"})</Label>
                        <Input
                            id="price"
                            type="number"
                            step="0.01"
                            placeholder="Enter price"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                        />
                    </div>
                    
                    {error && (
                        <p className="text-sm font-medium text-destructive">
                            {error}
                        </p>
                    )}

                    <DialogFooter className="pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isUpdating}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isUpdating}>
                            {isUpdating && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {editingService ? "Save Changes" : "Assign Service"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
