import { IBranch } from "./branch.type";
import { IUser } from "./user.type";

export default interface IStaff {
    _id: string;
    userId: string;
    staffId: string;

    user: IUser;
    branch: IBranch;

    phone: string;

    branchId: string;
    department?: string;
    designation: string;
    joinDate: Date;
    status: "active" | "inactive" | "terminated";

    dateOfBirth?: Date;
    nationalId?: string;
    bloodGroup?: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
    address?: string;

    emergencyContact?: {
        name: string;
        relation: string;
        phone: string;
    };

    fathersName?: string;
    mothersName?: string;
    spouseName?: string;

    bank?: {
        bankName?: string;
        accountNumber?: string;
        accountHolderName?: string;
        branch?: string;
        routingNumber?: string;
    };

    profileCompleted: boolean;

    exitDate?: Date;
    pendingStatus?: "inactive" | "terminated";
    // Inclusive Bangladesh calendar dates; an omitted endDate means ongoing.
    inactivePeriods?: { startDate: Date; endDate?: Date; status: "inactive" | "terminated" }[];

    salary: number;
    salaryVisibleToEmployee: boolean;
    isSalaryPinSet?: boolean;

    createdAt: Date;
    updatedAt: Date;
}
