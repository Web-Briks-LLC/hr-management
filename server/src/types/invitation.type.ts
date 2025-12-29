import type { Types } from 'mongoose';

export interface IInvitationCreate {
    email: string;
    salary: number;
    role: 'staff' | 'team_leader' | 'admin' | 'super_admin' | 'hr_manager';
    department?: string;
    designation: string;
    branchId?: string;
    shiftId?: string;
    createdBy: string;
    currentUserRole: string;
    expiryHours?: number;
}

export interface IInvitationResponse {
    _id: Types.ObjectId;
    email: string;
    token: string;
    expiresAt: Date;
    isUsed: boolean;
    usedAt?: Date;
    salary: number;
    role: string;
    department?: string;
    designation: string;
    branchId?: Types.ObjectId;
    shiftId?: Types.ObjectId;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

export interface IAcceptInvitation {
    token: string;
    name: string;
    password: string;
    phone: string;
    address?: string;
    dateOfBirth?: Date;
    bloodGroup?: string;
    nationalId?: string;
    emergencyContact?: {
        name: string;
        relation: string;
        phone: string;
    };
    fathersName?: string;
    mothersName?: string;
    spouseName?: string;
}
