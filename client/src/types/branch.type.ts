export interface IBranch {
    _id: string;

    name: string;
    code: string;

    address?: string;

    isActive: boolean;

    createdBy: string;

    createdAt: Date;
    updatedAt: Date;
}
