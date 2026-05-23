import mongoose from 'mongoose';
import dotenv from 'dotenv';
import EarningModel from '../models/earning.model.js';
import ExpenseModel from '../models/expense.model.js';
import DebitModel, { DebitType } from '../models/Debit.js';
import ProfitTransferModel from '../models/profit-transfer.model.js';
import ProfitDistributionModel from '../models/profit-distribution.model.js';
import WalletTransactionModel from '../models/wallet-transaction.model.js';

// Schema registration imports
import '../models/client.model.js';
import '../models/expense-category.model.js';
import '../models/Person.js';
import '../models/shareholder.model.js';
import '../models/external-business.model.js';
import '../models/staff.model.js';
import '../models/user.model.js';

dotenv.config();

async function run() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error("❌ MONGO_URI is not defined.");
        process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log("🔌 Connected to database.");

    // 1. Search for Wazed Akndo
    console.log("\n--- Searching for Wazed Akndo in User Collection ---");
    const userCol = mongoose.connection.collection("user");
    const wazedUsers = await userCol.find({
        $or: [
            { name: /wazed/i },
            { email: /wazed/i }
        ]
    }).toArray();
    console.log("Wazed users found:", JSON.stringify(wazedUsers, null, 2));

    // 2. Fetch all expenses around April 2026
    console.log("\n--- Fetching Expenses from 2026-04-20 to 2026-05-05 ---");
    const expenses = await ExpenseModel.find({
        date: {
            $gte: new Date("2026-04-20T00:00:00.000Z"),
            $lte: new Date("2026-05-05T23:59:59.999Z")
        }
    }).lean();

    console.log(`Found ${expenses.length} expenses.`);
    for (const exp of expenses) {
        const creator = exp.createdBy ? await userCol.findOne({ _id: exp.createdBy }) : null;
        console.log(`\nExpense:
  ID: ${exp._id}
  Title: "${exp.title}"
  Amount: ${exp.amount} BDT
  Date (date field): ${exp.date.toISOString()}
  CreatedAt: ${exp.createdAt.toISOString()}
  CreatedBy: ${exp.createdBy} (${creator ? creator.name : 'Unknown'} - ${creator ? creator.email : ''})
  Status: ${exp.status}
  Note: "${exp.note || ''}"`);
    }

    // 3. Trace running balance chronologically and output around those dates
    console.log("\n--- Tracing Running Balance Chronologically ---");
    const [
        earnings,
        allExpenses,
        debits,
        walletWithdrawals,
        distributions,
        transfers
    ] = await Promise.all([
        EarningModel.find({ status: "paid" }).lean(),
        ExpenseModel.find({ status: { $in: ["paid", "partial_paid"] } }).lean(),
        DebitModel.find({}).lean(),
        WalletTransactionModel.find({ type: "withdrawal", status: "completed" }).lean(),
        ProfitDistributionModel.find({ status: "distributed" }).lean(),
        ProfitTransferModel.find({}).lean()
    ]);

    const allTx: any[] = [];

    earnings.forEach(e => {
        allTx.push({
            id: e._id,
            type: "earning",
            amount: e.amountInBDT,
            flow: "inflow",
            date: e.paidAt || (e as any).createdAt,
            notes: e.notes || "No notes",
            ref: e.invoiceNo || ""
        });
    });

    allExpenses.forEach(ex => {
        allTx.push({
            id: ex._id,
            type: "expense",
            amount: ex.amount,
            flow: "outflow",
            date: ex.date || ex.createdAt,
            notes: `${ex.title} - ${ex.note || ""}`
        });
    });

    debits.forEach(d => {
        allTx.push({
            id: d._id,
            type: "debit",
            amount: d.amount,
            flow: d.type === DebitType.BORROW ? "inflow" : "outflow",
            date: d.date || (d as any).createdAt,
            notes: `Debit ${d.type} - ${d.description || ""}`
        });
    });

    walletWithdrawals.forEach(w => {
        allTx.push({
            id: w._id,
            type: "wallet_withdrawal",
            amount: w.amount,
            flow: "outflow",
            date: w.createdAt,
            notes: w.description || "Wallet withdrawal"
        });
    });

    distributions.forEach(d => {
        allTx.push({
            id: d._id,
            type: "profit_distribution",
            amount: d.shareAmount,
            flow: "outflow",
            date: d.distributedAt || d.createdAt,
            notes: d.notes || "Profit distribution"
        });
    });

    transfers.forEach(t => {
        allTx.push({
            id: t._id,
            type: "profit_transfer",
            amount: t.amount,
            flow: "outflow",
            date: t.transferDate || t.createdAt,
            notes: t.notes || "Profit transfer"
        });
    });

    allTx.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = 0;
    const targetStartDate = new Date("2026-04-25T00:00:00.000Z").getTime();
    const targetEndDate = new Date("2026-05-05T23:59:59.999Z").getTime();

    console.log("\nTransactions around target window (2026-04-25 to 2026-05-05):");
    allTx.forEach((tx, idx) => {
        const prevBal = running;
        if (tx.flow === "inflow") {
            running += tx.amount;
        } else {
            running -= tx.amount;
        }
        tx.runningBalance = running;

        const txTime = new Date(tx.date).getTime();
        if (txTime >= targetStartDate && txTime <= targetEndDate) {
            console.log(`[Idx: ${idx}] Date: ${new Date(tx.date).toISOString()} | Type: ${tx.type} | Amount: ${tx.amount} (${tx.flow}) | Prev Bal: ${prevBal.toFixed(2)} | New Bal: ${running.toFixed(2)} | Notes: ${tx.notes} | ID: ${tx.id}`);
        }
    });

    await mongoose.disconnect();
}

run().catch(console.error);
