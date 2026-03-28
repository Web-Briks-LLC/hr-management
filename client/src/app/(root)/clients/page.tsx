"use client";

import { useState, useMemo } from "react";
import {
  useGetClientsQuery,
  useCreateClientMutation,
  useUpdateClientMutation,
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
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader,
  FileDown,
  RefreshCw,
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

  const [addServerErrors, setAddServerErrors] = useState<
    Record<string, string[]> | undefined
  >(undefined);
  const [updateServerErrors, setUpdateServerErrors] = useState<
    Record<string, string[]> | undefined
  >(undefined);

  const clients = useMemo(() => clientsData?.clients || [], [clientsData?.clients]);
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
      inactive: clients.filter((c: Client) => c.status === "inactive").length,
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = error as any;
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = error as any;
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
    });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Clients
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            Manage your client database and team assignments
            {isFetching && (
              <Loader className="h-3 w-3 animate-spin text-primary" />
            )}
          </p>
        </div>
        {!isTelemarketer && (
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="bg-card shadow-sm hover:shadow-md transition-all duration-200"
              onClick={() => toast.info("Export feature coming soon")}
            >
              <FileDown className="mr-2 h-4 w-4 text-slate-500" />
              Export
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isLoading || isFetching}
              className="bg-card shadow-sm hover:shadow-md transition-all duration-200"
            >
              <RefreshCw
                className={isFetching ? "animate-spin" : ""}
                size={16}
              />
            </Button>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-200"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Client
            </Button>
          </div>
        )}
      </div>

      {/* Stats section */}
      <ClientStats
        total={stats.total}
        active={stats.active}
        inactive={stats.inactive}
        isLoading={isLoading}
      />

      {/* Filter section */}
      <div className="bg-card p-4 rounded-xl border shadow-sm space-y-4">
        <ClientFilters
          search={search}
          status={status}
          limit={limit}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
        />
      </div>

      {/* Table section */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <ClientTable
          clients={clients}
          isLoading={isLoading}
          isTelemarketer={isTelemarketer}
          onEdit={openEditDialog}
        />

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t bg-muted/20">
          <div className="flex items-center gap-4 order-2 sm:order-1">
            <div className="text-sm text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {clients.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {pagination.total}
              </span>{" "}
              clients
            </div>
            <div className="h-4 w-px bg-slate-300 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Per page
              </span>
              <Select
                value={limit.toString()}
                onValueChange={(val) =>
                  handleFilterChange("limit", parseInt(val))
                }
              >
                <SelectTrigger className="h-7 w-[70px] text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PER_PAGE_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt}
                      value={opt.toString()}
                      className="text-xs"
                    >
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center space-x-2 order-1 sm:order-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(1)}
              disabled={page === 1 || isLoading}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1.5 px-3">
              <span className="text-sm font-medium">Page</span>
              <span className="flex h-7 w-12 items-center justify-center rounded-md border bg-background text-sm font-bold text-primary">
                {page}
              </span>
              <span className="text-sm font-medium">
                of {pagination.pages}
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() =>
                setPage((p) => Math.min(pagination.pages, p + 1))
              }
              disabled={page === pagination.pages || isLoading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(pagination.pages)}
              disabled={page === pagination.pages || isLoading}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Add Client Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>
              Create a new client profile with contact and team details.
            </DialogDescription>
          </DialogHeader>
          <ClientForm
            onSubmit={handleAddClient}
            isSubmitting={isCreating}
            submitLabel="Create Client"
            onCancel={() => setIsAddDialogOpen(false)}
            serverErrors={addServerErrors}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>
              Update client profile and team information.
            </DialogDescription>
          </DialogHeader>
          {editDefaultValues && (
            <ClientForm
              key={selectedClient?._id}
              defaultValues={editDefaultValues}
              onSubmit={handleUpdateClient}
              isSubmitting={isUpdating}
              submitLabel="Save Changes"
              onCancel={() => setIsEditDialogOpen(false)}
              serverErrors={updateServerErrors}
              isEditMode
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
