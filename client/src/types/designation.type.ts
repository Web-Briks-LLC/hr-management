import { IDepartment } from "./department.type";

export interface IDesignation {
    _id: string;
    title: string;
    code?: string;
    departmentId?: IDepartment | string;
    description?: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}
