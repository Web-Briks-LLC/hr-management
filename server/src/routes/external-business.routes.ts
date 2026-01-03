import { Router } from 'express';
import {
    createBusiness,
    getAllBusinesses,
    getBusinessById,
    updateBusiness,
    deleteBusiness,
    transferProfit,
    getTransfers,
    getTransferStats,
    deleteTransfer,
} from '../controllers/external-business.controller.js';

const router = Router();

// Business routes
router.post('/businesses', createBusiness);
router.get('/businesses', getAllBusinesses);
router.get('/businesses/:id', getBusinessById);
router.put('/businesses/:id', updateBusiness);
router.delete('/businesses/:id', deleteBusiness);

// Transfer routes
router.post('/transfers', transferProfit);
router.get('/transfers', getTransfers);
router.get('/transfers/stats', getTransferStats);
router.delete('/transfers/:id', deleteTransfer);

export default router;
