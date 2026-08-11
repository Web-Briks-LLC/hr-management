"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Settings2,
  CheckCircle2,
  TrendingUp,
  Info,
  Filter,
  Edit,
  Trash2,
} from "lucide-react";
import {
  useGetServicesQuery,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useDeleteServiceMutation,
  useLazyCheckServiceUsageQuery,
} from "@/redux/features/service/serviceApi";
import { toast } from "sonner";
import { IService } from "@/types/order.type";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Combobox } from "@/components/ui/combobox";
import { AssignServiceToClientDialog } from "@/components/service/AssignServiceToClientDialog";
import { UserPlus } from "lucide-react";

export default function ServicesPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");

  // Services Queries
  const {
    data: servicesData,
    isLoading,
    isFetching,
  } = useGetServicesQuery({
    page,
    limit,
    search,
  });

  const [createService, { isLoading: isCreating }] = useCreateServiceMutation();
  const [updateService, { isLoading: isUpdating }] = useUpdateServiceMutation();
  const [deleteService, { isLoading: isDeleting }] = useDeleteServiceMutation();
  const [checkUsage] = useLazyCheckServiceUsageQuery();

  // Dialog States
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isMigrationDialogOpen, setIsMigrationDialogOpen] = useState(false);
  const [isAssignToClientOpen, setIsAssignToClientOpen] = useState(false);
  const [assigningService, setAssigningService] = useState<IService | null>(null);
  const [selectedService, setSelectedService] = useState<
    (IService & { usageCount: number }) | null
  >(null);
  const [migrationTargetId, setMigrationTargetId] = useState("");

  // Form States
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    price?: number | '';
    isActive: boolean;
  }>({
    name: "",
    description: "",
    price: "",
    isActive: true,
  });

  const handleOpenAdd = useCallback(() => {
    setSelectedService(null);
    setFormData({ name: "", description: "", price: "", isActive: true });
    setIsAddEditOpen(true);
  }, []);

  const handleOpenEdit = useCallback((service: IService & { usageCount: number }) => {
    setSelectedService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
      price: service.price || "",
      isActive: service.isActive,
    });
    setIsAddEditOpen(true);
  }, []);

  const handleDeleteClick = useCallback(async (
    service: IService & { usageCount: number },
  ) => {
    setSelectedService(service);
    try {
      const usageCheck = await checkUsage(service._id).unwrap();
      if (usageCheck.data.hasUsage) {
        setIsMigrationDialogOpen(true);
      } else {
        setIsDeleteAlertOpen(true);
      }
    } catch (error) {
      toast.error((error as Error).message || "Failed to check service usage");
    }
  }, [checkUsage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedService) {
        await updateService({
          id: selectedService._id,
          data: {
            ...formData,
            price: formData.price === "" ? 0 : Number(formData.price),
          },
        }).unwrap();
        toast.success("Service updated successfully");
      } else {
        await createService({
          ...formData,
          price: formData.price === "" ? 0 : Number(formData.price),
        }).unwrap();
        toast.success("Service created successfully");
      }
      setIsAddEditOpen(false);
    } catch (error) {
      toast.error((error as Error).message || "Something went wrong");
    }
  };

  const services = useMemo(() => servicesData?.data || [], [servicesData]);
  const meta = servicesData?.meta || { total: 0, activeCount: 0, totalUsage: 0, unusedCount: 0 };
  const totalPages = Math.ceil(meta.total / limit);

  const confirmDelete = async () => {
    if (!selectedService) return;
    try {
      await deleteService({ id: selectedService._id }).unwrap();
      toast.success("Service deleted successfully");
      setIsDeleteAlertOpen(false);
    } catch (error) {
      toast.error((error as Error).message || "Failed to delete service");
    }
  };

  const handleMigrateAndDelete = async () => {
    if (!selectedService || !migrationTargetId) {
      toast.error("Please select a target service for migration");
      return;
    }
    try {
      await deleteService({
        id: selectedService._id,
        migrationId: migrationTargetId,
      }).unwrap();
      toast.success("Service migrated and deleted successfully");
      setIsMigrationDialogOpen(false);
      setMigrationTargetId("");
    } catch (error) {
      toast.error((error as Error).message || "Migration and deletion failed");
    }
  };

  return (
    <div className="space-y-8 p-1">
      {/* Header & Stats Overview */}
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text">
              Services Overview
            </h2>
            <p className="text-muted-foreground mt-1">
              Manage your order services and track usage.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setAssigningService(null);
                setIsAssignToClientOpen(true);
              }}
              className="shadow-xs"
            >
              <UserPlus className="mr-2 h-4 w-4" /> Assign to Client
            </Button>
            <Button onClick={handleOpenAdd} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs">
              <Plus className="mr-2 h-4 w-4" /> Add Service
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Services Card */}
          <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-slate-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-slate-500/5 hover:border-slate-500/30">
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-slate-500/10 blur-2xl transition-all duration-300 group-hover:bg-slate-500/20" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/10 text-slate-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-slate-500/20">
                  <Settings2 className="h-5 w-5" />
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div>
                  <h3 className="text-3xl font-bold tracking-tight text-slate-600 dark:text-slate-300">
                    {meta.total}
                  </h3>
                  <p className="text-xs font-medium text-muted-foreground mt-1">Total Services</p>
                </div>
              )}
            </div>
          </div>

          {/* Active Card */}
          <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-green-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/5 hover:border-green-500/30">
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-green-500/10 blur-2xl transition-all duration-300 group-hover:bg-green-500/20" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-green-500/20">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div>
                  <h3 className="text-3xl font-bold tracking-tight text-green-600 dark:text-green-400">
                    {meta.activeCount}
                  </h3>
                  <p className="text-xs font-medium text-muted-foreground mt-1">Active Services</p>
                </div>
              )}
            </div>
          </div>

          {/* Total Usage Card */}
          <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-blue-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-500/30">
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-blue-500/10 blur-2xl transition-all duration-300 group-hover:bg-blue-500/20" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-500/20">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div>
                  <h3 className="text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                    {meta.totalUsage}
                  </h3>
                  <p className="text-xs font-medium text-muted-foreground mt-1">Total Usage</p>
                </div>
              )}
            </div>
          </div>

          {/* Unused Card */}
          <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-amber-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/5 hover:border-amber-500/30">
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-amber-500/10 blur-2xl transition-all duration-300 group-hover:bg-amber-500/20" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-amber-500/20">
                  <Info className="h-5 w-5" />
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div>
                  <h3 className="text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                    {meta.unusedCount}
                  </h3>
                  <p className="text-xs font-medium text-muted-foreground mt-1">Unused Services</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-full">
            <Filter className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-medium">Filters:</span>
        </div>

        <div className="relative w-full max-w-sm ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search services..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 h-9 bg-background/60"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border/60 overflow-hidden bg-background">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-muted/40 border-b-border/60">
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Description</TableHead>
              <TableHead className="font-semibold text-center">Price</TableHead>
              <TableHead className="font-semibold text-center">Status</TableHead>
              <TableHead className="font-semibold text-center">Usage</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(limit)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16 mx-auto rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : services.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <div className="bg-muted/50 p-3 rounded-full">
                      <Settings2 className="h-6 w-6 opacity-30" />
                    </div>
                    <p className="text-lg font-medium">No services found</p>
                    <p className="text-sm">Try adjusting your search or create a new service.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              services.map((service) => (
                <TableRow key={service._id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="font-medium text-foreground">
                    {service.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[300px] truncate">
                    {service.description || '-'}
                  </TableCell>
                  <TableCell className="text-center font-medium text-muted-foreground">
                    ${service.price?.toFixed(2) || '0.00'}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
                      service.isActive
                        ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                    )}>
                      {service.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-center font-mono font-medium text-muted-foreground">
                    {service.usageCount || 0}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                              onClick={() => {
                                setAssigningService(service);
                                setIsAssignToClientOpen(true);
                              }}
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Assign to Client</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                              onClick={() => handleOpenEdit(service)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit Service</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              onClick={() => handleDeleteClick(service)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete Service</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {meta && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t px-4 pb-4 bg-muted/5">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1} to{" "}
                {Math.min(page * limit, meta.total)} of{" "}
                {meta.total} entries
              </p>
              <Select
                value={limit.toString()}
                onValueChange={(value) => {
                  setLimit(parseInt(value));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[70px] bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 30, 40, 50].map((option) => (
                    <SelectItem key={option} value={option.toString()}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 bg-background"
                  onClick={() => setPage(1)}
                  disabled={page === 1 || isFetching}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 bg-background"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isFetching}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {(() => {
                  const pageNumbers: (number | string)[] = [];
                  if (totalPages <= 7) {
                    for (let i = 1; i <= totalPages; i++) {
                      pageNumbers.push(i);
                    }
                  } else {
                    if (page <= 3) {
                      pageNumbers.push(1, 2, 3, 4, "...", totalPages);
                    } else if (page >= totalPages - 2) {
                      pageNumbers.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                    } else {
                      pageNumbers.push(1, "...", page - 1, page, page + 1, "...", totalPages);
                    }
                  }
                  return pageNumbers.map((num, idx) =>
                    num === "..." ? (
                      <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
                        ...
                      </span>
                    ) : (
                      <Button
                        key={num}
                        variant={page === num ? "default" : "outline"}
                        size="icon"
                        className={cn("h-8 w-8", page !== num && "bg-background")}
                        onClick={() => setPage(num as number)}
                        disabled={isFetching}
                      >
                        {num}
                      </Button>
                    )
                  );
                })()}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 bg-background"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || isFetching}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 bg-background"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages || isFetching}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <Dialog open={isAddEditOpen} onOpenChange={setIsAddEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedService ? "Edit Service" : "Add Service"}</DialogTitle>
            <DialogDescription>
              Enter the details of the service.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                step="any"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value ? Number(e.target.value) : "" })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {selectedService ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the service.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isMigrationDialogOpen} onOpenChange={setIsMigrationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Migration Required</DialogTitle>
            <DialogDescription>
              This service is currently in use. Please migrate usage to another service before deleting.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Target Service</Label>
              <Combobox
                options={
                  servicesData?.data
                    .filter((s) => s._id !== selectedService?._id)
                    .map((s) => ({
                      value: s._id,
                      label: s.name,
                    })) || []
                }
                value={migrationTargetId}
                onChange={setMigrationTargetId}
                placeholder="Select target service..."
                searchPlaceholder="Search service..."
                emptyText="No service found."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMigrationDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!migrationTargetId || isDeleting}
              onClick={handleMigrateAndDelete}
            >
              Migrate & Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AssignServiceToClientDialog
        isOpen={isAssignToClientOpen}
        onClose={() => {
          setIsAssignToClientOpen(false);
          setAssigningService(null);
        }}
        service={assigningService}
      />
    </div>
  );
}
