'use client';

import { useState } from 'react';
import { useCreateInvitationMutation } from '@/redux/features/invitation/invitationApi';
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
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import { Role } from '@/constants/role';

export default function SendInvitation() {
    const [createInvitation, { isLoading }] = useCreateInvitationMutation();
    const [formData, setFormData] = useState({
        email: '',
        role: '',
        department: '',
        designation: '',
        salary: '',
        branchId: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (
            !formData.email ||
            !formData.role ||
            !formData.designation ||
            !formData.salary ||
            !formData.branchId
        ) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            const payload: any = {
                email: formData.email,
                role: formData.role as 'staff' | 'team_leader',
                designation: formData.designation,
                salary: Number(formData.salary),
                branchId: formData.branchId,
            };

            if (formData.department) {
                payload.department = formData.department;
            }

            await createInvitation(payload).unwrap();

            toast.success('Invitation sent successfully!');
            setFormData({
                email: '',
                role: '',
                department: '',
                designation: '',
                salary: '',
                branchId: '',
            });
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to send invitation');
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Send New Invitation</CardTitle>
                <CardDescription>
                    Send an invitation email to a new staff member
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">
                                Email{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="staff@example.com"
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

                        <div className="space-y-2">
                            <Label htmlFor="role">
                                Role <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={formData.role}
                                onValueChange={(value) =>
                                    setFormData({ ...formData, role: value })
                                }
                            >
                                <SelectTrigger id="role">
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={Role.STAFF}>
                                        Staff
                                    </SelectItem>
                                    <SelectItem value={Role.TEAM_LEADER}>
                                        Team Leader
                                    </SelectItem>
                                    <SelectItem value={Role.HR_MANAGER}>
                                        HR Manager
                                    </SelectItem>
                                    <SelectItem value={Role.ADMIN}>
                                        Admin
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="designation">
                                Designation{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="designation"
                                placeholder="e.g., Software Engineer"
                                value={formData.designation}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        designation: e.target.value,
                                    })
                                }
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="department">Department</Label>
                            <Input
                                id="department"
                                placeholder="e.g., Engineering"
                                value={formData.department}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        department: e.target.value,
                                    })
                                }
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="salary">
                                Salary{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="salary"
                                type="number"
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

                        <div className="space-y-2">
                            <Label htmlFor="branchId">Branch ID</Label>
                            <Input
                                id="branchId"
                                placeholder="Optional"
                                value={formData.branchId}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        branchId: e.target.value,
                                    })
                                }
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full md:w-auto"
                    >
                        {isLoading ? 'Sending...' : 'Send Invitation'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
