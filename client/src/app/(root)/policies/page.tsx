"use client";

import { useState, useMemo } from "react";
import {
  useGetPoliciesQuery,
  useCreatePolicyMutation,
  useUpdatePolicyMutation,
  useTogglePolicyStatusMutation,
  useDeletePolicyMutation,
} from "@/redux/features/policy/policyApi";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil, Info } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { PolicyForm } from "@/components/policy/PolicyForm";
import { StackedAvatars } from "@/components/policy/StackedAvatars";
import { useSession } from "@/lib/auth-client";
import { Role } from "@/constants/role";
import { Skeleton } from "@/components/ui/skeleton";
import { CreatePolicyData, IPolicy } from "@/types/policy.type";

export default function PoliciesPage() {
  const { data: session } = useSession();
  const isAdmin = useMemo(() => {
    return [Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER].includes(
      session?.user?.role as Role,
    );
  }, [session]);

  const { data, isLoading } = useGetPoliciesQuery();
  const [createPolicy, { isLoading: isCreating }] = useCreatePolicyMutation();
  const [updatePolicy, { isLoading: isUpdating }] = useUpdatePolicyMutation();
  const [toggleStatus, { isLoading: isToggling }] =
    useTogglePolicyStatusMutation();
  const [deletePolicy] = useDeletePolicyMutation();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<IPolicy | null>(null);
  const [viewingPolicy, setViewingPolicy] = useState<IPolicy | null>(null);

  const policies = data?.policies || [];

  const handleCreate = async (formData: CreatePolicyData) => {
    try {
      await createPolicy(formData).unwrap();
      toast.success("Policy created successfully");
      setIsCreateOpen(false);
    } catch (error) {
      toast.error("Failed to create policy");
      console.error(error);
    }
  };

  const handleUpdate = async (formData: CreatePolicyData) => {
    if (!editingPolicy) return;
    try {
      await updatePolicy({ id: editingPolicy._id, data: formData }).unwrap();
      toast.success("Policy updated successfully");
      setEditingPolicy(null);
    } catch (error) {
      toast.error("Failed to update policy");
      console.error(error);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await toggleStatus({ id, data: { isActive: !currentStatus } }).unwrap();
      toast.success(`Policy ${!currentStatus ? "activated" : "deactivated"}`);
    } catch (error) {
      toast.error("Failed to update status");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePolicy(id).unwrap();
      toast.success("Policy deleted successfully");
    } catch (error) {
      toast.error("Failed to delete policy");
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Organization Policies
          </h2>
          <p className="text-muted-foreground">
            View and manage company-wide or targeted policies and track
            acceptance.
          </p>
        </div>
        {isAdmin && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus />
                Create Policy
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Policy</DialogTitle>
                <DialogDescription>
                  Define a new policy and target it to specific branches or
                  departments.
                </DialogDescription>
              </DialogHeader>
              <PolicyForm onSubmit={handleCreate} isLoading={isCreating} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Dialog
        open={!!editingPolicy}
        onOpenChange={(open) => !open && setEditingPolicy(null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Policy</DialogTitle>
          </DialogHeader>
          {editingPolicy && (
            <PolicyForm
              initialData={editingPolicy}
              onSubmit={handleUpdate}
              isLoading={isUpdating}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!viewingPolicy}
        onOpenChange={(open) => !open && setViewingPolicy(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {viewingPolicy?.title}
            </DialogTitle>
            <DialogDescription>
              Published on{" "}
              {viewingPolicy &&
                format(new Date(viewingPolicy.createdAt), "PPP")}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 prose prose-slate dark:prose-invert max-w-none">
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">
              {viewingPolicy?.description}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>All Policies</CardTitle>
          <CardDescription>
            A list of all policies defined in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Title</TableHead>
                  {isAdmin ? (
                    <>
                      <TableHead>Targeting</TableHead>
                      <TableHead>Accepted By</TableHead>
                      <TableHead>Status</TableHead>
                    </>
                  ) : (
                    <TableHead className="w-[400px]">Description</TableHead>
                  )}
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      {isAdmin && (
                        <>
                          <TableCell>
                            <Skeleton className="h-4 w-24" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-6 w-20" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-12" />
                          </TableCell>
                        </>
                      )}
                      {!isAdmin && (
                        <TableCell>
                          <Skeleton className="h-4 w-56" />
                        </TableCell>
                      )}
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-16 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : policies.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isAdmin ? 6 : 4}
                      className="h-24 text-center"
                    >
                      No policies found.
                    </TableCell>
                  </TableRow>
                ) : (
                  policies.map((policy) => (
                    <TableRow key={policy._id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-1">
                          <span>{policy.title}</span>
                          {policy.requiresAcceptance && (
                            <Badge variant="secondary" className="text-[10px]">
                              Requires Acceptance
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      {isAdmin ? (
                        <>
                          <TableCell>
                            <div className="flex flex-col gap-1 text-xs">
                              <span className="text-muted-foreground">
                                Branch:{" "}
                                {policy.branchId
                                  ? (policy.branchId as { name: string }).name
                                  : "Global"}
                              </span>
                              <span className="text-muted-foreground">
                                Dept: {policy.department || "All"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-2">
                              <StackedAvatars
                                users={policy.acceptedBy.map((a) => ({
                                  _id: a.user._id,
                                  name: a.user.name,
                                  avatar: a.user.avatar,
                                }))}
                              />
                              <span className="text-[10px] text-muted-foreground">
                                {policy.acceptedBy.length} users accepted
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Switch
                                title={
                                  policy.isActive ? "Deactivate" : "Activate"
                                }
                                checked={policy.isActive}
                                onCheckedChange={() =>
                                  handleToggleStatus(
                                    policy._id,
                                    policy.isActive,
                                  )
                                }
                                disabled={isToggling}
                              />
                              <span className="text-xs">
                                {policy.isActive ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <TableCell>
                          <p className="text-sm text-muted-foreground line-clamp-1 max-w-[400px]">
                            {policy.description}
                          </p>
                        </TableCell>
                      )}
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(policy.createdAt), "PPP")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewingPolicy(policy)}
                            className="h-8 w-8"
                            title="View Content"
                          >
                            <Info className="h-4 w-4" />
                          </Button>

                          {isAdmin && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingPolicy(policy)}
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title="Edit Policy"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    title="Delete Policy"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Are you absolutely sure?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will
                                      permanently delete the policy and all
                                      acceptance records.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(policy._id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
