import type { Types } from 'mongoose';

export interface IAttendanceDay {
    staffId: Types.ObjectId;
    date: Date;
    status:
        | 'present'
        | 'absent'
        | 'on_leave'
        | 'weekend'
        | 'holiday'
        | 'half_day'
        | 'late'
        | 'early_exit';
    totalMinutes: number;
    lateMinutes: number;
    earlyExitMinutes: number;
    otMinutes: number;
    payableAmount: number;
    deductionAmount: number;
    otAmount: number;
    isManual: boolean;
    isAutoAbsent: boolean;
    shiftId: Types.ObjectId;
    checkInAt?: Date | null;
    checkOutAt?: Date | null;
    leaveRequestId?: Types.ObjectId | null;
    notes?: string | null;
    processedAt?: Date | null;
}
