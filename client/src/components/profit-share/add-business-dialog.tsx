'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { IconPlus } from '@tabler/icons-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCreateBusinessMutation } from '@/redux/features/externalBusiness/externalBusinessApi';

export function AddBusinessDialog() {
    const [open, setOpen] = useState(false);
    const [createBusiness, { isLoading }] = useCreateBusinessMutation();

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        contactPerson: '',
        phone: '',
        email: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name || formData.name.length < 2) {
            newErrors.name = 'Name must be at least 2 characters';
        }
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            const response = await createBusiness(formData).unwrap();
            toast.success(response.message);
            setFormData({
                name: '',
                description: '',
                contactPerson: '',
                phone: '',
                email: '',
            });
            setOpen(false);
        } catch (error: unknown) {
            if (error && typeof error === 'object' && 'data' in error) {
                const err = error as { data?: { message?: string } };
                toast.error(err.data?.message || 'Failed to create business');
            } else {
                toast.error('Failed to create business');
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <IconPlus className="mr-2 size-4" />
                    Add Business
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add External Business</DialogTitle>
                    <DialogDescription>
                        Add a new business for profit transfer tracking.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Business Name *</Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder="Enter business name"
                            value={formData.name}
                            onChange={handleChange}
                        />
                        {errors.name && (
                            <p className="text-sm text-destructive">{errors.name}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            name="description"
                            placeholder="Business description"
                            value={formData.description}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="contactPerson">Contact Person</Label>
                            <Input
                                id="contactPerson"
                                name="contactPerson"
                                placeholder="Contact name"
                                value={formData.contactPerson}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                name="phone"
                                placeholder="Phone number"
                                value={formData.phone}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="Email address"
                            value={formData.email}
                            onChange={handleChange}
                        />
                        {errors.email && (
                            <p className="text-sm text-destructive">{errors.email}</p>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Creating...' : 'Create Business'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
