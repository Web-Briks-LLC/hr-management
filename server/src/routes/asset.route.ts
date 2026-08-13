import { Router } from 'express';
import {
    getAllAssets,
    getAssetStats,
    getAssetById,
    createAsset,
    updateAsset,
    deleteAsset,
    getNextAssetTag,
} from '../controllers/asset.controller.js';
import { authorize } from '../middlewares/authorize.js';
import { Role } from '../constants/role.js';

const router = Router();

const allowedRoles = [Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER];

// All routes are strictly protected for Super Admin, Admin, and HR Manager
router.use(authorize(...allowedRoles));

// Collection routes
router.get('/', getAllAssets);
router.get('/stats', getAssetStats);
router.get('/generate-tag', getNextAssetTag);
router.post('/', createAsset);

// Item routes
router.get('/:id', getAssetById);
router.patch('/:id', updateAsset);
router.delete('/:id', deleteAsset);

export { router as assetRoute };
