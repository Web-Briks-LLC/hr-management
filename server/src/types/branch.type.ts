import { Types } from 'mongoose';

export interface IBranch {
    _id: Types.ObjectId;

    name: string;
    code: string;

    address?: string;

    isActive: boolean;

    createdBy: Types.ObjectId;

    createdAt: Date;
    updatedAt: Date;
}
