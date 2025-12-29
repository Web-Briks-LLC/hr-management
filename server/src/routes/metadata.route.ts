import { Router } from 'express';
import MetadataController from '../controllers/metadata.controller.js';
import { authorize } from '../middlewares/authorize.js';
import { Role } from '../consonants/role.js';

const router: Router = Router();

// Get metadata by type (public for dropdowns)
router.get('/type/:type', MetadataController.getMetadataByType);

// Get all metadata
router.get(
    '/',
    authorize(Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER),
    MetadataController.getAllMetadata
);

// Create metadata (Admin only)
router.post(
    '/',
    authorize(Role.SUPER_ADMIN, Role.ADMIN),
    MetadataController.createMetadata
);

// Update metadata
router.patch(
    '/:id',
    authorize(Role.SUPER_ADMIN, Role.ADMIN),
    MetadataController.updateMetadata
);

// Delete metadata
router.delete(
    '/:id',
    authorize(Role.SUPER_ADMIN, Role.ADMIN),
    MetadataController.deleteMetadata
);

export const metadataRoute = router;
