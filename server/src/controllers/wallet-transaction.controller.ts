import type { Request, Response } from "express";
import WalletTransactionModel from "../models/wallet-transaction.model.js";
import StaffModel from "../models/staff.model.js";

// Get wallet transactions for the currently logged-in staff member
async function getMyTransactions(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Find the staff record for this user
        const staff = await StaffModel.findOne({ userId });
        if (!staff) {
            return res.status(404).json({ message: "Staff record not found" });
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const [transactions, total] = await Promise.all([
            WalletTransactionModel.find({ staffId: staff._id })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            WalletTransactionModel.countDocuments({ staffId: staff._id }),
        ]);

        return res.status(200).json({
            message: "Transactions fetched successfully",
            data: transactions,
            meta: {
                total,
                page,
                totalPages: Math.ceil(total / limit),
                balance: staff.balance || 0,
            },
        });
    } catch (error) {
        console.error("Error fetching my transactions:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export { getMyTransactions };
