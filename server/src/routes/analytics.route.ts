import { Router } from "express";
import analyticsController from "../controllers/analytics.controller.js";
import { authorize } from "../middlewares/authorize.js";
import { Role } from "../constants/role.js";

const router = Router();

const allowedRoles = [Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER];

// GET /api/analytics/finance/years - Get available years for analytics
router.get(
    "/finance/years",
    authorize(...allowedRoles),
    analyticsController.getAnalyticsYears,
);

// GET /api/analytics/finance - Get finance analytics
router.get(
    "/finance",
    authorize(...allowedRoles),
    analyticsController.getFinanceAnalytics,
);

export const analyticsRoute = router;
