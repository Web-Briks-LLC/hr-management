'use client';

import { useState } from 'react';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { useRouter } from 'next/navigation';

export function ProfileSetupAlert() {
    const [open, setOpen] = useState(true);
    const router = useRouter();

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Profile setup required</AlertDialogTitle>

                    <AlertDialogDescription>
                        You must complete your profile setup to continue using
                        the dashboard.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogAction
                        onClick={() => {
                            router.push('/account?edit-profile=true');
                            setOpen(false);
                        }}
                    >
                        Continue
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
