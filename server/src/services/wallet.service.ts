import mongoose, { type ClientSession } from "mongoose";
import StaffModel from "../models/staff.model.js";
import WalletTransactionModel, {
    TransactionType,
} from "../models/wallet-transaction.model.js";

/**
 * Service to handle wallet and balance operations.
 */
class WalletService {
    /**
     * Perform a withdrawal for a staff member.
     * Decrements balance and creates a transaction record atomically.
     */
    async withdrawFunds(
        data: {
            staffId: string;
            amount: number;
            description: string;
            adminId: string;
            metadata?: any;
        },
        parentSession?: ClientSession,
    ) {
        const session = parentSession || (await mongoose.startSession());
        if (!parentSession) session.startTransaction();

        try {
            const { staffId, amount, description, adminId, metadata } = data;

            // 1. Validate staff existence and balance
            const staff = await StaffModel.findById(staffId).session(session);
            if (!staff) {
                throw new Error("Staff member not found");
            }

            if (staff.balance < amount) {
                throw new Error(
                    `Insufficient balance. Available: ৳${staff.balance}, Requested: ৳${amount}`,
                );
            }

            // 2. Decrement staff balance
            const updatedStaff = await StaffModel.findOneAndUpdate(
                { _id: staffId, balance: { $gte: amount } }, // Extra safety check
                { $inc: { balance: -amount } },
                { session, new: true },
            );

            if (!updatedStaff) {
                throw new Error("Withdrawal failed: Balance changed during operation or insufficient funds.");
            }

            // 3. Create transaction record
            const transaction = await WalletTransactionModel.create(
                [
                    {
                        staffId,
                        amount,
                        type: TransactionType.WITHDRAWAL,
                        description,
                        status: "completed",
                        createdBy: adminId,
                        metadata: {
                            ...metadata,
                            processedBy: adminId,
                            previousBalance: staff.balance,
                            newBalance: updatedStaff.balance,
                        },
                    },
                ],
                { session },
            );

            if (!parentSession) await session.commitTransaction();

            return {
                success: true,
                transaction: transaction[0],
                newBalance: updatedStaff.balance,
            };
        } catch (error) {
            if (!parentSession) await session.abortTransaction();
            console.error("[WalletService] Withdrawal failed:", error);
            throw error;
        } finally {
            if (!parentSession) session.endSession();
        }
    }
}

export default new WalletService();
