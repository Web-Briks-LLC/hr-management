import mongoose, { Types } from 'mongoose';
import AssetModel from '../models/asset.model.js';
import currencyRateService from './currency-rate.service.js';
import type {
    IAsset,
    AssetQueryParams,
    AssetStats,
    AssetCategory,
} from '../types/asset.type.js';
import { escapeRegex } from '../lib/sanitize.js';

const CATEGORY_TAG_PREFIX: Record<AssetCategory, string> = {
    electronics_it: 'IT',
    furniture_fixture: 'FUR',
    office_supplies_pantry: 'PAN',
    appliances_facilities: 'APP',
    documents_legal: 'DOC',
    software_licenses: 'SFT',
    vehicles_machinery: 'VEH',
    other: 'GEN',
};

// Generate unique sequential asset tag (e.g., AST-IT-2026-0001)
async function generateAssetTag(category?: AssetCategory): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = category && CATEGORY_TAG_PREFIX[category] ? CATEGORY_TAG_PREFIX[category] : 'AST';
    
    // Find the latest asset with this tag pattern
    const pattern = new RegExp(`^AST-${prefix}-${year}-(\\d+)$`);
    const latestAsset = await AssetModel.findOne({
        assetTag: { $regex: pattern },
    })
        .sort({ createdAt: -1 })
        .select('assetTag')
        .lean();

    let seq = 1;
    if (latestAsset?.assetTag) {
        const match = latestAsset.assetTag.match(pattern);
        if (match && match[1]) {
            seq = parseInt(match[1], 10) + 1;
        }
    } else {
        // Also check general count as fallback
        const count = await AssetModel.countDocuments();
        seq = count + 1;
    }

    const paddedSeq = String(seq).padStart(4, '0');
    let candidate = `AST-${prefix}-${year}-${paddedSeq}`;

    // Ensure uniqueness
    let exists = await AssetModel.exists({ assetTag: candidate });
    while (exists) {
        seq += 1;
        candidate = `AST-${prefix}-${year}-${String(seq).padStart(4, '0')}`;
        exists = await AssetModel.exists({ assetTag: candidate });
    }

    return candidate;
}

// Create new asset
async function createAssetInDB(
    data: Partial<IAsset>,
    userId: string,
): Promise<IAsset> {
    if (!data.assetTag || data.assetTag.trim() === '') {
        data.assetTag = await generateAssetTag(data.category as AssetCategory);
    } else {
        // Verify unique assetTag
        const existing = await AssetModel.findOne({
            assetTag: data.assetTag.trim(),
        });
        if (existing) {
            throw new Error(`Asset with tag "${data.assetTag}" already exists.`);
        }
    }

    const qty = Number(data.quantity) || 1;
    const price = Number(data.purchasePrice) || 0;
    const totalCost = data.totalCost !== undefined ? Number(data.totalCost) : qty * price;

    const branchId = data.branchId && Types.ObjectId.isValid(String(data.branchId))
        ? new Types.ObjectId(String(data.branchId))
        : undefined;
    const assignedTo = data.assignedTo && Types.ObjectId.isValid(String(data.assignedTo))
        ? new Types.ObjectId(String(data.assignedTo))
        : undefined;

    const newAsset = new AssetModel({
        ...data,
        branchId,
        assignedTo,
        quantity: qty,
        purchasePrice: price,
        totalCost,
        createdBy: new Types.ObjectId(userId),
    });

    await newAsset.save();
    return newAsset;
}

// Helper to enrich populated Staff documents with User name, email, and avatar
async function attachStaffUserDetails(assets: any[]) {
    if (!assets || assets.length === 0) return assets;

    const userIdsToFetch: any[] = [];
    for (const asset of assets) {
        if (asset?.assignedTo && asset.assignedTo.userId) {
            const uid = asset.assignedTo.userId;
            userIdsToFetch.push(uid);
            if (Types.ObjectId.isValid(String(uid))) {
                userIdsToFetch.push(new Types.ObjectId(String(uid)));
            }
            userIdsToFetch.push(String(uid));
        }
    }

    if (userIdsToFetch.length === 0) {
        for (const asset of assets) {
            if (asset?.assignedTo && !asset.assignedTo.name) {
                asset.assignedTo.name = asset.assignedTo.designation || 'Assigned Staff';
            }
        }
        return assets;
    }

    try {
        const db = mongoose.connection.db;
        if (db) {
            const users = await db
                .collection('user')
                .find({ _id: { $in: userIdsToFetch } })
                .project({ name: 1, email: 1, image: 1 })
                .toArray();

            const userMap = new Map<string, any>();
            for (const u of users) {
                userMap.set(String(u._id), u);
            }

            for (const asset of assets) {
                if (asset?.assignedTo) {
                    if (asset.assignedTo.userId) {
                        const u = userMap.get(String(asset.assignedTo.userId));
                        if (u) {
                            asset.assignedTo.name = u.name || u.email || 'Unnamed Staff';
                            asset.assignedTo.email = u.email || '';
                            asset.assignedTo.avatar = u.image || '';
                        }
                    }
                    if (!asset.assignedTo.name) {
                        asset.assignedTo.name = asset.assignedTo.designation || 'Assigned Staff';
                    }
                }
            }
        }
    } catch (err) {
        console.error('Error fetching user details for staff:', err);
    }

    return assets;
}

