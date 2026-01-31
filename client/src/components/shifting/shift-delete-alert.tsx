'use client';

import { useDeleteShiftMutation } from '@/redux/features/shift/shiftApi';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { DropdownMenuItem } from '../ui/dropdown-menu';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Spinner } from '../ui/spinner';

export default function ShiftDeleteAlert({ shiftId }: { shiftId: string }) {
    const [openDelete, setOpenDelete] = useState(false);

    const [deleteShift, { isLoading: isDeleting }] = useDeleteShiftMutation();

    const handleDelete = async () => {
        try {
            await deleteShift(shiftId).unwrap();
            toast.success('Shift deleted successfully');
            setOpenDelete(false);
        } catch (err: any) {
            toast.error(
                err?.data?.message || err?.message || 'Something went wrong.',
            );
        }
    };

    return (
        <>
            <DropdownMenuItem
                className="text-destructive"
                onSelect={(e) => {
                    e.preventDefault();
                    setOpenDelete(true);
                }}
            >
                <Trash2 className=" h-4 w-4" />
                Delete
            </DropdownMenuItem>

            <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete this shift.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>
                            Cancel
                        </AlertDialogCancel>

                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? <Spinner /> : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
