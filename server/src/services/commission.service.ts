import mongoose from "mongoose";
import StaffModel from "../models/staff.model.js";
import WalletTransactionModel, {
    TransactionType,
} from "../models/wallet-transaction.model.js";
import OrderModel from "../models/order.model.js";
import { Designation } from "../constants/designation.js";

const COMMISSION_RATE = 0.05; // 5%

/**
 * Process commission for a delivered order.
 * Only applies if the order was created by a staff member with the TELEMARKETER designation.
 *
 * @param orderId - The ID of the order that was delivered
 * @param changedBy - The userId who changed the status (for audit)
 */
async function processCommission(orderId: string, _changedBy: string) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Fetch the order
        const order = await OrderModel.findById(orderId).session(session);
        if (!order) {
            throw new Error("Order not found");
        }

        // 2. Check if commission was already processed for this order
        const existingTransaction = await WalletTransactionModel.findOne({
            orderId: order._id,
            type: TransactionType.COMMISSION,
            status: "completed",
        }).session(session);

        if (existingTransaction) {
            // Commission already processed — skip (prevents duplicates)
            await session.abortTransaction();
            return null;
        }

        // 3. Find the staff member who created the order
        //    The order.createdBy is a User ID, so we look up the staff by userId
        const staff = await StaffModel.findOne({
            userId: order.createdBy,
            designation: Designation.TELEMARKETER,
            status: "active",
        }).session(session);

        if (!staff) {
            // Not a telemarketer — no commission to process
            await session.abortTransaction();
            return null;
        }

        // 4. Calculate commission
        const commissionAmount = order.totalPrice * COMMISSION_RATE;

        // 5. Create wallet transaction record
        await WalletTransactionModel.create(
            [
                {
                    staffId: staff._id,
                    amount: commissionAmount,
                    type: TransactionType.COMMISSION,
                    orderId: order._id,
                    description: `5% commission from order "${order.orderName}" (৳${order.totalPrice.toLocaleString()})`,
                    status: "completed",
                    metadata: {
                        orderName: order.orderName,
                        totalPrice: order.totalPrice,
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
            `[Commission] ৳${commissionAmount} credited to ${staff.staffId} for order ${order.orderName}`,
        );

        return {
            staffId: staff.staffId,
            commissionAmount,
            orderName: order.orderName,
        };
    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
}

export default {
    processCommission,
    COMMISSION_RATE,
};
