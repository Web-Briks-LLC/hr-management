import type { Document, Types } from 'mongoose';

export type AssetCategory =
    | 'electronics_it'
    | 'furniture_fixture'
    | 'office_supplies_pantry'
    | 'appliances_facilities'
    | 'documents_legal'
    | 'software_licenses'
    | 'vehicles_machinery'
    | 'other';

export type AssetStatus =
    | 'in_use'
    | 'in_stock'
    | 'maintenance'
    | 'damaged'
    | 'disposed'
    | 'lost'
    | 'expired';

export type AssetCondition = 'new' | 'good' | 'fair' | 'poor' | 'damaged';

export interface IAssetCustomField {
    key: string;
    value: string;
}

export interface IAssetDocument {
    name: string;
    url: string;
    fileType?: string;
    uploadedAt?: Date;
}

export interface IAsset extends Document {
    name: string;
    assetTag: string;
    category: AssetCategory;
    subCategory?: string;
    quantity: number;
    unit: string;
    purchasePrice: number;
    totalCost: number;
    currency: string;
    currentValue?: number;
    purchaseDate?: Date;
    status: AssetStatus;
    condition: AssetCondition;
    location?: string;
    branchId?: Types.ObjectId;
    assignedTo?: Types.ObjectId;
    assignedDepartment?: string;
    assignedDate?: Date;
    vendor?: string;
    invoiceNumber?: string;
    serialNumber?: string;
    modelNumber?: string;
    warrantyExpiry?: Date;
    expiryDate?: Date;
    specifications?: Record<string, string>;
    customFields?: IAssetCustomField[];
    documents?: IAssetDocument[];
    notes?: string;
    createdBy: Types.ObjectId;
    updatedBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

export interface IAssetPopulated extends Omit<IAsset, 'branchId' | 'assignedTo' | 'createdBy' | 'updatedBy'> {
    branchId?: {
        _id: string;
        name: string;
        code: string;
    };
    assignedTo?: {
        _id: string;
        name: string;
        email: string;
        designation?: string;
        department?: string;
        avatar?: string;
    };
    createdBy: {
        _id: string;
        name: string;
        email: string;
    };
    updatedBy?: {
        _id: string;
        name: string;
        email: string;
    };
}

export interface AssetQueryParams {
    page?: number | undefined;
    limit?: number | undefined;
    search?: string | undefined;
    category?: AssetCategory | 'all' | undefined;
    status?: AssetStatus | 'all' | undefined;
    condition?: AssetCondition | 'all' | undefined;
    branchId?: string | undefined;
    assignedTo?: string | undefined;
    sortBy?: string | undefined;
    sortOrder?: 'asc' | 'desc' | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}

export interface AssetStats {
    totalDistinctAssets: number;
    totalQuantity: number;
    totalValuation: {
        amount: number;
        currency: string;
    }[];
    totalValuationBDT: number;
    statusCounts: {
        inUse: number;
        inStock: number;
        maintenance: number;
        damaged: number;
        disposed: number;
        lost: number;
        expired: number;
    };
    categoryCounts: {
        category: AssetCategory;
        count: number;
        totalQuantity: number;
        totalCost: number;
    }[];
    recentAssetsCount: number;
    expiringWarrantyCount: number;
    expiringDocumentsCount: number;
}
