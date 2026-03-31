"use client";

import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  TrendingUp,
  Box,
} from "lucide-react";
import { IconPackage } from "@tabler/icons-react";
import {
  useGetServicesQuery,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useDeleteServiceMutation,
  useLazyCheckServiceUsageQuery,
} from "@/redux/features/service/serviceApi";
import { toast } from "sonner";
import { IService } from "@/types/order.type";
import { cn } from "@/lib/utils";

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
  const [selectedService, setSelectedService] = useState<
    (IService & { usageCount: number }) | null
  >(null);
  const [migrationTargetId, setMigrationTargetId] = useState("");

  // Form States
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isActive: true,
  });

  const services = servicesData?.data || [];
  const meta = servicesData?.meta || { total: 0 };
  const totalPages = Math.ceil(meta.total / limit);

  const handleOpenAdd = () => {
    setSelectedService(null);
    setFormData({ name: "", description: "", isActive: true });
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (service: IService & { usageCount: number }) => {
    setSelectedService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
      isActive: service.isActive,
    });
    setIsAddEditOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedService) {
        await updateService({
          id: selectedService._id,
          data: formData,
        }).unwrap();
        toast.success("Service updated successfully");
      } else {
        await createService(formData).unwrap();
        toast.success("Service created successfully");
      }
      setIsAddEditOpen(false);
    } catch (error) {
      toast.error((error as Error).message || "Something went wrong");
    }
  };

  const handleDeleteClick = async (
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
  };

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
    <div className="space-y-8 p-1 animate-in fade-in duration-500">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text">
            Service Registry
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm sm:text-base">
            Define and manage your order services, track usage metrics, and
            ensure workflow consistency.
          </p>
        </div>
        <Button
          onClick={handleOpenAdd}
          className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 h-11 px-6 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="mr-2 h-5 w-5" /> Add New Service
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Services */}
        <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-slate-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-slate-500/5 hover:border-slate-500/30">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-slate-500/10 blur-2xl transition-all duration-300 group-hover:bg-slate-500/20" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/10 text-slate-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-slate-500/20">
                <IconPackage className="h-5 w-5" />
              </div>
            </div>
            <h3 className="text-3xl font-bold tracking-tight text-slate-600 dark:text-slate-100">
              {meta.total}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 font-bold">
              TOTAL SERVICES
            </p>
          </div>
        </div>

        {/* Active Services */}
        <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-green-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/5 hover:border-green-500/30">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-green-500/10 blur-2xl transition-all duration-300 group-hover:bg-green-500/20" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-green-500/20">
                <CheckCircle className="h-5 w-5" />
              </div>
            </div>
            <h3 className="text-3xl font-bold tracking-tight text-green-600 dark:text-green-400">
              {services.filter((s) => s.isActive).length}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 font-bold">
              ACTIVE SERVICES
            </p>
          </div>
        </div>

        {/* Total Usage Count */}
        <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-blue-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-500/30">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-blue-500/10 blur-2xl transition-all duration-300 group-hover:bg-blue-500/20" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-500/20">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <h3 className="text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
              {services.reduce((acc, curr) => acc + (curr.usageCount || 0), 0)}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 font-bold">
              TOTAL USAGES
            </p>
          </div>
        </div>

        {/* Unused Services */}
        <div className="group relative overflow-hidden rounded-2xl border bg-linear-to-br from-amber-500/10 via-card to-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/5 hover:border-amber-500/30">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-amber-500/10 blur-2xl transition-all duration-300 group-hover:bg-amber-500/20" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-amber-500/20">
                <Box className="h-5 w-5" />
              </div>
            </div>
            <h3 className="text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {services.filter((s) => s.usageCount === 0).length}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 font-bold">
              UNUSED SERVICES
            </p>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="flex justify-between items-center bg-transparent mb-2">
        <div className="relative w-full max-w-sm group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            placeholder="Search everything..."
            className="pl-9 h-10 bg-white border-slate-200 focus:border-primary focus:ring-1 ring-primary/20 transition-all w-full rounded-lg shadow-xs"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Main Table Container */}
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-24 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
            <p className="text-sm text-slate-400 font-medium">
              Syncing services...
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-slate-100">
                  <TableHead className="py-4 text-slate-900 font-bold text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                      Service Name <TrendingUp className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-slate-900 font-bold text-xs uppercase tracking-wider">
                    Description
                  </TableHead>
                  <TableHead className="text-center text-slate-900 font-bold text-xs uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="text-center text-slate-900 font-bold text-xs uppercase tracking-wider">
                    Usage
                  </TableHead>
                  <TableHead className="text-right text-slate-900 font-bold text-xs uppercase tracking-wider pr-6">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <IconPackage className="h-10 w-10 opacity-20" />
                        <p className="font-bold italic">No services found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  services.map((service) => (
                    <TableRow
                      key={service._id}
                      className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 group last:border-0"
                    >
                      <TableCell className="py-4 font-bold text-slate-900">
                        {service.name}
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm italic">
                        {service.description || "—"}
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        <Badge
                          variant={service.isActive ? "default" : "outline"}
                          className={cn(
                            "px-3 py-0.5 rounded-full text-[10px] font-bold shadow-none",
                            service.isActive
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                              : "bg-slate-50 text-slate-400 border-slate-100",
                          )}
                        >
                          {service.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        <div className="flex flex-col items-center font-bold">
                          <span className="font-bold text-slate-900">
                            {service.usageCount}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                            Orders
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6 font-bold">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(service)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(service)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination Footer */}
            <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/20 font-bold">
              <div className="text-sm text-slate-500 order-2 sm:order-1 font-bold">
                Showing{" "}
                <span className="font-bold text-slate-900">
                  {(page - 1) * limit + 1}
                </span>{" "}
                to{" "}
                <span className="font-bold text-slate-900">
                  {Math.min(page * limit, meta.total)}
                </span>{" "}
                of{" "}
                <span className="font-bold text-slate-900">{meta.total}</span>{" "}
                rows
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-8 order-1 sm:order-2 font-bold">
                <div className="flex items-center gap-3 font-bold">
                  <span className="text-sm text-slate-500 font-bold">
                    Rows per page
                  </span>
                  <Select
                    value={limit.toString()}
                    onValueChange={(v) => {
                      setLimit(parseInt(v));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-16 h-9 rounded-lg bg-white border-slate-200 text-xs font-bold focus:ring-0 shadow-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-6 font-bold">
                  <span className="text-sm text-slate-500 font-bold whitespace-nowrap">
                    Page{" "}
                    <span className="font-bold text-slate-900">{page}</span> of{" "}
                    <span className="font-bold text-slate-900">
                      {totalPages || 1}
                    </span>
                  </span>

                  <div className="flex items-center gap-1.5 font-bold">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-lg border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
                      onClick={() => setPage(1)}
                      disabled={page === 1 || isFetching}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-lg border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
                      onClick={() => setPage((p) => p - 1)}
                      disabled={page === 1 || isFetching}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-lg border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={
                        page === totalPages || totalPages === 0 || isFetching
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-lg border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
                      onClick={() => setPage(totalPages)}
                      disabled={
                        page === totalPages || totalPages === 0 || isFetching
                      }
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddEditOpen} onOpenChange={setIsAddEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {selectedService ? "Edit Service" : "Add New Service"}
            </DialogTitle>
            <DialogDescription>
              Create or update services for your order workflows.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Service Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g. Clipping Path"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief details about the service..."
                className="resize-none"
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="isActive">Service is currently active</Label>
            </div>
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAddEditOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {(isCreating || isUpdating) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {selectedService ? "Save Changes" : "Create Service"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Standard Delete Alert */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2 font-bold">
              <AlertTriangle className="h-5 w-5" /> Delete Service
            </AlertDialogTitle>
            <AlertDialogDescription className="font-bold">
              Are you sure you want to delete{" "}
              <span className="font-bold text-foreground">
                {selectedService?.name}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{" "}
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Migration Required Dialog */}
      <Dialog
        open={isMigrationDialogOpen}
        onOpenChange={setIsMigrationDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-warning font-bold">
              <RefreshCw className="h-5 w-5" /> Migration Required
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2 font-bold">
              <p>
                The service{" "}
                <span className="font-bold text-foreground">
                  {selectedService?.name}
                </span>{" "}
                is currently used by
                <Badge variant="secondary" className="mx-1">
                  {selectedService?.usageCount}
                </Badge>{" "}
                active orders.
              </p>
              <p className="text-amber-600 font-bold bg-amber-50 p-2 rounded text-xs">
                It cannot be deleted until you migrate these orders to a
                different service.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 font-bold">
            <div className="space-y-1.5">
              <Label className="font-bold">Migrate orders to:</Label>
              <Select
                value={migrationTargetId}
                onValueChange={setMigrationTargetId}
              >
                <SelectTrigger className="font-bold shadow-xs">
                  <SelectValue placeholder="Select target service..." />
                </SelectTrigger>
                <SelectContent>
                  {servicesData?.data
                    .filter((s) => s._id !== selectedService?._id)
                    .map((s) => (
                      <SelectItem
                        key={s._id}
                        value={s._id}
                        className="font-bold"
                      >
                        {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 font-bold">
            <Button
              variant="ghost"
              className="font-bold"
              onClick={() => {
                setIsMigrationDialogOpen(false);
                setMigrationTargetId("");
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!migrationTargetId || isDeleting}
              onClick={handleMigrateAndDelete}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md shadow-amber-200"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Migrate & Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
