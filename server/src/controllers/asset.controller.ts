import type { Request, Response } from 'express';
import assetService from '../services/asset.service.js';
import {
    createAssetSchema,
    updateAssetSchema,
} from '../validators/asset.validator.js';
import type { AssetQueryParams, AssetCategory } from '../types/asset.type.js';

// Get all assets with filtering, pagination, and sorting
export async function getAllAssets(req: Request, res: Response) {
    try {
        const parseQueryParam = (val: any) => {
            if (!val || val === 'undefined' || val === 'null' || val === 'all' || val === '') return undefined;
            return String(val).trim();
        };

        const params: AssetQueryParams = {
            page: parseInt(req.query.page as string, 10) || 1,
            limit: parseInt(req.query.limit as string, 10) || 20,
            search: parseQueryParam(req.query.search),
            category: parseQueryParam(req.query.category) as AssetCategory | undefined,
            status: parseQueryParam(req.query.status) as any,
            condition: parseQueryParam(req.query.condition) as any,
            branchId: parseQueryParam(req.query.branchId),
            assignedTo: parseQueryParam(req.query.assignedTo),
            sortBy: parseQueryParam(req.query.sortBy),
            sortOrder: (req.query.sortOrder === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc',
            startDate: parseQueryParam(req.query.startDate),
            endDate: parseQueryParam(req.query.endDate),
        };

        const result = await assetService.getAssetsWithFilters(params);

        return res.status(200).json({
            success: true,
            message: 'Assets fetched successfully',
            data: result.assets,
            meta: {
                total: result.total,
                page: result.page,
                totalPages: result.totalPages,
            },
        });
    } catch (error: any) {
        console.error('Error fetching assets:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch assets',
        });
    }
}

// Get asset statistics
export async function getAssetStats(_req: Request, res: Response) {
    try {
        const stats = await assetService.getAssetStatsFromDB();

        return res.status(200).json({
            success: true,
            message: 'Asset statistics fetched successfully',
            data: stats,
        });
    } catch (error: any) {
        console.error('Error fetching asset stats:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch asset stats',
        });
    }
}

// Get asset by ID
export async function getAssetById(req: Request, res: Response) {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Asset ID is required',
            });
        }

        const asset = await assetService.getAssetByIdFromDB(id);

        if (!asset) {
            return res.status(404).json({
                success: false,
                message: 'Asset not found',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Asset retrieved successfully',
            data: asset,
        });
    } catch (error: any) {
        console.error('Error fetching asset by id:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch asset',
        });
    }
}

// Create new asset
export async function createAsset(req: Request, res: Response) {
    try {
        const validation = createAssetSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validation.error.format(),
            });
        }

        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: User not authenticated',
            });
        }

        const newAsset = await assetService.createAssetInDB(
            validation.data as any,
            userId,
        );

        return res.status(201).json({
            success: true,
            message: 'Asset created successfully',
            data: newAsset,
        });
    } catch (error: any) {
        console.error('Error creating asset:', error);
        return res.status(400).json({
            success: false,
            message: error.message || 'Failed to create asset',
        });
    }
}

// Update asset
export async function updateAsset(req: Request, res: Response) {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Asset ID is required',
            });
        }

        const validation = updateAssetSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validation.error.format(),
            });
        }

        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: User not authenticated',
            });
        }

        const updated = await assetService.updateAssetInDB(
            id,
            validation.data as any,
            userId,
        );

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Asset not found',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Asset updated successfully',
            data: updated,
        });
    } catch (error: any) {
        console.error('Error updating asset:', error);
        return res.status(400).json({
            success: false,
            message: error.message || 'Failed to update asset',
        });
    }
}

// Delete asset
export async function deleteAsset(req: Request, res: Response) {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Asset ID is required',
            });
        }

        const deleted = await assetService.deleteAssetFromDB(id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Asset not found',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Asset deleted successfully',
        });
    } catch (error: any) {
        console.error('Error deleting asset:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete asset',
        });
    }
}

// Generate new Asset Tag Preview
export async function getNextAssetTag(req: Request, res: Response) {
    try {
        const category = req.query.category as AssetCategory | undefined;
        const tag = await assetService.generateAssetTag(category);

        return res.status(200).json({
            success: true,
            data: { assetTag: tag },
        });
    } catch (error: any) {
        console.error('Error generating asset tag:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate asset tag',
        });
    }
}
