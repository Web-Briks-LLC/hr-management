import { Router } from 'express';
import {
    createProductionLog,
    getAllProductionLogs,
    getActiveOrdersProgress,
    getOrderTimelineLogs,
    updateProductionLog,
    submitQCReview,
    deleteProductionLog,
    getProductionStats,
} from '../controllers/production.controller.js';
import { authorizeProductionAccess } from '../middlewares/authorizeProductionAccess.js';
import { authorize } from '../middlewares/authorize.js';
import { Role } from '../constants/role.js';

const router = Router();

const adminRoles = [Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER];

// All production routes require authorizeProductionAccess (Admins + Non-Telemarketer Team Leaders)
router.use(authorizeProductionAccess);

router.post('/', createProductionLog);
router.get('/', getAllProductionLogs);
router.get('/active-orders', getActiveOrdersProgress);
router.get('/stats', getProductionStats);
router.get('/order/:orderId/timeline', getOrderTimelineLogs);
router.patch('/:id', updateProductionLog);
router.post('/:id/qc', submitQCReview);
router.delete('/:id', authorize(...adminRoles), deleteProductionLog);

export { router as productionRoute };
