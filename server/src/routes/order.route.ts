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

const router = Router();

router.post('/', createOrder);
router.get('/', getAllOrders);
router.get('/stats', getOrderStats);
router.get('/years', getOrderYears);
router.get('/client/:clientId', getOrdersByClient);
router.get('/:id', getOrderById);
router.patch('/:id', updateOrder);
router.patch('/:id/status', updateOrderStatus);
router.patch('/:id/extend-deadline', extendDeadline);
router.post('/:id/revision', addRevision);
router.delete('/:id', deleteOrder);

export { router as orderRoute };
