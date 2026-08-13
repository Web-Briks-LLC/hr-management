import mongoose, { type ClientSession } from "mongoose";
import StaffModel from "../models/staff.model.js";
import WalletTransactionModel, {
    TransactionType,
} from "../models/wallet-transaction.model.js";
import EarningModel from "../models/earning.model.js";
import ClientModel from "../models/client.model.js";

const COMMISSION_RATE = 0.05; // 5%

/**
 * Helper to find the telemarketer staff assigned or associated with a client.
 * Prioritizes assignedTelemarketer; falls back to createdBy.
 */
async function getBeneficiaryTelemarketer(client: any, session?: ClientSession) {
    if (!client) return null;

    // 1. Check assignedTelemarketer
    const assignedTMId = client.assignedTelemarketer?._id || client.assignedTelemarketer;
    if (assignedTMId) {
        const staff = await StaffModel.findOne({
            userId: assignedTMId,
            designation: { $regex: /^telemarketer$/i },
            status: "active",
        }).session(session || null);
        if (staff) return staff;
    }

    // 2. Fallback to createdBy
    const creatorId = client.createdBy?._id || client.createdBy;
    if (creatorId) {
        const staff = await StaffModel.findOne({
            userId: creatorId,
            designation: { $regex: /^telemarketer$/i },
            status: "active",
        }).session(session || null);
        if (staff) return staff;
    }

    return null;
}

/**
 * Calculates the total gross amount in BDT for an earning.
 * Gross is before deduction of platform fees and taxes.
 */
function calculateEarningGrossBDT(earning: any): number {
    if (!earning) return 0;

    let totalGrossBDT = 0;
    if (earning.payments && earning.payments.length > 0) {
        totalGrossBDT = earning.payments.reduce((sum: number, p: any) => {
            const rate = (p.conversionRate && p.conversionRate > 0) ? p.conversionRate : 1;
            if (rate > 1) {
                return sum + (p.amount || 0) * rate;
            } else if (p.amountInBDT && p.amountInBDT > 0) {
                return sum + p.amountInBDT;
            } else {
                return sum + (p.amount || 0);
            }
        }, 0);
    }

    if (totalGrossBDT === 0 && (earning.status === "paid" || (earning.paidAmountBDT || 0) > 0 || (earning.amountInBDT || 0) > 0)) {
        totalGrossBDT = earning.paidAmountBDT || earning.amountInBDT || 0;
    }

    if (totalGrossBDT === 0 && earning.status === "paid" && (earning.currency === "BDT" || !earning.currency)) {
        totalGrossBDT = earning.paidAmount || earning.totalAmount || 0;
    }

    return Math.round(totalGrossBDT * 100) / 100;
}

/**
 * Process commission for an earning converted to BDT.
 * Applies if the client associated with the earning is assigned to or created by a telemarketer.
 *
 * @param earningId - The ID of the earning that was paid/withdrawn
 * @param changedBy - The userId who triggered the conversion (for audit)
 */
async function processEarningCommission(earningId: string, _changedBy: string, parentSession?: ClientSession) {
    const session = parentSession || (await mongoose.startSession());
    if (!parentSession) session.startTransaction();

    try {
        // 1. Fetch the earning and its associated client
        const earning = await EarningModel.findById(earningId)
            .populate("clientId")
            .session(session);

        if (!earning) {
            throw new Error("Earning not found");
        }

        const client = earning.clientId as any;
        if (!client) {
            if (!parentSession) await session.abortTransaction();
            return null;
        }

        // 2. Find the beneficiary telemarketer
        const staff = await getBeneficiaryTelemarketer(client, session);
        if (!staff) {
            // Not associated with a telemarketer — no commission to process
            if (!parentSession) await session.abortTransaction();
            return null;
        }

        // 3. Calculate total GROSS BDT (sum of payment USD * rate, before fees/tax)
        const totalGrossBDT = calculateEarningGrossBDT(earning);
        if (totalGrossBDT <= 0) {
            if (!parentSession) await session.abortTransaction();
            return null;
        }

        // 4. Calculate total commission already paid to THIS staff for this earning
        const existingTransactions = await WalletTransactionModel.find({
            "metadata.earningId": new mongoose.Types.ObjectId(earningId),
            staffId: staff._id,
            type: TransactionType.COMMISSION,
            status: "completed",
        }).session(session);

        const alreadyPaidCommission = existingTransactions.reduce(
            (sum, t) => sum + t.amount,
            0,
        );

        // 5. Calculate incremental commission (based on Gross BDT)
        const totalExpectedCommission = Math.round(totalGrossBDT * COMMISSION_RATE * 100) / 100;
        const commissionAmount = Math.round((totalExpectedCommission - alreadyPaidCommission) * 100) / 100;

        if (commissionAmount < 0.01) {
            if (!parentSession) await session.abortTransaction();
            return null;
        }

        // 6. Calculate effective incremental gross for description
        const incrementalGross = Math.round((commissionAmount / COMMISSION_RATE) * 100) / 100;

        // 7. Create wallet transaction record
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

        // 8. Increment staff balance atomically
        await StaffModel.updateOne(
            { _id: staff._id },
            { $inc: { balance: commissionAmount } },
            { session },
        );

        if (!parentSession) {
            await session.commitTransaction();
        }

        console.log(
            `[Commission] ৳${commissionAmount} credited to ${staff.staffId} for Earning ${earning._id}`,
        );

        return {
            staffId: staff.staffId,
            commissionAmount,
            earningId: earning._id,
        };
    } catch (err) {
        if (!parentSession) await session.abortTransaction();
        throw err;
    } finally {
        if (!parentSession) session.endSession();
    }
}

