import { Router } from 'express';
import analyticsController from '../controllers/analytics.controller.js';

const router = Router();

// GET /api/analytics/finance/years - Get available years for analytics
router.get('/finance/years', analyticsController.getAnalyticsYears);

// GET /api/analytics/finance - Get finance analytics
router.get('/finance', analyticsController.getFinanceAnalytics);

export const analyticsRoute = router;