// Get assets with filters and pagination
async function getAssetsWithFilters(params: AssetQueryParams) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};

    // Search query across multiple fields
    if (params.search && params.search.trim()) {
        const safeSearch = escapeRegex(params.search.trim());
        const searchRegex = new RegExp(safeSearch, 'i');
        query.$or = [
            { name: searchRegex },
            { assetTag: searchRegex },
            { serialNumber: searchRegex },
            { modelNumber: searchRegex },
            { vendor: searchRegex },
            { location: searchRegex },
            { notes: searchRegex },
            { subCategory: searchRegex },
        ];
    }

    // Category filter
    if (params.category && params.category !== 'all') {
        query.category = params.category;
    }

    // Status filter
    if (params.status && params.status !== 'all') {
        query.status = params.status;
    }

    // Condition filter
    if (params.condition && params.condition !== 'all') {
        query.condition = params.condition;
    }

    // Branch filter
    if (params.branchId && params.branchId !== 'all' && Types.ObjectId.isValid(params.branchId)) {
        query.branchId = new Types.ObjectId(params.branchId);
    }

    // AssignedTo filter
    if (params.assignedTo && params.assignedTo !== 'all' && Types.ObjectId.isValid(params.assignedTo)) {
        query.assignedTo = new Types.ObjectId(params.assignedTo);
    }

    // Date range filter
    if (params.startDate || params.endDate) {
        query.purchaseDate = {};
        if (params.startDate) {
            query.purchaseDate.$gte = new Date(params.startDate);
        }
        if (params.endDate) {
            query.purchaseDate.$lte = new Date(params.endDate);
        }
    }

    // Sorting
    const sortField = params.sortBy || 'createdAt';
    const sortDirection = params.sortOrder === 'asc' ? 1 : -1;
    const sortOptions: Record<string, 1 | -1> = { [sortField]: sortDirection };

    const [rawAssets, total] = await Promise.all([
        AssetModel.find(query)
            .populate('branchId', 'name code')
            .populate('assignedTo', 'staffId userId designation department phone')
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .lean(),
        AssetModel.countDocuments(query),
    ]);

    const assets = await attachStaffUserDetails(rawAssets);

    return {
        assets,
        total,
        page,
        totalPages: Math.ceil(total / limit) || 1,
    };
}

// Get single asset by ID
async function getAssetByIdFromDB(id: string) {
    if (!Types.ObjectId.isValid(id)) {
        return null;
    }

    const asset = await AssetModel.findById(id)
        .populate('branchId', 'name code address')
        .populate('assignedTo', 'staffId userId designation department phone')
        .lean();

    if (asset) {
        await attachStaffUserDetails([asset]);
    }
    return asset;
}

