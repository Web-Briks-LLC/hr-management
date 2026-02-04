import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import EarningModel from '../models/earning.model.js';
import ExpenseModel from '../models/expense.model.js';
import ProfitTransferModel from '../models/profit-transfer.model.js';
import DebitModel from '../models/Debit.js';

// Load env
dotenv.config({ path: path.join(process.cwd(), '.env') });
if (!process.env.MONGO_URI) {
    dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });
}

const uri = process.env.MONGO_URI;

// Mock DebitType enum if not imported
const DebitType = {
    BORROW: 'Borrow',
    RETURN: 'Return',
};

async function debugAnalytics() {
    if (!uri) {
        console.error('MONGO_URI is not defined');
        process.exit(1);
    }

    try {
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        // Set date range for 2025
        const year = 2025;
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

        console.log(
            `Analyzing data for ${year} (${startDate.toISOString()} - ${endDate.toISOString()})`,
        );

        // 1. Earnings (Only Paid)
        const earnings = await EarningModel.find({
            year: year,
            status: 'paid',
        });

        let totalEarnings = 0;
        earnings.forEach((e: any) => {
            totalEarnings += e.amountInBDT;
        });

        console.log('--- Earnings ---');
        console.log('Total Earnings (Paid Only):', totalEarnings);

        // 2. Expenses
        const expenseResult = await ExpenseModel.aggregate([
            {
                $match: {
                    date: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' },
                },
            },
        ]);
        const totalExpenses = expenseResult[0]?.total || 0;
        console.log('--- Expenses ---');
        console.log('Total Expenses:', totalExpenses);

        // 3. Shared (Profit Transfer + Distribution)
        const profitTransferResult = await ProfitTransferModel.aggregate([
            { $match: { transferDate: { $gte: startDate, $lte: endDate } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);
        const totalTransferred = profitTransferResult[0]?.total || 0;

        let totalDistributed = 0;
        try {
            const ProfitDistribution =
                await import('../models/profit-distribution.model.js');
            const pdResult = await ProfitDistribution.default.aggregate([
                {
                    $match: {
                        distributedAt: { $gte: startDate, $lte: endDate },
                    },
                },
                { $group: { _id: null, total: { $sum: '$shareAmount' } } },
            ]);
            totalDistributed = pdResult[0]?.total || 0;
        } catch (e) {
            console.log('Could not load ProfitDistribution model', e);
        }

        const totalShared = totalTransferred + totalDistributed;

        console.log('--- Shared ---');
        console.log('Transferred:', totalTransferred);
        console.log('Distributed:', totalDistributed);
        console.log('Total Shared:', totalShared);

        // 4. Debit
        // List all debits
        const allDebits = await DebitModel.find({
            date: { $gte: startDate, $lte: endDate },
        });

        console.log('--- Debit Details ---');
        let calcBorrow = 0;
        let calcReturn = 0;

        allDebits.forEach((d) => {
            console.log(
                `Debit: ${d.amount} (${d.type}) - ${d.date.toISOString()}`,
            );
            if (d.type === DebitType.BORROW) calcBorrow += d.amount;
            if (d.type === DebitType.RETURN) calcReturn += d.amount;
        });

        const totalDebit = calcBorrow - calcReturn;

        console.log('--- Debit Summary ---');
        console.log('Borrow (Calc):', calcBorrow);
        console.log('Return (Calc):', calcReturn);
        console.log('Net Debit (Calc):', totalDebit);

        // Final Calculation
        const finalAmount =
            totalEarnings - totalExpenses - totalShared + totalDebit;
        console.log('\n--- Final ---');
        console.log(
            `Calculation: ${totalEarnings} (Earn) - ${totalExpenses} (Exp) - ${totalShared} (Share) + ${totalDebit} (Debit)`,
        );
        console.log('Final Amount:', finalAmount);
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

debugAnalytics();
