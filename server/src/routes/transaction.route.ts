import { Router } from "express";
import transactionController from "../controllers/transaction.controller.js";
import { authorize } from "../middlewares/authorize.js";
import { Role } from "../constants/role.js";

export const transactionRoute = Router();

const allowedRoles = [Role.SUPER_ADMIN, Role.ADMIN];

// Query unified transactions list (JSON)
transactionRoute.get(
    "/",
    authorize(...allowedRoles),
    transactionController.getUnifiedTransactions
);

// Export unified transactions to high-fidelity A4 PDF using Puppeteer
transactionRoute.get(
    "/export-pdf",
    authorize(...allowedRoles),
    transactionController.exportTransactionsPDF
);
