'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useGetMeQuery } from '@/redux/features/staff/staffApi';
import { UserCircle } from 'lucide-react';
import IStaff from '@/types/staff.type';
import { useSession } from '@/lib/auth-client';

// Helper to check if bank fields are missing
function isBankDetailsMissing(staff: Partial<IStaff> | undefined) {
    if (!staff) return true;
    return !staff.bankAccountNo || !staff.bankAccountName || !staff.bankName;
}

export function ProfileCompletionDialog() {
    const router = useRouter();
    const { data: session } = useSession();
    const { data: staffData, isLoading: isStaffLoading } = useGetMeQuery(
        {},
        { skip: !session?.user?.id },
    );
    const staff = staffData?.staff as IStaff | undefined;

    const [isOpen, setIsOpen] = useState(false);

    // Check for missing bank details
    useEffect(() => {
        if (!isStaffLoading && staff) {
            if (isBankDetailsMissing(staff)) {
                setIsOpen(true);
            }
        }
    }, [staff, isStaffLoading]);

    const searchParams = useSearchParams();
    const isEditingProfile = searchParams.get('edit-profile') === 'true';

    // Show dialog if open AND we are not editing profile
    const showDialog = isOpen && !isEditingProfile;

    if (!showDialog) return null;

    const handleGoToProfile = () => {
        setIsOpen(false);
        router.push('/account?edit-profile=true');
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="w-full max-w-lg">
                <DialogHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <UserCircle className="h-12 w-12 text-primary" />
                        </div>
                    </div>
                    <DialogTitle className="text-xl text-center">
                        প্রোফাইল সম্পূর্ণ করুন
                    </DialogTitle>
                    <DialogDescription className="text-center pt-4 space-y-3">
                        <span className="block">
                            প্রিয় সহকর্মী, আপনার প্রোফাইলে ব্যাংক একাউন্টের
                            তথ্য দেওয়া হয়নি।
                        </span>
                        <span className="block">
                            বেতন প্রদান সঠিকভাবে করার জন্য আপনার ব্যাংক একাউন্ট
                            নম্বর, একাউন্ট হোল্ডারের নাম এবং ব্যাংকের নাম প্রদান
                            করুন।
                        </span>
                        <span className="block font-medium text-foreground">
                            নিচের বাটনে ক্লিক করে আপনার প্রোফাইল আপডেট করুন।
                        </span>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="sm:justify-center pt-4">
                    <Button
                        onClick={handleGoToProfile}
                        size="lg"
                        className="w-full sm:w-auto"
                    >
                        <UserCircle className="h-4 w-4" />
                        প্রোফাইল এডিট করুন
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
