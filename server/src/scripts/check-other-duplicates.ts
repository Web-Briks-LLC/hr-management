import mongoose from 'mongoose';
import dotenv from 'dotenv';
import DebitModel from '../models/Debit.js';
import WalletTransactionModel from '../models/wallet-transaction.model.js';
import ProfitDistributionModel from '../models/profit-distribution.model.js';
import ProfitTransferModel from '../models/profit-transfer.model.js';

dotenv.config();

async function checkOtherDuplicates() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error("❌ MONGO_URI is not defined.");
        process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log("🔌 Connected to database.");

    // 1. Debits
    const debitDupes = await DebitModel.aggregate([
        { $group: { _id: { amount: "$amount", date: "$date", personId: "$personId" }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
    ]);
    console.log(`📊 Duplicated Debits (by amount, date, person): ${debitDupes.length}`);

    // 2. Wallet Transactions
    const walletDupes = await WalletTransactionModel.aggregate([
        { $group: { _id: { amount: "$amount", createdAt: "$createdAt", staffId: "$staffId", type: "$type" }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
    ]);
    console.log(`📊 Duplicated Wallet Transactions (by amount, date, staff, type): ${walletDupes.length}`);

    // 3. Profit Distributions
    const distDupes = await ProfitDistributionModel.aggregate([
        { $group: { _id: { shareAmount: "$shareAmount", distributedAt: "$distributedAt", shareholderId: "$shareholderId" }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
    ]);
    console.log(`📊 Duplicated Profit Distributions (by amount, date, shareholder): ${distDupes.length}`);

    // 4. Profit Transfers
    const transferDupes = await ProfitTransferModel.aggregate([
        { $group: { _id: { amount: "$amount", transferDate: "$transferDate", businessId: "$businessId" }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
    ]);
    console.log(`📊 Duplicated Profit Transfers (by amount, date, business): ${transferDupes.length}`);

    await mongoose.disconnect();
}

checkOtherDuplicates().catch(console.error);
