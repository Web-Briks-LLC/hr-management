import type { Document, Types } from 'mongoose';

export interface IReturnFileFormat extends Document {
    _id: Types.ObjectId;
    name: string;
    extension: string;
    description?: string;
    isActive: boolean;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
