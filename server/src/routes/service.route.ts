import { Router } from 'express';
import {
    createService,
    getAllServices,
    getServiceById,
    updateService,
    deleteService,
    checkServiceUsage,
} from '../controllers/service.controller.js';

const router = Router();

router.post('/', createService);
router.get('/', getAllServices);
router.get('/:id', getServiceById);
router.get('/:id/usage', checkServiceUsage);
router.patch('/:id', updateService);
router.delete('/:id', deleteService);

export { router as serviceRoute };
