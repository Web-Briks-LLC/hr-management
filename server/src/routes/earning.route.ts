import { Router } from "express";
import {
    getAllEarnings,
    getEarningById,
    getEarningStats,
    withdrawEarning,
    toggleEarningStatus,
    getClientOrdersForWithdraw,
    getEarningYears,
    getClientsWithEarnings,
    updateEarning,
    deleteEarning,
} from "../controllers/earning.controller.js";
import { authorize } from "../middlewares/authorize.js";
import { Role } from "../constants/role.js";

const router = Router();

const allowedRoles = [Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER];

// Get routes
router.get("/", authorize(...allowedRoles), getAllEarnings);
router.get("/stats", authorize(...allowedRoles), getEarningStats);
router.get("/years", authorize(...allowedRoles), getEarningYears);
router.get("/clients", authorize(...allowedRoles), getClientsWithEarnings);
router.get(
    "/client-orders",
    authorize(...allowedRoles),
    getClientOrdersForWithdraw,
);
router.get("/:id", authorize(...allowedRoles), getEarningById);

// Action routes
router.delete("/:id", authorize(...allowedRoles), deleteEarning); // Delete earning
router.patch("/:id", authorize(...allowedRoles), updateEarning); // General update
router.put("/:id/withdraw", authorize(...allowedRoles), withdrawEarning);
router.put(
    "/:id/toggle-status",
    authorize(...allowedRoles),
    toggleEarningStatus,
);

export { router as earningRoute };
