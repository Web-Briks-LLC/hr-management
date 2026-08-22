import type { Document, Types } from 'mongoose';

export interface IServiceStep {
    _id?: Types.ObjectId | string;
    name: string;
    code: string;
    description?: string;
    order?: number;
    isDefault?: boolean;
}

export interface IService extends Document {
    _id: Types.ObjectId;
    name: string;
    description?: string;
    price?: number;
    steps?: IServiceStep[];
    isActive: boolean;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

