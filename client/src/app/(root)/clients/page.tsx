"use client";

import { useState, useMemo } from "react";
import {
    useGetClientsQuery,
    useCreateClientMutation,
    useUpdateClientMutation,
    useMigrateClientIdsMutation,
} from "@/redux/features/client/clientApi";
import { useGetMeQuery } from "@/redux/features/staff/staffApi";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Plus,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    FileDown,
    RefreshCcw,
    Users,
} from "lucide-react";
import { toast } from "sonner";
import {
    ClientForm,
    type ClientFormData,
} from "@/components/client/ClientForm";
import { ClientStats } from "@/components/client/ClientStats";
import { ClientFilters } from "@/components/client/ClientFilters";
import { ClientTable } from "@/components/client/ClientTable";
import { PER_PAGE_OPTIONS } from "@/lib/constants";
import { Client } from "@/types/client.type";

export default function ClientsPage() {
    const { data: user } = useGetMeQuery({});
    const isTelemarketer = user?.role === "telemarketer";

    // Filter states
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");

    // Dialog states
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [editDefaultValues, setEditDefaultValues] = useState<
        ClientFormData | undefined
    >(undefined);

    // Queries
    const {
        data: clientsData,
        isLoading,
        isFetching,
        refetch,
    } = useGetClientsQuery({
        page,
        limit,
        search: search || undefined,
        status: status || undefined,
    });

    const [createClient, { isLoading: isCreating }] = useCreateClientMutation();
    const [updateClient, { isLoading: isUpdating }] = useUpdateClientMutation();
    const [migrateClientIds, { isLoading: isMigrating }] =
        useMigrateClientIdsMutation();

    const handleMigrateIds = async () => {
        try {
            const res = await migrateClientIds().unwrap();
            toast.success(
                res.message ||
                    "All clients updated to WB-10001 format successfully!",
            );
            refetch();
        } catch (error: unknown) {
            const err = error as { data?: { message?: string } };
            toast.error(err?.data?.message || "Failed to migrate client IDs");
        }
    };

    const [addServerErrors, setAddServerErrors] = useState<
        Record<string, string[]> | undefined
    >(undefined);
    const [updateServerErrors, setUpdateServerErrors] = useState<
        Record<string, string[]> | undefined
    >(undefined);

    const clients = useMemo(
        () => clientsData?.clients || [],
        [clientsData?.clients],
    );
    const pagination = clientsData?.pagination || {
        page: 1,
        limit: 10,
        total: 0,
        pages: 1,
    };

    // Derived stats for the CURRENT PAGE
    const stats = useMemo(() => {
        return {
            total: pagination.total,
            active: clients.filter((c: Client) => c.status === "active").length,
            inactive: clients.filter((c: Client) => c.status === "inactive")
                .length,
        };
    }, [clients, pagination.total]);

    const handleFilterChange = (key: string, value: string | number) => {
        if (key === "search") setSearch(value as string);
        if (key === "status") setStatus(value as string);
        if (key === "limit") setLimit(value as number);
        setPage(1); // Reset to page 1 on filter change
    };

    const handleClearFilters = () => {
        setSearch("");
        setStatus("");
        setLimit(10);
        setPage(1);
    };

    const handleAddClient = async (data: ClientFormData) => {
        try {
            setAddServerErrors(undefined);
            await createClient(data).unwrap();
            toast.success("Client created successfully");
            setIsAddDialogOpen(false);
        } catch (error: unknown) {
            const err = error as {
                data?: { errors?: Record<string, string[]>; message?: string };
                errors?: Record<string, string[]>;
            };
            setAddServerErrors(err?.data?.errors || err?.errors);
            toast.error(err?.data?.message || "Failed to create client");
        }
    };

    const handleUpdateClient = async (data: ClientFormData) => {
        if (!selectedClient) return;
        try {
            setUpdateServerErrors(undefined);
            await updateClient({ id: selectedClient._id, ...data }).unwrap();
            toast.success("Client updated successfully");
            setIsEditDialogOpen(false);
        } catch (error: unknown) {
            const err = error as {
                data?: { errors?: Record<string, string[]>; message?: string };
                errors?: Record<string, string[]>;
            };
            setUpdateServerErrors(err?.data?.errors || err?.errors);
            toast.error(err?.data?.message || "Failed to update client");
        }
    };

    const openEditDialog = (client: Client) => {
        setSelectedClient(client);
        setUpdateServerErrors(undefined);
        setEditDefaultValues({
            clientId: client.clientId,
            name: client.name,
            emails: client.emails,
            phone: client.phone || "",
            address: client.address || "",
            officeAddress: client.officeAddress || "",
            description: client.description || "",
            currency: client.currency || "",
            status: client.status,
            teamMembers: client.teamMembers || [],
            assignedServices: client.assignedServices || [],
            assignedTelemarketer:
                typeof client.assignedTelemarketer === "object"
                    ? client.assignedTelemarketer?._id
                    : client.assignedTelemarketer || "",
        });
        setIsEditDialogOpen(true);
    };

    return (
        <div className="space-y-8 p-1">
            {/* Header & Stats Overview (Matching Earnings Layout Exactly) */}
            <div className="flex flex-col gap-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text">
                        Clients Overview
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Manage your client database and team assignments.
                    </p>
                </div>

                <ClientStats
                    total={stats.total}
                    active={stats.active}
                    inactive={stats.inactive}
                    isLoading={isLoading}
                />
            </div>

            {/* Main Content Area (Matching Recent Earnings Section Card) */}
            <Card className="border-border/60 shadow-md">
                <CardHeader className="pb-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Users className="h-5 w-5 text-primary" />
                            Client Directory
                        </CardTitle>
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                className="border-primary text-primary hover:bg-accent hover:text-accent-foreground shadow-xs"
                                onClick={() =>
                                    toast.info("Export feature coming soon")
                                }
                            >
                                <FileDown className="h-4 w-4" />
                                Export
                            </Button>
                            <Button
                                variant="outline"
                                className="border-primary text-primary hover:bg-accent hover:text-accent-foreground shadow-xs"
                                onClick={() => refetch()}
                                disabled={isFetching}
                            >
                                <RefreshCcw
                                    className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
                                />
                                Refresh
                            </Button>
                            {!isTelemarketer && (
                                <Button
                                    variant="outline"
                                    className="border-amber-600 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 shadow-xs"
                                    onClick={handleMigrateIds}
                                    disabled={isMigrating}
                                    title="Migrate all existing client IDs to WB-10001, WB-10002... format"
                                >
                                    <RefreshCcw
                                        className={`h-4 w-4 ${isMigrating ? "animate-spin" : ""}`}
                                    />
                                    Migrate IDs
                                </Button>
                            )}
                            <Button
                                onClick={() => setIsAddDialogOpen(true)}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                            >
                                <Plus className="h-4 w-4" /> Add Client
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Filters Section */}
                    <ClientFilters
                        search={search}
                        status={status}
                        onFilterChange={handleFilterChange}
                        onClearFilters={handleClearFilters}
                    />

                    {/* Table */}
                    <div className="rounded-md border border-border/60 overflow-hidden">
                        <ClientTable
                            clients={clients}
                            isLoading={isLoading}
                            isTelemarketer={isTelemarketer}
                            onEdit={openEditDialog}
                        />
                    </div>

                    {/* Pagination Footer */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/60">
                        <div className="text-sm text-muted-foreground font-medium select-none">
                            Showing{" "}
                            <span className="font-semibold text-foreground">
                                {clients.length}
                            </span>{" "}
                            of{" "}
                            <span className="font-semibold text-foreground">
                                {pagination.total}
                            </span>{" "}
                            clients
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    Rows per page
                                </span>
                                <Select
                                    value={limit.toString()}
                                    onValueChange={(val) => {
                                        setLimit(Number(val));
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger className="h-8 w-[70px] text-xs font-semibold">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PER_PAGE_OPTIONS.map((option) => (
                                            <SelectItem
                                                key={option}
                                                value={option.toString()}
                                                className="text-xs"
                                            >
                                                {option}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setPage(1)}
                                    disabled={page === 1}
                                >
                                    <ChevronsLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() =>
                                        setPage((p) => Math.max(1, p - 1))
                                    }
                                    disabled={page === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-xs font-medium px-2 whitespace-nowrap select-none">
                                    Page {pagination.page} of {pagination.pages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() =>
                                        setPage((p) =>
                                            Math.min(pagination.pages, p + 1),
                                        )
                                    }
                                    disabled={page >= pagination.pages}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setPage(pagination.pages)}
                                    disabled={page >= pagination.pages}
                                >
                                    <ChevronsRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Add Client Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="sm:max-w-2xl h-[85vh] max-h-[85vh] flex flex-col p-0 overflow-hidden gap-0 border shadow-2xl">
                    <DialogHeader className="p-6 pb-4 border-b border-border/60 shrink-0 bg-background">
                        <DialogTitle className="text-xl font-bold">
                            Add New Client
                        </DialogTitle>
                        <DialogDescription>
                            Create a new client profile with contact and team
                            details.
                        </DialogDescription>
                    </DialogHeader>
                    <ClientForm
                        onSubmit={handleAddClient}
                        isSubmitting={isCreating}
                        submitLabel="Add Client"
                        onCancel={() => setIsAddDialogOpen(false)}
                        serverErrors={addServerErrors}
                    />
                </DialogContent>
            </Dialog>

            {/* Edit Client Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-2xl h-[85vh] max-h-[85vh] flex flex-col p-0 overflow-hidden gap-0 border shadow-2xl">
                    <DialogHeader className="p-6 pb-4 border-b border-border/60 shrink-0 bg-background">
                        <DialogTitle className="text-xl font-bold">
                            Edit Client
                        </DialogTitle>
                        <DialogDescription>
                            Update client information and settings.
                        </DialogDescription>
                    </DialogHeader>
                    <ClientForm
                        onSubmit={handleUpdateClient}
                        isSubmitting={isUpdating}
                        submitLabel="Update Client"
                        onCancel={() => setIsEditDialogOpen(false)}
                        defaultValues={editDefaultValues}
                        isEditMode={true}
                        serverErrors={updateServerErrors}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
