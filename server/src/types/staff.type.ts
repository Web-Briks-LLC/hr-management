import type { Types } from 'mongoose';

export default interface IStaff {
    userId: Types.ObjectId;
    staffId: string;

    phone: string;

    branchId?: Types.ObjectId;
    department?: string;
    designation: string;
    joinDate: Date;
    status: 'active' | 'inactive' | 'terminated';

    dateOfBirth?: Date;
    nationalId?: string;
    bloodGroup?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
    address?: string;

    emergencyContact?: {
        name: string;
        relation: string;
        phone: string;
    };

    fathersName?: string;
    mothersName?: string;
    spouseName?: string;

    salary: number;
    salaryVisibleToEmployee: boolean;

    profileCompleted: boolean;

    exitDate?: Date;

    createdAt: Date;
    updatedAt: Date;
}
