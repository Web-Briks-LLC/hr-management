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
            "metadata.earningId": earning._id,
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

        // 4. Calculate incremental commission (only pay the difference)
        const totalExpectedCommission = earning.amountInBDT * COMMISSION_RATE;
        const commissionAmount = totalExpectedCommission - alreadyPaidCommission;

        if (commissionAmount <= 0) {
            await session.abortTransaction();
            return null;
        }

        // 5. Create wallet transaction record
        await WalletTransactionModel.create(
            [
                {
                    staffId: staff._id,
                    amount: commissionAmount,
                    type: TransactionType.COMMISSION,
                    description: `5% commission from Client "${client.name}" Earning (${earning.month}/${earning.year}) - ৳${earning.amountInBDT.toLocaleString()}`,
                    status: "completed",
                    metadata: {
                        earningId: earning._id,
                        clientName: client.name,
                        amountInBDT: earning.amountInBDT,
                        commissionRate: COMMISSION_RATE,
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

export default {
    processEarningCommission,
    COMMISSION_RATE,
};
