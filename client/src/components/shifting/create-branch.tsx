'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Role } from '@/constants/role';
import { useSession } from '@/lib/auth-client';
import { zodResolver } from '@hookform/resolvers/zod';
import { IconPlus } from '@tabler/icons-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';

import { useCreateBranchMutation } from '@/redux/features/branch/branchApi';
import { Spinner } from '../ui/spinner';
import { useState } from 'react';

const branchSchema = z.object({
    name: z.string().min(2, 'Branch name is required'),
    code: z.string().min(2, 'Branch code is required'),
    address: z.string().optional(),
    isActive: z.boolean().default(true).optional(),
});

type BranchFormValues = z.infer<typeof branchSchema>;

export default function CreateBranch() {
    const { data: session, isPending, isRefetching } = useSession();
    const [createBranch, { isLoading: isCreating }] = useCreateBranchMutation();

    const [open, setOpen] = useState<Boolean>(false);

    const form = useForm<BranchFormValues>({
        resolver: zodResolver(branchSchema),
        defaultValues: {
            name: '',
            address: '',
            code: '',
            isActive: true,
        },
    });

    const isLoading = isPending || isRefetching || isCreating;

    const onSubmit = async (values: BranchFormValues) => {
        try {
            await createBranch({
                ...values,
                code: values.code.toUpperCase(),
            }).unwrap();

            toast.success('Branch created successfully');

            form.reset({
                name: '',
                address: '',
                code: '',
                isActive: true,
            });

            setOpen(false);
        } catch (error) {
            toast.error((error as Error).message || 'Failed to create branch');
        }
    };

    const canCreate =
        session &&
        (session.user.role === Role.SUPER_ADMIN ||
            session.user.role === Role.ADMIN);

    return (
        <Dialog open={!!open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button disabled={isLoading || !canCreate}>
                    <IconPlus />
                    New Branch
                </Button>
            </DialogTrigger>

            <DialogContent className="w-full max-w-md">
                <DialogHeader>
                    <DialogTitle>Create Branch</DialogTitle>
                    <DialogDescription>
                        Add a new branch for your organization.
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                >
                    <div className="grid gap-2">
                        <Label>Branch Name *</Label>
                        <Input
                            placeholder="Dhaka Head Office"
                            {...form.register('name')}
                        />
                        <p className="text-sm text-destructive">
                            {form.formState.errors.name?.message}
                        </p>
                    </div>

                    <div className="grid gap-2">
                        <Label>Branch Code *</Label>
                        <Input
                            placeholder="DHA"
                            value={form.watch('code')}
                            onChange={(e) =>
                                form.setValue(
                                    'code',
                                    e.target.value.toUpperCase(),
                                )
                            }
                        />
                        <p className="text-sm text-destructive">
                            {form.formState.errors.code?.message}
                        </p>
                    </div>

                    <div className="grid gap-2">
                        <Label>Address</Label>
                        <Input
                            placeholder="Dhaka, Bangladesh"
                            {...form.register('address')}
                        />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-1">
                            <Label>Status</Label>
                            <p className="text-sm text-muted-foreground">
                                Branch is currently active or inactive
                            </p>
                        </div>

                        <Switch
                            checked={form.watch('isActive')}
                            onCheckedChange={(value) =>
                                form.setValue('isActive', value, {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                })
                            }
                        />
                    </div>

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </DialogClose>

                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? <Spinner /> : 'Create Branch'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
