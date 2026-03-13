export interface ICalendarDay {
    date: string; // YYYY-MM-DD
    status:
        | "present"
        | "late"
        | "absent"
        | "half_day"
        | "early_exit"
        | "on_leave"
        | "holiday"
        | "off_day"
        | "unemployed"
        | "future"
        | "weekend"
        | string;
    shiftStart?: string | null;  // "09:00"
    shiftEnd?: string | null;    // "18:00"
    checkInAt?: string | null;   // ISO string
    checkOutAt?: string | null;  // ISO string
}

export interface IPayrollItem {
    _id: string;
    name: string;
    staffId: string;
    designation: string;
    image: string;

    // Statuses
    status: "paid" | "pending" | "partially_paid" | string;
    otStatus: "paid" | "pending" | string;

    // Salary Data
    salary: number;
    payableSalary: number;
    paidAmount: number;
    perDaySalary: number;
    expenseId?: string | null;
    paidDate?: string | null;

    // Attendance Data
    workDays: number;
    present: number;
    absent: number;
    late: number;
    onLeave: number;
    holiday: number;
    halfDay: number;
    unemployedDays: number;

    // Overtime Data
    otMinutes: number;
    otPayable: number;
    otPaidAmount: number;

    // Bank Details
    bankName?: string;
    branch?: string;
    bank?: {
        bankName?: string;
        accountNumber?: string;
        accountHolderName?: string;
        branch?: string;
        routingNumber?: string;
    };
    branchId?: string;

    // Calendar
    calendar?: ICalendarDay[];
}

export interface IPayrollLock {
    _id: string;
    month: string;
    lockedBy: string | { name: string; _id: string };
    createdAt: string;
    updatedAt: string;
}

export interface IAttendanceRecord {
    _id: string;
    staffId: string;
    shiftId: string;
    date: string;
    status: string;
    isManual: boolean;
    notes?: string;
    processedAt: string;
}

export interface IPayrollAlert {
    staffId: string;
    staffName: string;
    type: string;
    message: string;
}
