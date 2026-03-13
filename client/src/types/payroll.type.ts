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
        | "weekend";
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
    status: "paid" | "pending" | "partially_paid";
    otStatus: "paid" | "pending";

    // Salary Data
    salary: number;
    payableSalary: number;
    paidAmount: number;
    perDaySalary: number;

    // Attendance Data
    workDays: number;
    present: number;
    absent: number;
    late: number;

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
