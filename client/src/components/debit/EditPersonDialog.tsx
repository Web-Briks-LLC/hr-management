'use client';

import { useState } from 'react';
import { useUpdatePersonMutation } from '@/redux/features/debit/debitApi';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Person {
    _id: string;
    name: string;
    phone?: string;
    address?: string;
    description?: string;
}

interface EditPersonDialogProps {
    person: Person;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditPersonDialog({
    person,
    open,
    onOpenChange,
}: EditPersonDialogProps) {
    const [name, setName] = useState(person.name);
    const [phone, setPhone] = useState(person.phone || '');
    const [address, setAddress] = useState(person.address || '');
    const [description, setDescription] = useState(person.description || '');
    const [error, setError] = useState('');

    const [updatePerson, { isLoading }] = useUpdatePersonMutation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (name.trim().length < 2) {
            setError('Name must be at least 2 characters.');
            return;
        }

        try {
            await updatePerson({
                id: person._id,
                name,
                phone,
                address,
                description,
            }).unwrap();
            toast.success('Person updated successfully');
            onOpenChange(false);
        } catch (err: any) {
            toast.error(`Failed to update person: ${err?.data?.message || err.message}`);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Person</DialogTitle>
                    <DialogDescription>
                        Update the person details.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                            id="phone"
                            placeholder="017..."
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Textarea
                            id="address"
                            placeholder="Address..."
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            placeholder="Additional info..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
