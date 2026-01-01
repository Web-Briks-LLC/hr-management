import express from 'express';
import {
    getNextInvoiceNumber,
    getCurrentInvoiceNumber,
} from '../controllers/invoice.controller.js';

const router = express.Router();

router.get('/next-number', getNextInvoiceNumber);
router.get('/current-number', getCurrentInvoiceNumber);

export default router;
