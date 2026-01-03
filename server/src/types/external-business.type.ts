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
    description?: string | undefined;
    contactPerson?: string | undefined;
    phone?: string | undefined;
    email?: string | undefined;
}

export interface UpdateExternalBusinessData {
    name?: string | undefined;
    description?: string | undefined;
    contactPerson?: string | undefined;
    phone?: string | undefined;
    email?: string | undefined;
    isActive?: boolean | undefined;
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
    transferDate?: Date | undefined;
    periodType: 'month' | 'year';
    month?: number | undefined;
    year: number;
    notes?: string | undefined;
}

// ============ Query Params ============
export interface ExternalBusinessQueryParams {
    page?: number | undefined;
    limit?: number | undefined;
    isActive?: boolean | undefined;
}

export interface ProfitTransferQueryParams {
    page?: number | undefined;
    limit?: number | undefined;
    businessId?: string | undefined;
    periodType?: 'month' | 'year' | undefined;
    year?: number | undefined;
    month?: number | undefined;
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
