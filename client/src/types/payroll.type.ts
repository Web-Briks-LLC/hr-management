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
}
