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
    uploadedAt?: string;
}

export interface IAsset {
    _id: string;
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
    purchaseDate?: string;
    status: AssetStatus;
    condition: AssetCondition;
    location?: string;
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
        phone?: string;
    };
    assignedDepartment?: string;
    assignedDate?: string;
    vendor?: string;
    invoiceNumber?: string;
    serialNumber?: string;
    modelNumber?: string;
    warrantyExpiry?: string;
    expiryDate?: string;
    specifications?: Record<string, string>;
    customFields?: IAssetCustomField[];
    documents?: IAssetDocument[];
    notes?: string;
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
    createdAt: string;
    updatedAt: string;
}

export interface AssetFilters {
    page?: number;
    limit?: number;
    search?: string;
    category?: AssetCategory | 'all';
    status?: AssetStatus | 'all';
    condition?: AssetCondition | 'all';
    branchId?: string;
    assignedTo?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    startDate?: string;
    endDate?: string;
}

export interface AssetStatsResponse {
    success: boolean;
    message: string;
    data: {
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
    };
}

export interface AssetsResponse {
    success: boolean;
    message: string;
    data: IAsset[];
    meta: {
        total: number;
        page: number;
        totalPages: number;
    };
}

export interface AssetResponse {
    success: boolean;
    message: string;
    data: IAsset;
}

export const ASSET_CATEGORIES: {
    id: AssetCategory;
    label: string;
    description: string;
    examples: string;
}[] = [
    {
        id: 'electronics_it',
        label: 'IT & Electronics',
        description: 'Computers, Laptops, Monitors, Keyboards, Routers, Servers',
        examples: 'MacBook, Dell Desktop, Monitor, Mouse, Printer',
    },
    {
        id: 'furniture_fixture',
        label: 'Furniture & Fixture',
        description: 'Chairs, Tables, Workstations, Sofas, Shelves',
        examples: 'Ergonomic Chair, Standing Desk, Conference Table',
    },
    {
        id: 'office_supplies_pantry',
        label: 'Office Supplies & Pantry',
        description: 'Mugs, Sandals, Slippers, Kitchenware, Stationery',
        examples: 'Coffee Mug, Sandals/Slippers, Water Dispenser, Pens',
    },
    {
        id: 'appliances_facilities',
        label: 'Appliances & Facilities',
        description: 'ACs, Fans, Refrigerator, Microwave, Lights, CCTV',
        examples: 'Gree 2 Ton AC, Microwave Oven, Refrigerator',
    },
    {
        id: 'documents_legal',
        label: 'Documents & Legal',
        description: 'Trade Licenses, Incorporation, Leases, Insurance',
        examples: 'Trade License, Office Rental Lease, Fire License',
    },
    {
        id: 'software_licenses',
        label: 'Software & Subscriptions',
        description: 'Domains, SaaS Tools, Hosting, Design/Dev Seats',
        examples: 'Google Workspace, Figma Org, Cloud Hosting, GitHub',
    },
    {
        id: 'vehicles_machinery',
        label: 'Vehicles & Machinery',
        description: 'Company Bikes, Cars, Heavy Generators, UPS Units',
        examples: 'Office Bike, 50kVA Generator, Online UPS',
    },
    {
        id: 'other',
        label: 'Other Assets',
        description: 'Miscellaneous assets and general equipment',
        examples: 'Decoration, Trophy, Safe Box',
    },
];

export const ASSET_STATUS_CONFIG: Record<
    AssetStatus,
    { label: string; bg: string; text: string; border: string }
> = {
    in_use: {
        label: 'In Use',
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        text: 'text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-500/20',
    },
    in_stock: {
        label: 'In Stock',
        bg: 'bg-blue-500/10 dark:bg-blue-500/20',
        text: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-500/20',
    },
    maintenance: {
        label: 'Maintenance',
        bg: 'bg-amber-500/10 dark:bg-amber-500/20',
        text: 'text-amber-600 dark:text-amber-400',
        border: 'border-amber-500/20',
    },
    damaged: {
        label: 'Damaged',
        bg: 'bg-rose-500/10 dark:bg-rose-500/20',
        text: 'text-rose-600 dark:text-rose-400',
        border: 'border-rose-500/20',
    },
    disposed: {
        label: 'Disposed',
        bg: 'bg-zinc-500/10 dark:bg-zinc-500/20',
        text: 'text-zinc-600 dark:text-zinc-400',
        border: 'border-zinc-500/20',
    },
    lost: {
        label: 'Lost',
        bg: 'bg-red-500/10 dark:bg-red-500/20',
        text: 'text-red-600 dark:text-red-400',
        border: 'border-red-500/20',
    },
    expired: {
        label: 'Expired',
        bg: 'bg-purple-500/10 dark:bg-purple-500/20',
        text: 'text-purple-600 dark:text-purple-400',
        border: 'border-purple-500/20',
    },
};

export const ASSET_CONDITION_CONFIG: Record<
    AssetCondition,
    { label: string; bg: string; text: string }
> = {
    new: { label: 'Brand New', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
    good: { label: 'Good Condition', bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400' },
    fair: { label: 'Fair / Usable', bg: 'bg-yellow-500/10', text: 'text-yellow-600 dark:text-yellow-400' },
    poor: { label: 'Poor / Worn', bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400' },
    damaged: { label: 'Damaged', bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400' },
};
