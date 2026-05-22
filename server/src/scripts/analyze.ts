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

async function analyze() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error("❌ MONGO_URI is not defined.");
        process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log("🔌 Connected to database for analysis.");

    const [
        earnings,
        expenses,
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
            type: "earning",
            amount: e.amountInBDT,
            flow: "inflow",
            date: e.paidAt || (e as any).createdAt,
            notes: e.notes || "No notes"
        });
    });

    expenses.forEach(ex => {
        allTx.push({
            type: "expense",
            amount: ex.amount,
            flow: "outflow",
            date: ex.date || ex.createdAt,
            notes: `${ex.title} - ${ex.note || ""}`
        });
    });

    debits.forEach(d => {
        allTx.push({
            type: "debit",
            amount: d.amount,
            flow: d.type === DebitType.BORROW ? "inflow" : "outflow",
            date: d.date || (d as any).createdAt,
            notes: `Debit ${d.type} - ${d.description || ""}`
        });
    });

    walletWithdrawals.forEach(w => {
        allTx.push({
            type: "wallet_withdrawal",
            amount: w.amount,
            flow: "outflow",
            date: w.createdAt,
            notes: w.description || "Wallet withdrawal"
        });
    });

    distributions.forEach(d => {
        allTx.push({
            type: "profit_distribution",
            amount: d.shareAmount,
            flow: "outflow",
            date: d.distributedAt || d.createdAt,
            notes: d.notes || "Profit distribution"
        });
    });

    transfers.forEach(t => {
        allTx.push({
            type: "profit_transfer",
            amount: t.amount,
            flow: "outflow",
            date: t.transferDate || t.createdAt,
            notes: t.notes || "Profit transfer"
        });
    });

    // Sort chronologically
    allTx.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    console.log(`📊 Loaded ${allTx.length} total transactions.`);

    let running = 0;
    let minBalance = 0;
    let minBalanceDate: Date | null = null;
    let firstNegativeTx: any = null;

    const negativeTransactions: any[] = [];

    allTx.forEach((tx, idx) => {
        if (tx.flow === "inflow") {
            running += tx.amount;
        } else {
            running -= tx.amount;
        }
        tx.runningBalance = running;

        if (running < 0) {
            negativeTransactions.push({
                idx,
                ...tx,
                dateStr: new Date(tx.date).toLocaleString()
            });
            if (minBalance === 0 || running < minBalance) {
                minBalance = running;
                minBalanceDate = tx.date;
            }
            if (!firstNegativeTx) {
                firstNegativeTx = {
                    idx,
                    ...tx,
                    dateStr: new Date(tx.date).toLocaleString()
                };
            }
        }
    });

    console.log(`\n🏁 Analysis results:`);
    console.log(`- Final Running Balance: ${running.toLocaleString()} BDT`);
    console.log(`- Lowest Running Balance: ${minBalance.toLocaleString()} BDT on ${minBalanceDate ? new Date(minBalanceDate).toLocaleString() : 'N/A'}`);
    
    if (firstNegativeTx) {
        console.log(`\n🔴 First transaction that pushed balance below zero:`);
        console.log(JSON.stringify(firstNegativeTx, null, 2));
    }

    console.log(`\n⚠️ Total transactions with negative running balance: ${negativeTransactions.length}`);
    if (negativeTransactions.length > 0) {
        console.log(`\n📅 First 15 negative balance transactions:`);
        console.table(negativeTransactions.slice(0, 15).map(t => ({
            Index: t.idx,
            Date: t.dateStr,
            Type: t.type,
            Flow: t.flow,
            Amount: t.amount,
            "Running Balance": t.runningBalance,
            Notes: t.notes.substring(0, 50)
        })));
    }

    await mongoose.disconnect();
}

analyze().catch(console.error);
