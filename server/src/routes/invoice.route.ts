import express from 'express';
import {
    getNextInvoiceNumber,
    getCurrentInvoiceNumber,
    sendInvoiceEmailHandler,
} from '../controllers/invoice.controller.js';
import { upload } from '../middlewares/upload.middleware.js';

const router = express.Router();

router.get('/next-number', getNextInvoiceNumber);
router.get('/current-number', getCurrentInvoiceNumber);
router.post('/send-email', upload.single('file'), sendInvoiceEmailHandler);

export default router;
