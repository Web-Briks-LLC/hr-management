import type { Request, Response } from "express";
import { Types } from "mongoose";
import earningService from "../services/earning.service.js";
import { isTelemarketer } from "../utils/telemarketer.util.js";
import { Role } from "../constants/role.js";
import ClientModel from "../models/client.model.js";
import type {
    EarningQueryParams,
    WithdrawEarningData,
} from "../types/earning.type.js";

// Get all earnings with date filter
async function getAllEarnings(req: Request, res: Response) {
    try {
        const params: EarningQueryParams = {
            page: parseInt(req.query.page as string) || 1,
            limit: parseInt(req.query.limit as string) || 20,
        };

        if (req.query.clientId) params.clientId = req.query.clientId as string;
        if (req.query.status)
            params.status = req.query.status as "unpaid" | "paid";
        if (req.query.filterType)
            params.filterType = req.query.filterType as
                | "today"
                | "week"
                | "month"
                | "year";
        if (req.query.month) params.month = parseInt(req.query.month as string);
        if (req.query.year) params.year = parseInt(req.query.year as string);

        // Security: Telemarketer ownership enforcement
        if (
            req.user &&
            [Role.STAFF, Role.TEAM_LEADER].includes(req.user.role as Role)
        ) {
            const isTM = await isTelemarketer(req.user.id);
            if (isTM) {
                // Find all clients created by this telemarketer
                const clients = await ClientModel.find({
                    createdBy: req.user.id,
                })
                    .select("_id")
                    .lean();
                params.clientIds = clients.map((c) => c._id.toString());
            }
        }

        const result = await earningService.getEarningsWithDateFilter(params);

        return res.status(200).json({
            message: "Earnings fetched successfully",
            data: result.earnings,
            meta: {
                total: result.total,
                page: result.page,
                totalPages: result.totalPages,
            },
        });
    } catch (error) {
        console.error("Error fetching earnings:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

// Get earning by ID
async function getEarningById(req: Request, res: Response) {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ message: "Earning ID is required" });
        }

        const earning = await earningService.getEarningByIdFromDB(id);

        if (!earning) {
            return res.status(404).json({ message: "Earning not found" });
        }

        return res.status(200).json({
            message: "Earning fetched successfully",
            data: earning,
        });
    } catch (error) {
        console.error("Error fetching earning:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

// Get earning stats with optional date filter
async function getEarningStats(req: Request, res: Response) {
    try {
        const params: EarningQueryParams = {};

        if (req.query.filterType)
            params.filterType = req.query.filterType as
                | "today"
                | "week"
                | "month"
                | "year";
        if (req.query.month) params.month = parseInt(req.query.month as string);
        if (req.query.year) params.year = parseInt(req.query.year as string);
        if (req.query.clientId) params.clientId = req.query.clientId as string;

        // Security: Telemarketer ownership enforcement for stats
        if (
            req.user &&
            [Role.STAFF, Role.TEAM_LEADER].includes(req.user.role as Role)
        ) {
            const isTM = await isTelemarketer(req.user.id);
            if (isTM) {
                const clients = await ClientModel.find({
                    createdBy: req.user.id,
                })
                    .select("_id")
                    .lean();
                params.clientIds = clients.map((c) => c._id.toString());
            }
        }

        const stats = await earningService.getEarningStatsWithFilter(params);

        return res.status(200).json({
            message: "Earning stats fetched successfully",
            data: stats,
        });
    } catch (error) {
        console.error("Error fetching earning stats:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

// Withdraw earning (mark as paid)
async function withdrawEarning(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ message: "Earning ID is required" });
        }

        const { fees, tax, conversionRate, notes, amount, method, invoiceNumber, transactionId } = req.body;

        if (conversionRate === undefined || conversionRate <= 0) {
            return res
                .status(400)
                .json({ message: "Valid conversion rate is required" });
        }

        const data: WithdrawEarningData = {
            amount: amount !== undefined ? Number(amount) : undefined,
            method: method || "Manual",
            invoiceNumber: invoiceNumber ? String(invoiceNumber) : undefined,
            transactionId: transactionId ? String(transactionId) : undefined,
            fees: fees !== undefined ? Number(fees) : 0,
            tax: tax !== undefined ? Number(tax) : 0,
            conversionRate: Number(conversionRate),
            notes: notes ? String(notes) : undefined,
            paidBy: userId,
        };

        const earning = await earningService.withdrawEarning(id, data);

        if (!earning) {
            return res.status(404).json({ message: "Earning not found" });
        }

        return res.status(200).json({
            message: "Earning withdrawn successfully",
            data: earning,
        });
    } catch (error) {
        console.error("Error withdrawing earning:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

// Toggle earning status (paid <-> unpaid)
async function toggleEarningStatus(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ message: "Earning ID is required" });
        }

        const { status, fees, tax, notes } = req.body;

        if (!status || !["paid", "unpaid"].includes(status)) {
            return res
                .status(400)
                .json({ message: "Valid status (paid/unpaid) is required" });
        }

        let withdrawData: WithdrawEarningData | undefined;
        if (status === "paid") {
            // Conversion rate is no longer required for just marking as paid
            withdrawData = {
                fees: fees ?? 0,
                tax: tax ?? 0,
                notes: notes,
                paidBy: userId,
            };
        }

        const earning = await earningService.toggleEarningStatus(
            id,
            status,
            withdrawData,
        );

        if (!earning) {
            return res.status(404).json({ message: "Earning not found" });
        }

        return res.status(200).json({
            message: `Earning marked as ${status} successfully`,
            data: earning,
        });
    } catch (error) {
        console.error("Error toggling earning status:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

// Get client orders for bulk withdraw (now returns the monthly earning)
async function getClientOrdersForWithdraw(req: Request, res: Response) {
    try {
        const { clientId, month, year } = req.query;

        if (!clientId || !month || !year) {
            return res.status(400).json({
                message: "Client ID, month, and year are required",
            });
        }

        if (!Types.ObjectId.isValid(clientId as string)) {
            return res.status(400).json({
                message: "Invalid Client ID format",
            });
        }

        const monthNum = parseInt(month as string);
        const yearNum = parseInt(year as string);

        if (isNaN(monthNum) || isNaN(yearNum)) {
            return res.status(400).json({
                message: "Month and year must be valid numbers",
            });
        }

        const result = await earningService.getClientOrdersForBulkWithdraw(
            clientId as string,
            monthNum,
            yearNum,
        );

        if (!result) {
            return res.status(200).json({
                message: "No unpaid earnings found for this client",
                data: null,
            });
        }

        return res.status(200).json({
            message: "Client earning fetched successfully",
            data: result,
        });
    } catch (error) {
        console.error("Error fetching client orders:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

// Get earning years
async function getEarningYears(_req: Request, res: Response) {
    try {
        const years = await earningService.getEarningYearsFromDB();
        return res.status(200).json({
            message: "Years fetched successfully",
            data: years,
        });
    } catch (error) {
        console.error("Error fetching years:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

// Get clients with unpaid earnings for filter
async function getClientsWithEarnings(req: Request, res: Response) {
    try {
        const { month, year } = req.query;

        if (!month || !year) {
            return res.status(400).json({
                message: "Month and year are required",
            });
        }

        const clients = await earningService.getClientsWithUnpaidEarnings(
            parseInt(month as string),
            parseInt(year as string),
        );

        return res.status(200).json({
            message: "Clients fetched successfully",
            data: clients,
        });
    } catch (error) {
        console.error("Error fetching clients with earnings:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

// Update earning (e.g. update client)
async function updateEarning(req: Request, res: Response) {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ message: "Earning ID is required" });
        }

        const { clientId } = req.body;
        const updates: any = {};

        if (clientId) {
            if (!Types.ObjectId.isValid(clientId)) {
                return res
                    .status(400)
                    .json({ message: "Invalid Client ID format" });
            }
            updates.clientId = clientId;
        }

        const updatedEarning = await earningService.updateEarning(id, updates);

        if (!updatedEarning) {
            return res.status(404).json({ message: "Earning not found" });
        }

        return res.status(200).json({
            message: "Earning updated successfully",
            data: updatedEarning,
        });
    } catch (error: any) {
        console.error("Error updating earning:", error);
        return res.status(500).json({
            message: error.message || "Internal server error",
            success: false,
        });
    }
}

// Delete earning
async function deleteEarning(req: Request, res: Response) {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ message: "Earning ID is required" });
        }

        const deletedEarning = await earningService.deleteEarningFromDB(id);
        return res.status(200).json({
            message: "Earning deleted successfully",
            data: deletedEarning,
        });
    } catch (error: any) {
        console.error("Error deleting earning:", error);
        return res.status(500).json({
            message: error.message || "Internal server error",
            success: false,
        });
    }
}

// Sync earning with orders
async function syncEarning(req: Request, res: Response) {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ message: "Earning ID is required" });
        }

        const earning = await earningService.syncEarningFromOrders(id);

        if (!earning) {
            return res.status(404).json({ message: "Earning not found" });
        }

        return res.status(200).json({
            message: "Earning synchronized successfully",
            data: earning,
        });
    } catch (error) {
        console.error("Error syncing earning:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export {
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
    syncEarning,
};