/**
 * Reverse all commissions associated with an earning.
 * Used when a payment is marked as unpaid or deleted.
 *
 * @param earningId - The ID of the earning to reverse commissions for
 */
async function reverseEarningCommission(earningId: string, parentSession?: ClientSession) {
    const session = parentSession || (await mongoose.startSession());
    if (!parentSession) session.startTransaction();

    try {
        // 1. Find all completed commission transactions for this earning
        const transactions = await WalletTransactionModel.find({
            "metadata.earningId": new mongoose.Types.ObjectId(earningId),
            type: TransactionType.COMMISSION,
            status: "completed",
        }).session(session);

        if (transactions.length === 0) {
            if (!parentSession) await session.abortTransaction();
            return;
        }

        for (const transaction of transactions) {
            // 2. Mark transaction as "cancelled"
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

        if (!parentSession) await session.commitTransaction();
    } catch (err) {
        if (!parentSession) await session.abortTransaction();
        console.error("[Commission Reversal] Failed:", err);
        throw err;
    } finally {
        if (!parentSession) session.endSession();
    }
}

/**
 * Synchronize all commissions and wallet balances for all active telemarketers.
 * Backfills missing commissions for assigned clients and aligns staff balances.
 */
async function syncAllCommissionsAndBalances() {
    const telemarketers = await StaffModel.find({
        designation: { $regex: /^telemarketer$/i },
        status: "active",
    });

    const summary: Array<{
        staffId: string;
        name?: string;
        creditedCommissions: number;
        newBalance: number;
        clientsCount: number;
    }> = [];

    for (const staff of telemarketers) {
        // 1. Find all clients assigned to or created by this telemarketer
        const clients = await ClientModel.find({
            $or: [
                { assignedTelemarketer: staff.userId },
                {
                    createdBy: staff.userId,
                    $or: [
                        { assignedTelemarketer: null },
                        { assignedTelemarketer: { $exists: false } },
                        { assignedTelemarketer: staff.userId },
                    ],
                },
            ],
        }).select("_id name");

        const clientIds = clients.map((c) => c._id);
        let newlyCredited = 0;

        if (clientIds.length > 0) {
            // 2. Find all earnings for these clients
            const earnings = await EarningModel.find({
                clientId: { $in: clientIds },
            }).populate("clientId");

            for (const earning of earnings) {
                // Calculate gross BDT
                const totalGrossBDT = calculateEarningGrossBDT(earning);
                if (totalGrossBDT <= 0) continue;

                const totalExpectedCommission =
                    Math.round(totalGrossBDT * COMMISSION_RATE * 100) / 100;

                // Check completed commission transactions for this staff
                const existingTx = await WalletTransactionModel.find({
                    "metadata.earningId": earning._id,
                    staffId: staff._id,
                    type: TransactionType.COMMISSION,
                    status: "completed",
                });

                const alreadyPaid = existingTx.reduce(
                    (sum, t) => sum + t.amount,
                    0,
                );

                const diff =
                    Math.round((totalExpectedCommission - alreadyPaid) * 100) / 100;

                if (diff >= 0.01) {
                    const incrementalGross =
                        Math.round((diff / COMMISSION_RATE) * 100) / 100;
                    const clientName = (earning.clientId as any)?.name || "Client";

                    await WalletTransactionModel.create({
                        staffId: staff._id,
                        amount: diff,
                        type: TransactionType.COMMISSION,
                        description: `5% commission on ৳${incrementalGross.toLocaleString()} Gross (Total ৳${totalGrossBDT.toLocaleString()}) - ${clientName} (${earning.month}/${earning.year})`,
                        status: "completed",
                        metadata: {
                            earningId: earning._id,
                            clientName,
                            incrementalGross,
                            totalGrossBDT,
                            commissionRate: COMMISSION_RATE,
                            isIncremental: alreadyPaid > 0,
                            syncedAt: new Date(),
                        },
                    });

                    newlyCredited += diff;
                }
            }
        }

        // 3. Recalculate and synchronize staff balance from complete transaction history
        const allTransactions = await WalletTransactionModel.find({
            staffId: staff._id,
            status: "completed",
        });

        const totalEarned = allTransactions
            .filter((t) => t.type !== TransactionType.WITHDRAWAL)
            .reduce((sum, t) => sum + t.amount, 0);

        const totalWithdrawn = allTransactions
            .filter((t) => t.type === TransactionType.WITHDRAWAL)
            .reduce((sum, t) => sum + t.amount, 0);

        const accurateBalance = Math.max(
            0,
            Math.round((totalEarned - totalWithdrawn) * 100) / 100,
        );

        await StaffModel.updateOne(
            { _id: staff._id },
            { $set: { balance: accurateBalance } },
        );

        summary.push({
            staffId: staff.staffId,
            creditedCommissions: newlyCredited,
            newBalance: accurateBalance,
            clientsCount: clientIds.length,
        });
    }

    return summary;
}

export default {
    processEarningCommission,
    reverseEarningCommission,
    syncAllCommissionsAndBalances,
    getBeneficiaryTelemarketer,
    COMMISSION_RATE,
};
