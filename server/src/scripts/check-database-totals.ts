import mongoose from 'mongoose';
import dotenv from 'dotenv';
import EarningModel from '../models/earning.model.js';
import ExpenseModel from '../models/expense.model.js';
import DebitModel, { DebitType } from '../models/Debit.js';
import ProfitTransferModel from '../models/profit-transfer.model.js';
import ProfitDistributionModel from '../models/profit-distribution.model.js';
import WalletTransactionModel from '../models/wallet-transaction.model.js';

dotenv.config();

async function run() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error("❌ MONGO_URI is not defined.");
        process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log("🔌 Connected to database.");

    // 1. Earnings Breakdown
    const [allEarningsCount, paidEarningsSum, unpaidEarningsSum] = await Promise.all([
        EarningModel.countDocuments({}),
        EarningModel.aggregate([
            { $match: { status: "paid" } },
            { $group: { _id: null, total: { $sum: "$amountInBDT" } } }
        ]),
        EarningModel.aggregate([
            { $match: { status: "unpaid" } },
            { $group: { _id: null, total: { $sum: "$amountInBDT" } } }
        ])
    ]);

    // 2. Expenses Breakdown
    const [allExpensesCount, paidExpensesSum, pendingExpensesSum] = await Promise.all([
        ExpenseModel.countDocuments({}),
        ExpenseModel.aggregate([
            { $match: { status: { $in: ["paid", "partial_paid"] } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]),
        ExpenseModel.aggregate([
            { $match: { status: "pending" } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ])
    ]);

    // 3. Debits
    const [allDebitsCount, borrowDebitsSum, returnDebitsSum] = await Promise.all([
        DebitModel.countDocuments({}),
        DebitModel.aggregate([
            { $match: { type: DebitType.BORROW } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]),
        DebitModel.aggregate([
            { $match: { type: DebitType.RETURN } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ])
    ]);

    // 4. Profit Distribution & Transfers
    const [distCount, distSum, transferCount, transferSum] = await Promise.all([
        ProfitDistributionModel.countDocuments({ status: "distributed" }),
        ProfitDistributionModel.aggregate([
            { $match: { status: "distributed" } },
            { $group: { _id: null, total: { $sum: "$shareAmount" } } }
        ]),
        ProfitTransferModel.countDocuments({}),
        ProfitTransferModel.aggregate([
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ])
    ]);

    // 5. Wallet Transactions
    const [walletCount, walletSum] = await Promise.all([
        WalletTransactionModel.countDocuments({ type: "withdrawal", status: "completed" }),
        WalletTransactionModel.aggregate([
            { $match: { type: "withdrawal", status: "completed" } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ])
    ]);

    console.log(`\n=================== FINANCIAL METRICS BREAKDOWN ===================`);
    console.log(`📈 Earnings (Revenue):`);
    console.log(`   - Total Earning Documents: ${allEarningsCount}`);
    console.log(`   - Paid Earnings: ${(paidEarningsSum[0]?.total || 0).toLocaleString()} BDT`);
    console.log(`   - Unpaid Earnings: ${(unpaidEarningsSum[0]?.total || 0).toLocaleString()} BDT`);
    
    console.log(`\n📉 Expenses (Cash Outflow):`);
    console.log(`   - Total Expense Documents: ${allExpensesCount}`);
    console.log(`   - Paid/Partial Expenses: ${(paidExpensesSum[0]?.total || 0).toLocaleString()} BDT`);
    console.log(`   - Pending Expenses (Excluded from Cashflow): ${(pendingExpensesSum[0]?.total || 0).toLocaleString()} BDT`);

    console.log(`\n🏦 Debits (Borrow/Return):`);
    console.log(`   - Total Debit Documents: ${allDebitsCount}`);
    console.log(`   - Borrows (Inflow): ${(borrowDebitsSum[0]?.total || 0).toLocaleString()} BDT`);
    console.log(`   - Returns (Outflow): ${(returnDebitsSum[0]?.total || 0).toLocaleString()} BDT`);
    console.log(`   - Net Debit: ${((borrowDebitsSum[0]?.total || 0) - (returnDebitsSum[0]?.total || 0)).toLocaleString()} BDT`);

    console.log(`\n📢 Profit Share & Transfers (Outflow):`);
    console.log(`   - Shareholder Payouts Count: ${distCount}`);
    console.log(`   - Shareholder Payouts (Profit Distribution): ${(distSum[0]?.total || 0).toLocaleString()} BDT`);
    console.log(`   - External Business Transfers Count: ${transferCount}`);
    console.log(`   - External Business Transfers (Profit Transfer): ${(transferSum[0]?.total || 0).toLocaleString()} BDT`);
    
    console.log(`\n💳 Wallet Transactions (Staff Withdrawals):`);
    console.log(`   - Completed Staff Withdrawals Count: ${walletCount}`);
    console.log(`   - Completed Staff Withdrawals Total: ${(walletSum[0]?.total || 0).toLocaleString()} BDT`);

    console.log(`\n===================================================================`);
    
    const totalEarningsPaid = paidEarningsSum[0]?.total || 0;
    const totalExpensesPaid = paidExpensesSum[0]?.total || 0;
    const totalShared = (distSum[0]?.total || 0) + (transferSum[0]?.total || 0);
    const netDebit = (borrowDebitsSum[0]?.total || 0) - (returnDebitsSum[0]?.total || 0);
    const totalWallet = walletSum[0]?.total || 0;

    const formulaWithoutWallet = totalEarningsPaid - totalExpensesPaid - totalShared + netDebit;
    const formulaWithWallet = formulaWithoutWallet - totalWallet;

    console.log(`🧮 CALCULATION COMPILATION:`);
    console.log(`1. Net Profit (Paid Earnings - Paid Expenses) = ${(totalEarningsPaid - totalExpensesPaid).toLocaleString()} BDT`);
    console.log(`2. Net Profit - Shared + Debit (User Formula)   = ${formulaWithoutWallet.toLocaleString()} BDT`);
    console.log(`3. Net Profit - Shared + Debit - Wallet Withdrawals = ${formulaWithWallet.toLocaleString()} BDT`);
    console.log(`===================================================================`);

    await mongoose.disconnect();
}

run().catch(console.error);
