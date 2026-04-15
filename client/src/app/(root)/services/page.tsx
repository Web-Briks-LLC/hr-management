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
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useGetServicesQuery,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useDeleteServiceMutation,
  useLazyCheckServiceUsageQuery,
} from "@/redux/features/service/serviceApi";
import { toast } from "sonner";
import { IService } from "@/types/order.type";
import { DataTable } from "@/components/ui/data-table";
import { getColumns } from "./columns";

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

  const handleOpenAdd = useCallback(() => {
    setSelectedService(null);
    setFormData({ name: "", description: "", isActive: true });
    setIsAddEditOpen(true);
  }, []);

  const handleOpenEdit = useCallback((service: IService & { usageCount: number }) => {
    setSelectedService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
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

  const services = useMemo(() => servicesData?.data || [], [servicesData]);
  const meta = servicesData?.meta || { total: 0 };
  const totalPages = Math.ceil(meta.total / limit);

  const columns = useMemo(() => getColumns({
    onEdit: handleOpenEdit,
    onDelete: handleDeleteClick,
  }), [handleOpenEdit, handleDeleteClick]);

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
    <div className="container mx-auto py-10 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Services</h1>
          <p className="text-muted-foreground">
            Manage your order services and track usage.
          </p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add Service
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{meta.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {services.filter((s) => s.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {services.reduce((acc, curr) => acc + (curr.usageCount || 0), 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unused</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {services.filter((s) => s.usageCount === 0).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter services..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={services}
        isLoading={isLoading}
      />

      {!isLoading && services.length > 0 && (
        <div className="flex items-center justify-between py-4">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages || 1}
          </div>
          <div className="flex items-center gap-6 lg:gap-8">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium">Rows per page</p>
              <Select
                value={limit.toString()}
                onValueChange={(v) => {
                  setLimit(parseInt(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={limit} />
                </SelectTrigger>
                <SelectContent align="end">
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setPage(1)}
                disabled={page === 1 || isFetching}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1 || isFetching}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setPage((p) => p + 1)}
                disabled={page === totalPages || totalPages === 0 || isFetching}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages || totalPages === 0 || isFetching}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

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
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
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
              <Select value={migrationTargetId} onValueChange={setMigrationTargetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target service..." />
                </SelectTrigger>
                <SelectContent>
                  {servicesData?.data
                    .filter((s) => s._id !== selectedService?._id)
                    .map((s) => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
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
    </div>
  );
}
