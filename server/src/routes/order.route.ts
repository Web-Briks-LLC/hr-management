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
import { authorizeTelemarketer } from '../middlewares/authorizeTelemarketer.js';
import { authorize } from '../middlewares/authorize.js';
import { Role } from '../constants/role.js';

const router = Router();

const adminRoles = [Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER];

router.post('/', authorizeTelemarketer, createOrder);
router.get('/', authorizeTelemarketer, getAllOrders);
router.get('/stats', authorizeTelemarketer, getOrderStats);
router.get('/years', authorizeTelemarketer, getOrderYears);
router.get('/client/:clientId', authorizeTelemarketer, getOrdersByClient);
router.get('/:id', authorizeTelemarketer, getOrderById);
router.patch('/:id', authorizeTelemarketer, updateOrder);
router.patch('/:id/status', authorizeTelemarketer, updateOrderStatus);
router.patch('/:id/extend-deadline', authorizeTelemarketer, extendDeadline);
router.post('/:id/revision', authorizeTelemarketer, addRevision);
router.delete('/:id', authorize(...adminRoles), deleteOrder);

export { router as orderRoute };
