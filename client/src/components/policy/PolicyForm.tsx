"use client";

import React, { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useGetAllBranchesQuery } from "@/redux/features/branch/branchApi";
import { DEPARTMENTS } from "@/constants/metadata";
import { CreatePolicyData, IPolicy } from "@/types/policy.type";
import { Spinner } from "../ui/spinner";

const policySchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  branchId: z.string().optional(),
  department: z.string().optional(),
  requiresAcceptance: z.boolean(),
});

type PolicyFormValues = z.infer<typeof policySchema>;

interface PolicyFormProps {
  initialData?: IPolicy;
  onSubmit: (data: CreatePolicyData) => void;
  isLoading?: boolean;
}

export function PolicyForm({
  initialData,
  onSubmit,
  isLoading,
}: PolicyFormProps) {
  const { data: branchesData } = useGetAllBranchesQuery({});
  const branches = useMemo(() => branchesData?.branches || [], [branchesData]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    control,
  } = useForm<PolicyFormValues>({
    resolver: zodResolver(policySchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      branchId:
        (initialData?.branchId as { _id: string })?._id ||
        (initialData?.branchId as string) ||
        "all",
      department: initialData?.department || "all",
      requiresAcceptance: !!initialData?.requiresAcceptance,
    },
  });

  const branchId = useWatch({ control, name: "branchId" });
  const department = useWatch({ control, name: "department" });
  const requiresAcceptance = useWatch({ control, name: "requiresAcceptance" });

  const onFormSubmit = (values: PolicyFormValues) => {
    const cleanedData: CreatePolicyData = {
      ...values,
      branchId: values.branchId === "all" ? undefined : values.branchId,
      department: values.department === "all" ? undefined : values.department,
    };
    onSubmit(cleanedData);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">
          Policy Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          placeholder="e.g. Employee Conduct Policy"
          {...register("title")}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Branch */}
      <div className="space-y-2">
        <Label htmlFor="branchId">Branch</Label>
        <Select
          onValueChange={(val) => setValue("branchId", val)}
          value={branchId || "all"}
        >
          <SelectTrigger id="branchId" className="w-full">
            <SelectValue placeholder="Select Branch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Global (All Branches)</SelectItem>
            {branches.map((branch: { _id: string; name: string }) => (
              <SelectItem key={branch._id} value={branch._id}>
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.branchId && (
          <p className="text-sm text-destructive">{errors.branchId.message}</p>
        )}
        <p className="text-sm text-muted-foreground">
          Omit for a global policy.
        </p>
      </div>

      {/* Department */}
      <div className="space-y-2">
        <Label htmlFor="department">Department</Label>
        <Select
          onValueChange={(val) => setValue("department", val)}
          value={department || "all"}
        >
          <SelectTrigger id="department" className="w-full">
            <SelectValue placeholder="Select Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {DEPARTMENTS.map((dept: { value: string; label: string }) => (
              <SelectItem key={dept.value} value={dept.value}>
                {dept.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.department && (
          <p className="text-sm text-destructive">
            {errors.department.message}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">
          Policy Description <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="description"
          placeholder="Detail the policy rules, context, and expectations..."
          className="min-h-[200px] resize-none"
          {...register("description")}
        />
        {errors.description && (
          <p className="text-sm text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Requires Acceptance */}
      <div className="flex items-start gap-3">
        <Checkbox
          id="requiresAcceptance"
          checked={!!requiresAcceptance}
          onCheckedChange={(checked) =>
            setValue("requiresAcceptance", !!checked)
          }
        />
        <div className="space-y-1">
          <Label htmlFor="requiresAcceptance" className="cursor-pointer">
            Force Mandatory Awareness
          </Label>
          <p className="text-sm text-muted-foreground">
            When enabled, employees will receive a persistent prompt to read and
            acknowledge this policy before they can proceed with their dashboard
            tasks.
          </p>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Spinner />}
          {initialData ? "Update Policy" : "Publish Policy"}
        </Button>
      </div>
    </form>
  );
}
