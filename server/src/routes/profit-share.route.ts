import { Router } from "express";
import {
    createShareholder,
    getAllShareholders,
    getShareholderById,
    updateShareholder,
    deleteShareholder,
    getProfitSummary,
    distributeProfit,
    getDistributions,
} from "../controllers/profit-share.controller.js";
import { authorize } from "../middlewares/authorize.js";
import { Role } from "../constants/role.js";

const router = Router();

const allowedRoles = [Role.SUPER_ADMIN, Role.ADMIN];

// Shareholder routes
router.post("/shareholders", authorize(...allowedRoles), createShareholder);
router.get("/shareholders", authorize(...allowedRoles), getAllShareholders);
router.get("/shareholders/:id", authorize(...allowedRoles), getShareholderById);
router.put("/shareholders/:id", authorize(...allowedRoles), updateShareholder);
router.delete(
    "/shareholders/:id",
    authorize(...allowedRoles),
    deleteShareholder,
);

// Profit summary
router.get("/summary", authorize(...allowedRoles), getProfitSummary);

// Distribution routes
router.post("/distribute", authorize(...allowedRoles), distributeProfit);
router.get("/distributions", authorize(...allowedRoles), getDistributions);

export const profitShareRoute = router;
