export interface IInvitationCreate {
    email: string;
    salary: number;
    role: 'staff' | 'team_leader' | 'admin' | 'super_admin' | 'hr_manager';
    department?: string;
    designation: string;
    branchId?: string;
    shiftId?: string;
    expiryHours?: number;
}

export interface IInvitation {
    _id: string;
    email: string;
    token: string;
    expiresAt: string;
    isUsed: boolean;
    usedAt?: string;
    salary: number;
    role: string;
    department?: string;
    designation: string;
    branchId: any;
    shiftId?: any;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export interface IAcceptInvitation {
    name: string;
    password: string;
    phone: string;
    address?: string;
    dateOfBirth?: string;
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
