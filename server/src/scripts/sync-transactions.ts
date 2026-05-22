import mongoose from 'mongoose';
import dotenv from 'dotenv';
import EarningModel from '../models/earning.model.js';
import ExpenseModel from '../models/expense.model.js';
import DebitModel, { DebitType } from '../models/Debit.js';
import ProfitTransferModel from '../models/profit-transfer.model.js';
import ProfitDistributionModel from '../models/profit-distribution.model.js';
import TransactionModel from '../models/Transaction.js';

// Schema registration imports to allow populate to function standalone
import '../models/client.model.js';
import '../models/expense-category.model.js';
import '../models/Person.js';
import '../models/shareholder.model.js';
import '../models/external-business.model.js';
import '../models/staff.model.js';
import '../models/user.model.js';

dotenv.config();

async function runMigration() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error("❌ Error: MONGO_URI is not defined in the environment variables.");
        process.exit(1);
    }

    console.log("🔌 Connecting to MongoDB...");
    try {
        await mongoose.connect(mongoUri);
        console.log("🟢 Connected to database successfully.");
    } catch (err) {
        console.error("❌ Failed to connect to MongoDB:", err);
        process.exit(1);
    }

    console.log("🧹 Clearing existing unified transactions...");
    const deleteResult = await TransactionModel.deleteMany({});
    console.log(`🗑️ Cleared ${deleteResult.deletedCount} existing transactions.`);

    console.log("📦 Fetching data from financial source collections...");
    
    const [
        earnings,
        expenses,
        debits,
        distributions,
        transfers
    ] = await Promise.all([
        EarningModel.find({ status: "paid" }).populate("clientId").lean(),
        ExpenseModel.find({ status: { $in: ["paid", "partial_paid"] } }).populate("categoryId").lean(),
        DebitModel.find({}).populate("personId").lean(),
        ProfitDistributionModel.find({ status: "distributed" }).populate("shareholderId").lean(),
        ProfitTransferModel.find({}).populate("businessId").lean()
    ]);

    console.log(`📈 Fetched metrics:
   - Earnings: ${earnings.length} records
   - Expenses: ${expenses.length} records
   - Debits: ${debits.length} records
   - Profit Share: ${distributions.length} records
   - Profit Transfers: ${transfers.length} records`);

    const newTransactions: any[] = [];

    // 1. Earnings (Inflow)
    earnings.forEach(e => {
        newTransactions.push({
            sourceId: e._id,
            sourceType: "earning",
            title: `Revenue Earning: ${(e.clientId as any)?.name || e.legacyClientCode || "Client"}`,
            amount: e.totalAmount,
            currency: e.currency || "BDT",
            amountInBDT: e.paidAmountBDT || e.amountInBDT || 0,
            flow: "inflow",
            status: "paid",
            referenceId: (e.clientId as any)?._id || e.clientId,
            note: e.notes,
            createdBy: e.createdBy,
            branchId: (e as any).branchId,
            date: e.paidAt || (e as any).createdAt
        });
    });

    // 2. Expenses (Outflow)
    expenses.forEach(ex => {
        newTransactions.push({
            sourceId: ex._id,
            sourceType: "expense",
            title: `Expense: ${ex.title} (${(ex.categoryId as any)?.name || "Uncategorized"})`,
            amount: ex.amount,
            currency: "BDT",
            amountInBDT: ex.amount,
            flow: "outflow",
            status: ex.status,
            referenceId: ex.categoryId?._id || ex.categoryId,
            note: ex.note,
            createdBy: ex.createdBy,
            branchId: ex.branchId,
            date: ex.date || ex.createdAt
        });
    });

    // 3. Debits (Borrow is Inflow, Return is Outflow)
    debits.forEach(d => {
        newTransactions.push({
            sourceId: d._id,
            sourceType: "debit",
            title: `Debit ${d.type}: ${(d.personId as any)?.name || "Unknown Person"}`,
            amount: d.amount,
            currency: "BDT",
            amountInBDT: d.amount,
            flow: d.type === DebitType.BORROW ? "inflow" : "outflow",
            status: "completed",
            referenceId: (d.personId as any)?._id || d.personId,
            note: d.description,
            createdBy: d.createdBy,
            date: d.date || (d as any).createdAt
        });
    });

    // 4. Profit Distributions (Outflow)
    distributions.forEach(d => {
        newTransactions.push({
            sourceId: d._id,
            sourceType: "profit_share",
            title: `Profit Payout to ${(d.shareholderId as any)?.name || "Shareholder"}`,
            amount: d.shareAmount,
            currency: "BDT",
            amountInBDT: d.shareAmount,
            flow: "outflow",
            status: "distributed",
            referenceId: (d.shareholderId as any)?._id || d.shareholderId,
            note: d.notes,
            createdBy: d.distributedBy,
            date: d.distributedAt || d.createdAt
        });
    });

    // 5. Profit Transfers (Outflow)
    transfers.forEach(t => {
        newTransactions.push({
            sourceId: t._id,
            sourceType: "profit_transfer",
            title: `Profit Transfer to ${(t.businessId as any)?.name || "External Business"}`,
            amount: t.amount,
            currency: "BDT",
            amountInBDT: t.amount,
            flow: "outflow",
            status: "completed",
            referenceId: (t.businessId as any)?._id || t.businessId,
            note: t.notes,
            createdBy: t.transferredBy,
            date: t.transferDate || t.createdAt
        });
    });

    console.log(`⏳ Inserting ${newTransactions.length} standardized transactions...`);
    
    if (newTransactions.length > 0) {
        await TransactionModel.insertMany(newTransactions);
    }

    console.log("✅ Sync complete!");
    
    // Calculate total sums for validation
    let totalInflow = 0;
    let totalOutflow = 0;
    newTransactions.forEach(tx => {
        if (tx.flow === "inflow") totalInflow += tx.amountInBDT;
        else totalOutflow += tx.amountInBDT;
    });

    console.log(`🏁 Summary statistics:
   - Total Ingested: ${newTransactions.length} transactions
   - Accumulated Inflow: ${totalInflow.toLocaleString("en-US")} BDT
   - Accumulated Outflow: ${totalOutflow.toLocaleString("en-US")} BDT
   - Net Cash Ledger Balance: ${(totalInflow - totalOutflow).toLocaleString("en-US")} BDT`);

    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB.");
    process.exit(0);
}

runMigration().catch(err => {
    console.error("❌ Critical error during migration:", err);
    process.exit(1);
});
