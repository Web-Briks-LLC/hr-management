'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useCreateInvitationMutation } from '@/redux/features/invitation/invitationApi';
import { useGetAllBranchesQuery } from '@/redux/features/branch/branchApi';
import { useGetAllShiftsQuery } from '@/redux/features/shift/shiftApi';
import { useGetMetadataByTypeQuery } from '@/redux/features/metadata/metadataApi';
import { useSession } from '@/lib/auth-client';
import { Loader, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

type RoleType =
    | 'staff'
    | 'team_leader'
    | 'admin'
    | 'super_admin'
    | 'hr_manager';

const ROLE_LABELS: Record<RoleType, string> = {
    staff: 'Staff',
    team_leader: 'Team Leader',
    admin: 'Admin',
    super_admin: 'Super Admin',
    hr_manager: 'HR Manager',
};

export default function InviteEmployeeDialog() {
    const [open, setOpen] = useState(false);
    const { data: session } = useSession();
    const [createInvitation, { isLoading }] = useCreateInvitationMutation();
    const { data: branchesData } = useGetAllBranchesQuery(undefined);
    const { data: shiftsData } = useGetAllShiftsQuery(undefined);
    const { data: departmentsData } = useGetMetadataByTypeQuery('department');
    const { data: designationsData } = useGetMetadataByTypeQuery('designation');

    const currentUserRole = session?.user?.role as RoleType | undefined;

    const [formData, setFormData] = useState({
        email: '',
        salary: '',
        role: 'staff' as RoleType,
        department: '',
        designation: '',
        branchId: '',
        shiftId: '',
        expiryHours: '48',
    });

    // Determine available roles based on current user's role
    const getAvailableRoles = (): RoleType[] => {
        const baseRoles: RoleType[] = ['staff', 'team_leader'];

        if (currentUserRole === 'super_admin') {
            return [
                'staff',
                'team_leader',
                'admin',
                'super_admin',
                'hr_manager',
            ];
        }

        if (currentUserRole === 'admin') {
            return ['staff', 'team_leader', 'admin', 'hr_manager'];
        }

        if (currentUserRole === 'hr_manager') {
            return ['staff', 'team_leader'];
        }

        return baseRoles;
    };

    const availableRoles = getAvailableRoles();

    // Admin roles don't require branch assignment
    const isAdminRole = ['admin', 'super_admin', 'hr_manager'].includes(
        formData.role,
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            await createInvitation({
                email: formData.email,
                salary: Number(formData.salary),
                role: formData.role,
                department: formData.department || undefined,
                designation: formData.designation,
                branchId:
                    formData.branchId && formData.branchId !== 'unassigned'
                        ? formData.branchId
                        : undefined,
                shiftId:
                    formData.shiftId === 'unassigned'
                        ? undefined
                        : formData.shiftId || undefined,
                expiryHours: Number(formData.expiryHours),
            }).unwrap();

            toast.success('Invitation sent successfully!');
            setOpen(false);
            setFormData({
                email: '',
                salary: '',
                role: 'staff',
                department: '',
                designation: '',
                branchId: '',
                shiftId: '',
                expiryHours: '48',
            });
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to send invitation');
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Invite Team Member
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>
                        Send an invitation email to a new team member with their
                        position details.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Email */}
                        <div className="col-span-1 sm:col-span-2 grid gap-2">
                            <Label htmlFor="email">Email Address *</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="john@example.com"
                                value={formData.email}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        email: e.target.value,
                                    })
                                }
                                required
                            />
                        </div>

                        {/* Role */}
                        <div className="grid gap-2">
                            <Label htmlFor="role">Role *</Label>
                            <Select
                                value={formData.role}
                                onValueChange={(value: RoleType) =>
                                    setFormData({ ...formData, role: value })
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableRoles.map((role) => (
                                        <SelectItem key={role} value={role}>
                                            {ROLE_LABELS[role]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Designation */}
                        <div className="grid gap-2">
                            <Label htmlFor="designation">Designation *</Label>
                            <Select
                                value={formData.designation}
                                onValueChange={(value) =>
                                    setFormData({
                                        ...formData,
                                        designation: value,
                                    })
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select designation" />
                                </SelectTrigger>
                                <SelectContent>
                                    {designationsData?.data?.map((d) => (
                                        <SelectItem key={d._id} value={d.value}>
                                            {d.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Department */}
                        <div className="grid gap-2">
                            <Label htmlFor="department">Department</Label>
                            <Select
                                value={formData.department}
                                onValueChange={(value) =>
                                    setFormData({
                                        ...formData,
                                        department: value,
                                    })
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select department" />
                                </SelectTrigger>
                                <SelectContent>
                                    {departmentsData?.data?.map((d) => (
                                        <SelectItem key={d._id} value={d.value}>
                                            {d.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Salary */}
                        <div className="grid gap-2">
                            <Label htmlFor="salary">Salary (৳) *</Label>
                            <Input
                                id="salary"
                                type="number"
                                min="0"
                                placeholder="50000"
                                value={formData.salary}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        salary: e.target.value,
                                    })
                                }
                                required
                            />
                        </div>

                        {/* Branch */}
                        <div className="grid gap-2">
                            <Label htmlFor="branch">
                                Branch {isAdminRole ? '(Optional)' : '*'}
                            </Label>
                            <Select
                                value={formData.branchId}
                                onValueChange={(value) =>
                                    setFormData({
                                        ...formData,
                                        branchId: value,
                                    })
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select branch" />
                                </SelectTrigger>
                                <SelectContent>
                                    {isAdminRole && (
                                        <SelectItem value="unassigned">
                                            None
                                        </SelectItem>
                                    )}
                                    {branchesData?.branches?.map(
                                        (branch: any) => (
                                            <SelectItem
                                                key={branch._id}
                                                value={branch._id}
                                            >
                                                {branch.name}
                                            </SelectItem>
                                        ),
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Shift */}
                        <div className="grid gap-2">
                            <Label htmlFor="shift">Shift (Optional)</Label>
                            <Select
                                value={formData.shiftId}
                                onValueChange={(value) =>
                                    setFormData({ ...formData, shiftId: value })
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select shift" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned">
                                        None
                                    </SelectItem>
                                    {shiftsData?.shifts?.map((shift: any) => (
                                        <SelectItem
                                            key={shift._id}
                                            value={shift._id}
                                        >
                                            {shift.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Expiry */}
                        <div className="grid gap-2">
                            <Label htmlFor="expiry">Link Expiry *</Label>
                            <Select
                                value={formData.expiryHours}
                                onValueChange={(value) =>
                                    setFormData({
                                        ...formData,
                                        expiryHours: value,
                                    })
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="24">24 hours</SelectItem>
                                    <SelectItem value="48">48 hours</SelectItem>
                                    <SelectItem value="72">72 hours</SelectItem>
                                    <SelectItem value="168">1 week</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader className="h-4 w-4 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                'Send Invitation'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
