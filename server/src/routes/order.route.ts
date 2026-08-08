import { Router } from 'express';
import {
    createOrder,
    getAllOrders,
    getOrderById,
    updateOrder,
    deleteOrder,
    updateOrderStatus,
    extendDeadline,
    addRevision,
    getOrderStats,
    getOrdersByClient,
    getOrderYears,
} from '../controllers/order.controller.js';
import { authorizeOrderAccess } from '../middlewares/authorizeOrderAccess.js';
import { authorize } from '../middlewares/authorize.js';
import { Role } from '../constants/role.js';

const router = Router();

const adminRoles = [Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER];

router.post('/', authorizeOrderAccess, createOrder);
router.get('/', authorizeOrderAccess, getAllOrders);
router.get('/stats', authorizeOrderAccess, getOrderStats);
router.get('/years', authorizeOrderAccess, getOrderYears);
router.get('/client/:clientId', authorizeOrderAccess, getOrdersByClient);
router.get('/:id', authorizeOrderAccess, getOrderById);
router.patch('/:id', authorizeOrderAccess, updateOrder);
router.patch('/:id/status', authorizeOrderAccess, updateOrderStatus);
router.patch('/:id/extend-deadline', authorizeOrderAccess, extendDeadline);
router.post('/:id/revision', authorizeOrderAccess, addRevision);
router.delete('/:id', authorize(...adminRoles), deleteOrder);

export { router as orderRoute };
