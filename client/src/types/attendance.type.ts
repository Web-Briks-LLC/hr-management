export type AttendanceStatus =
    | 'present'
    | 'absent'
    | 'on_leave'
    | 'weekend'
    | 'holiday'
    | 'half_day'
    | 'late'
    | 'early_exit';

export interface IAttendanceDay {
    _id: string;
    staffId: string | { _id: string; staffId: string; name: string; designation: string; userId: { name: string; email: string } };
    shiftId: string | { _id: string; name: string };
    date: string;
    status: AttendanceStatus;
    checkInAt?: string;
    checkOutAt?: string;
    totalMinutes: number;
    lateMinutes: number;
    earlyExitMinutes: number;
    otMinutes: number;
    payableAmount: number;
    deductionAmount: number;
    otAmount: number;
    leaveRequestId?: string;
    isManual: boolean;
    isAutoAbsent: boolean;
    notes?: string;
    processedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface AttendanceHistoryResponse {
    success: boolean;
    data: IAttendanceDay[];
}

export interface TodayAttendanceResponse {
    success: boolean;
    attendance: {
        attendanceDay: IAttendanceDay | null;
        stats: {
            todayStatus: string;
            checkIn: string | null;
            checkOut: string | null;
            workingMinutes: number;
        }
    }
}

export interface IMonthlyAttendanceStats {
    month: string;
    present: number;
    late: number;
    totalOvertimeMinutes: number;
}
