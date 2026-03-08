import mongoose from "mongoose";
import StaffModel from "../models/staff.model.js";
import WalletTransactionModel, {
    TransactionType,
} from "../models/wallet-transaction.model.js";
import EarningModel from "../models/earning.model.js";

const COMMISSION_RATE = 0.05; // 5%

/**
 * Process commission for an earning converted to BDT.
 * Only applies if the client associated with the earning was created by a telemarketer.
 *
 * @param earningId - The ID of the earning that was paid/withdrawn
 * @param changedBy - The userId who triggered the conversion (for audit)
 */
async function processEarningCommission(earningId: string, _changedBy: string) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Fetch the earning and its associated client
        const earning = await EarningModel.findById(earningId)
            .populate("clientId")
            .session(session);

        if (!earning) {
            throw new Error("Earning not found");
        }

        const client = earning.clientId as any;
        if (!client || !client.createdBy) {
            await session.abortTransaction();
            return null;
        }

        // 2. Calculate total commission already paid for this earning
        const existingTransactions = await WalletTransactionModel.find({
            "metadata.earningId": new mongoose.Types.ObjectId(earningId),
            type: TransactionType.COMMISSION,
            status: "completed",
        }).session(session);

        const alreadyPaidCommission = existingTransactions.reduce(
            (sum, t) => sum + t.amount,
            0,
        );

        // 3. Find the staff member who created the client
        const staff = await StaffModel.findOne({
            userId: client.createdBy,
            designation: { $regex: /^telemarketer$/i },
            status: "active",
        }).session(session);

        if (!staff) {
            // Not a telemarketer — no commission to process
            await session.abortTransaction();
            return null;
        }

        // 4. Calculate total GROSS BDT (sum of payment USD * rate, before fees/tax)
        const totalGrossBDT = earning.payments.reduce((sum, p) => sum + ((p.amount || 0) * (p.conversionRate || 1)), 0);

        // 5. Calculate incremental commission (based on Gross BDT)
        const totalExpectedCommission = Math.round(totalGrossBDT * COMMISSION_RATE * 100) / 100;
        const commissionAmount = Math.round((totalExpectedCommission - alreadyPaidCommission) * 100) / 100;

        if (commissionAmount < 0.01) {
            await session.abortTransaction();
            return null;
        }

        // 6. Calculate the "Effective Gross" for THIS specific transaction to show in description
        const incrementalGross = Math.round((commissionAmount / COMMISSION_RATE) * 100) / 100;

        // 6. Create wallet transaction record
        await WalletTransactionModel.create(
            [
                {
                    staffId: staff._id,
                    amount: commissionAmount,
                    type: TransactionType.COMMISSION,
                    description: `5% commission on ৳${incrementalGross.toLocaleString()} Gross (Total ৳${totalGrossBDT.toLocaleString()}) - ${client.name} (${earning.month}/${earning.year})`,
                    status: "completed",
                    metadata: {
                        earningId: earning._id,
                        clientName: client.name,
                        incrementalGross: incrementalGross,
                        totalGrossBDT: totalGrossBDT,
                        commissionRate: COMMISSION_RATE,
                        isIncremental: alreadyPaidCommission > 0,
                    },
                },
            ],
            { session },
        );

        // 6. Increment staff balance atomically
        await StaffModel.updateOne(
            { _id: staff._id },
            { $inc: { balance: commissionAmount } },
            { session },
        );

        await session.commitTransaction();

        console.log(
            `[Commission] ৳${commissionAmount} credited to ${staff.staffId} for Earning ${earning._id}`,
        );

        return {
            staffId: staff.staffId,
            commissionAmount,
            earningId: earning._id,
        };
    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
}

/**
 * Reverse all commissions associated with an earning.
 * Used when a payment is marked as unpaid or deleted.
 *
 * @param earningId - The ID of the earning to reverse commissions for
 */
async function reverseEarningCommission(earningId: string) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Find all completed commission transactions for this earning
        const transactions = await WalletTransactionModel.find({
            "metadata.earningId": new mongoose.Types.ObjectId(earningId),
            type: TransactionType.COMMISSION,
            status: "completed",
        }).session(session);

        if (transactions.length === 0) {
            await session.abortTransaction();
            return;
        }

        for (const transaction of transactions) {
            // 2. Mark transaction as "cancelled" (or we could create a "refund" type)
            transaction.status = "cancelled";
            await transaction.save({ session });

            // 3. Deduct amount from staff balance
            await StaffModel.updateOne(
                { _id: transaction.staffId },
                { $inc: { balance: -transaction.amount } },
                { session },
            );

            console.log(
                `[Commission Reversal] ৳${transaction.amount} reversed from staff ${transaction.staffId} for Earning ${earningId}`,
            );
        }

        await session.commitTransaction();
    } catch (err) {
        await session.abortTransaction();
        console.error("[Commission Reversal] Failed:", err);
        throw err;
    } finally {
        session.endSession();
    }
}

export default {
    processEarningCommission,
    reverseEarningCommission,
    COMMISSION_RATE,
};
