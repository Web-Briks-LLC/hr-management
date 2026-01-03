import type { Types, Document } from 'mongoose';

// ============ Shareholder Types ============
export interface IShareholder extends Document {
    _id: Types.ObjectId;
    name: string;
    email: string;
    percentage: number;
    isActive: boolean;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

export interface IShareholderPopulated extends Omit<IShareholder, 'createdBy'> {
    createdBy: {
        _id: string;
        name: string;
        email: string;
    };
}

export interface CreateShareholderData {
    name: string;
    email: string;
    percentage: number;
}

export interface UpdateShareholderData {
    name?: string | undefined;
    email?: string | undefined;
    percentage?: number | undefined;
    isActive?: boolean | undefined;
}

// ============ Profit Distribution Types ============
export interface IProfitDistribution extends Document {
    _id: Types.ObjectId;
    shareholderId: Types.ObjectId;
    periodType: 'month' | 'year';
    month?: number | undefined; // 1-12, required if periodType is 'month'
    year: number;
    totalProfit: number;
    sharePercentage: number;
    shareAmount: number;
    status: 'pending' | 'distributed';
    distributedAt?: Date | undefined;
    distributedBy: Types.ObjectId;
    notes?: string | undefined;
    createdAt: Date;
    updatedAt: Date;
}

export interface IProfitDistributionPopulated
    extends Omit<IProfitDistribution, 'shareholderId' | 'distributedBy'> {
    shareholderId: {
        _id: string;
        name: string;
        email: string;
        percentage: number;
    };
    distributedBy: {
        _id: string;
        name: string;
        email: string;
    };
}

export interface DistributeProfitData {
    shareholderIds: string[]; // 'all' will be handled in controller
    periodType: 'month' | 'year';
    month?: number | undefined;
    year: number;
    notes?: string | undefined;
    customAmount?: number | undefined; // Direct amount to share (bypasses percentage calculation)
}

// ============ Profit Summary Types ============
export interface ProfitSummary {
    totalEarnings: number;
    totalExpenses: number;
    netProfit: number;
    period: {
        type: 'month' | 'year';
        month?: number | undefined;
        year: number;
    };
}

export interface ShareholderQueryParams {
    page?: number;
    limit?: number;
    isActive?: boolean;
}

export interface DistributionQueryParams {
    page?: number;
    limit?: number;
    shareholderId?: string;
    periodType?: 'month' | 'year';
    year?: number;
    month?: number;
    status?: 'pending' | 'distributed';
}
