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

const router = Router();

// Get routes
router.get("/", getAllEarnings);
router.get("/stats", getEarningStats);
router.get("/years", getEarningYears);
router.get("/clients", getClientsWithEarnings);
router.get("/client-orders", getClientOrdersForWithdraw);
router.get("/:id", getEarningById);

// Action routes
router.delete("/:id", deleteEarning); // Delete earning
router.patch("/:id", updateEarning); // General update
router.put("/:id/withdraw", withdrawEarning);
router.put("/:id/toggle-status", toggleEarningStatus);

export { router as earningRoute };
