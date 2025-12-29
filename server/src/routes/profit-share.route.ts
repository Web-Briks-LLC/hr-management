import { Router } from 'express';
import {
    createShareholder,
    getAllShareholders,
    getShareholderById,
    updateShareholder,
    deleteShareholder,
    getProfitSummary,
    distributeProfit,
    getDistributions,
} from '../controllers/profit-share.controller.js';

const router = Router();

// Shareholder routes
router.post('/shareholders', createShareholder);
router.get('/shareholders', getAllShareholders);
router.get('/shareholders/:id', getShareholderById);
router.put('/shareholders/:id', updateShareholder);
router.delete('/shareholders/:id', deleteShareholder);

// Profit summary
router.get('/summary', getProfitSummary);

// Distribution routes
router.post('/distribute', distributeProfit);
router.get('/distributions', getDistributions);

export const profitShareRoute = router;
