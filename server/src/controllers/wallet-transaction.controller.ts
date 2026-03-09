import { type Request as ExpressRequest, type Response as ExpressResponse } from "express";
import WalletTransactionModel, { TransactionType } from "../models/wallet-transaction.model.js";
import StaffModel from "../models/staff.model.js";
import walletService from "../services/wallet.service.js";

/**
 * Get wallet transactions for the currently logged-in staff member.
 * Supports filtering by type and pagination.
 */
async function getMyTransactions(req: ExpressRequest, res: ExpressResponse) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const staff = await StaffModel.findOne({ userId });
        if (!staff) {
            return res.status(404).json({ success: false, message: "Staff record not found" });
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const type = req.query.type as string;
        const skip = (page - 1) * limit;

        const query: any = { staffId: staff._id };
        if (type && Object.values(TransactionType).includes(type as TransactionType)) {
            query.type = type;
        }

        const [transactions, total, summary] = await Promise.all([
            WalletTransactionModel.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            WalletTransactionModel.countDocuments(query),
            WalletTransactionModel.aggregate([
                { $match: { staffId: staff._id, status: "completed" } },
                {
                    $group: {
                        _id: "$type",
                        total: { $sum: "$amount" },
                    },
                },
            ]),
        ]);

        const totalEarned = summary
            .filter((s: any) => s._id !== TransactionType.WITHDRAWAL)
            .reduce((sum: number, s: any) => sum + s.total, 0);
        
        const totalWithdrawn = summary
            .find((s: any) => s._id === TransactionType.WITHDRAWAL)?.total || 0;

        return res.status(200).json({
            success: true,
            message: "Transactions fetched successfully",
            data: transactions,
            meta: {
                total,
                page,
                totalPages: Math.ceil(total / limit),
                balance: staff.balance || 0,
                totalEarned,
                totalWithdrawn,
            },
        });
    } catch (error) {
        console.error("Error fetching my transactions:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
}

/**
 * Get all transactions (Admin only).
 */
async function getAllTransactions(req: ExpressRequest, res: ExpressResponse) {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const staffDocId = req.query.staffId as string;
        const type = req.query.type as string;
        const skip = (page - 1) * limit;

        const query: any = {};
        if (staffDocId) query.staffId = staffDocId;
        if (type) query.type = type;

        const [transactions, total] = await Promise.all([
            WalletTransactionModel.find(query)
                .populate({
                    path: "staffId",
                    select: "staffId phone",
                    populate: {
                        path: "userId",
                        select: "name email",
                    }
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            WalletTransactionModel.countDocuments(query),
        ]);

        return res.status(200).json({
            success: true,
            data: transactions,
            meta: {
                total,
                page,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching all transactions:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
}

/**
 * Admin processes a withdrawal for a staff member.
 */
async function adminWithdraw(req: ExpressRequest, res: ExpressResponse) {
    try {
        const { staffDocId, amount, description } = req.body;
        const adminId = req.user?.id;

        if (!staffDocId || !amount || amount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid staff ID or amount" });
        }

        const result = await walletService.withdrawFunds({
            staffId: staffDocId,
            amount: Number(amount),
            description: description || "Withdrawal processed by admin",
            adminId: adminId || "system",
        });

        return res.status(200).json(result);
    } catch (error: any) {
        console.error("Admin withdrawal error:", error);
        return res.status(400).json({ success: false, message: error.message });
    }
}

export { getMyTransactions, getAllTransactions, adminWithdraw };
