import type { Document, Types } from 'mongoose';

export interface IService extends Document {
    _id: Types.ObjectId;
    name: string;
    description?: string;
    price?: number;
    isActive: boolean;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