// Update asset
async function updateAssetInDB(
    id: string,
    data: Partial<IAsset>,
    userId: string,
) {
    if (!Types.ObjectId.isValid(id)) {
        throw new Error('Invalid Asset ID');
    }

    // If updating assetTag, verify uniqueness
    if (data.assetTag && data.assetTag.trim()) {
        const existing = await AssetModel.findOne({
            _id: { $ne: id },
            assetTag: data.assetTag.trim(),
        });
        if (existing) {
            throw new Error(`Asset with tag "${data.assetTag}" already exists.`);
        }
    }

    // Recalculate total cost if price or qty supplied
    if (data.purchasePrice !== undefined || data.quantity !== undefined) {
        const current = await AssetModel.findById(id).select('purchasePrice quantity totalCost');
        const qty = data.quantity !== undefined ? Number(data.quantity) : (current?.quantity || 1);
        const price = data.purchasePrice !== undefined ? Number(data.purchasePrice) : (current?.purchasePrice || 0);
        data.totalCost = data.totalCost !== undefined ? Number(data.totalCost) : qty * price;
    }

    if (data.branchId !== undefined) {
        data.branchId = data.branchId && Types.ObjectId.isValid(String(data.branchId))
            ? new Types.ObjectId(String(data.branchId))
            : null as any;
    }
    if (data.assignedTo !== undefined) {
        data.assignedTo = data.assignedTo && Types.ObjectId.isValid(String(data.assignedTo))
            ? new Types.ObjectId(String(data.assignedTo))
            : null as any;
    }

    const updated = await AssetModel.findByIdAndUpdate(
        id,
        {
            $set: {
                ...data,
                updatedBy: new Types.ObjectId(userId),
            },
        },
        { new: true, runValidators: true },
    )
        .populate('branchId', 'name code')
        .populate('assignedTo', 'staffId userId designation department phone')
        .lean();

    if (updated) {
        await attachStaffUserDetails([updated]);
    }

    return updated;
}

// Delete asset
async function deleteAssetFromDB(id: string) {
    if (!Types.ObjectId.isValid(id)) {
        throw new Error('Invalid Asset ID');
    }

    const result = await AssetModel.findByIdAndDelete(id);
    return result;
}

// Get comprehensive asset statistics
async function getAssetStatsFromDB(): Promise<AssetStats> {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
        totalDistinctAssets,
        qtyValuationAgg,
        statusAgg,
        categoryAgg,
        recentAssetsCount,
        expiringWarrantyCount,
        expiringDocumentsCount,
    ] = await Promise.all([
        AssetModel.countDocuments(),
        AssetModel.aggregate([
            {
                $group: {
                    _id: '$currency',
                    totalCost: { $sum: '$totalCost' },
                    totalQuantity: { $sum: '$quantity' },
                },
            },
        ]),
        AssetModel.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalQuantity: { $sum: '$quantity' },
                },
            },
        ]),
        AssetModel.aggregate([
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    totalQuantity: { $sum: '$quantity' },
                    totalCost: { $sum: '$totalCost' },
                },
            },
            { $sort: { totalCost: -1 } },
        ]),
        AssetModel.countDocuments({
            createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
        }),
        AssetModel.countDocuments({
            warrantyExpiry: { $gte: now, $lte: thirtyDaysFromNow },
        }),
        AssetModel.countDocuments({
            expiryDate: { $gte: now, $lte: thirtyDaysFromNow },
        }),
    ]);

    // Calculate total quantities and valuation
    let totalQuantity = 0;
    const totalValuation: { amount: number; currency: string }[] = [];
    let totalValuationBDT = 0;

    for (const item of qtyValuationAgg) {
        totalQuantity += item.totalQuantity || 0;
        const curr = (item._id || 'BDT').toUpperCase();
        totalValuation.push({
            amount: item.totalCost || 0,
            currency: curr,
        });

        if (curr === 'BDT') {
            totalValuationBDT += item.totalCost || 0;
        } else {
            const rate = await currencyRateService.getRateForCurrency(currentMonth, currentYear, curr);
            totalValuationBDT += (item.totalCost || 0) * rate;
        }
    }

    // Status map
    const statusMap: Record<string, number> = {};
    for (const s of statusAgg) {
        if (s._id) {
            statusMap[s._id] = s.count || 0;
        }
    }

    // Category map
    const categoryCounts = categoryAgg.map((c) => ({
        category: c._id as AssetCategory,
        count: c.count || 0,
        totalQuantity: c.totalQuantity || 0,
        totalCost: c.totalCost || 0,
    }));

    return {
        totalDistinctAssets,
        totalQuantity,
        totalValuation,
        totalValuationBDT,
        statusCounts: {
            inUse: statusMap['in_use'] || 0,
            inStock: statusMap['in_stock'] || 0,
            maintenance: statusMap['maintenance'] || 0,
            damaged: statusMap['damaged'] || 0,
            disposed: statusMap['disposed'] || 0,
            lost: statusMap['lost'] || 0,
            expired: statusMap['expired'] || 0,
        },
        categoryCounts,
        recentAssetsCount,
        expiringWarrantyCount,
        expiringDocumentsCount,
    };
}

export default {
    generateAssetTag,
    createAssetInDB,
    getAssetsWithFilters,
    getAssetByIdFromDB,
    updateAssetInDB,
    deleteAssetFromDB,
    getAssetStatsFromDB,
};
