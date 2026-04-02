export interface IPolicyAcceptance {
    user: {
        _id: string;
        name: string;
        email: string;
        avatar?: string;
    };
    acceptedAt: string;
}

export interface IPolicy {
    _id: string;
    title: string;
    description: string;
    branchId?: {
        _id: string;
        name: string;
    } | string;
    department?: string;
    designations?: string[];
    requiresAcceptance: boolean;
    isActive: boolean;
    acceptedBy: IPolicyAcceptance[];
    createdBy?: {
        _id: string;
        name: string;
    };
    createdAt: string;
    updatedAt: string;
}

export interface CreatePolicyData {
    title: string;
    description: string;
    branchId?: string;
    department?: string;
    designations?: string[];
    requiresAcceptance: boolean;
}

export interface TogglePolicyStatusData {
    isActive: boolean;
}
