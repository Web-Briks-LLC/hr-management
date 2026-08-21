export interface IDepartment {
    _id: string;
    name: string;
    code?: string;
    description?: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}
