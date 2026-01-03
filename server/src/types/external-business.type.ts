import type { Types, Document } from 'mongoose';

// ============ External Business Types ============
export interface IExternalBusiness extends Document {
    _id: Types.ObjectId;
    name: string;
    description?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    isActive: boolean;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

export interface IExternalBusinessPopulated
    extends Omit<IExternalBusiness, 'createdBy'> {
    createdBy: {
        _id: string;
        name: string;
        email: string;
    };
}

export interface CreateExternalBusinessData {
    name: string;
    description?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
}

export interface UpdateExternalBusinessData {
    name?: string;
    description?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    isActive?: boolean;
}

// ============ Profit Transfer Types ============
export interface IProfitTransfer extends Document {
    _id: Types.ObjectId;
    businessId: Types.ObjectId;
    amount: number;
    transferDate: Date;
    periodType: 'month' | 'year';
    month?: number;
    year: number;
    notes?: string;
    transferredBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

export interface IProfitTransferPopulated
    extends Omit<IProfitTransfer, 'businessId' | 'transferredBy'> {
    businessId: {
        _id: string;
        name: string;
    };
    transferredBy: {
        _id: string;
        name: string;
        email: string;
    };
}

export interface CreateProfitTransferData {
    businessId: string;
    amount: number;
    transferDate?: Date;
    periodType: 'month' | 'year';
    month?: number;
    year: number;
    notes?: string;
}

// ============ Query Params ============
export interface ExternalBusinessQueryParams {
    page?: number;
    limit?: number;
    isActive?: boolean;
}

export interface ProfitTransferQueryParams {
    page?: number;
    limit?: number;
    businessId?: string;
    periodType?: 'month' | 'year';
    year?: number;
    month?: number;
}

// ============ Stats Types ============
export interface ProfitTransferStats {
    totalTransferred: number;
    transferCount: number;
    byBusiness: {
        businessId: string;
        businessName: string;
        totalAmount: number;
        transferCount: number;
    }[];
}
