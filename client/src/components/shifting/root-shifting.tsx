'use client';

import { useGetAllShiftsQuery } from '@/redux/features/shift/shiftApi';
import { Spinner } from '../ui/spinner';
import { useSession } from '@/lib/auth-client';
import CreateBranch from './create-branch';
import CreateShift from './create-shift';
import ShiftCard from './shift-card';
import { IShift } from '@/types/shift.type';
import ShiftCardSkeleton from './shift-card-skeleton';
import AssignShift from './assign-shift';

export default function RootShifting() {
    const { isPending, isRefetching } = useSession();
    const { data: shiftData, isLoading: isShiftLoading } = useGetAllShiftsQuery(
        {},
        {
            refetchOnMountOrArgChange: true,
        },
    );

    const isLoading = isShiftLoading || isPending || isRefetching;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">All shifts</h2>

                <div className="flex items-center gap-4">
                    <CreateBranch />
                    <CreateShift />
                    <AssignShift />
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <ShiftCardSkeleton key={i} />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 items-start">
                    {shiftData?.shifts?.map((shift: IShift) => (
                        <ShiftCard shift={shift} key={shift._id} />
                    ))}
                </div>
            )}
        </div>
    );
}
