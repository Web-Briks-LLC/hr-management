import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { endOfYear } from 'date-fns';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || '';

async function verifyFinalAmount() {
    console.log('Verifying Cumulative Final Amount Logic...');
    try {
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;
        if (!db) throw new Error('DB error');

        const earningsColl = db.collection('earnings');
        const expensesColl = db.collection('expenses');
        const transferColl = db.collection('profittransfers');
        const distColl = db.collection('profitdistributions');

        // Find correct debit collection name
        const collections = await db.listCollections().toArray();
        const debitCollName =
            collections.find((c) => c.name.toLowerCase().includes('debit'))
                ?.name || 'debits';
        const actualDebitColl = db.collection(debitCollName);

        // Simulation parameters: Requesting Year 2026
        const year = 2026;
        const endDate = endOfYear(new Date(year, 0, 1)); // End of 2026

        console.log(
            `Calculating Cumulative Stats up to ${endDate.toISOString()}...`,
        );

        // 1. Cumulative Earnings (Paid, year <= 2026)
        const cumEarningsResult = await earningsColl
            .aggregate([
                { $match: { status: 'paid', year: { $lte: year } } },
                { $group: { _id: null, total: { $sum: '$amountInBDT' } } },
            ])
            .toArray();
        const cumEarnings = cumEarningsResult[0]?.total || 0;
        console.log('Cumulative Earnings:', cumEarnings.toLocaleString());

        // 2. Cumulative Expenses (date <= 2026-12-31)
        const cumExpensesResult = await expensesColl
            .aggregate([
                { $match: { date: { $lte: endDate } } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ])
            .toArray();
        const cumExpenses = cumExpensesResult[0]?.total || 0;
        console.log('Cumulative Expenses:', cumExpenses.toLocaleString());

        // 3. Cumulative Shared
        const cumTransfersResult = await transferColl
            .aggregate([
                { $match: { transferDate: { $lte: endDate } } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ])
            .toArray();
        const cumDistResult = await distColl
            .aggregate([
                { $match: { distributedAt: { $lte: endDate } } },
                { $group: { _id: null, total: { $sum: '$shareAmount' } } },
            ])
            .toArray();

        const cumShared =
            (cumTransfersResult[0]?.total || 0) +
            (cumDistResult[0]?.total || 0);
        console.log('Cumulative Shared:', cumShared.toLocaleString());

        // 4. All Time Debit
        const debitBorrow = await actualDebitColl
            .aggregate([
                { $match: { type: 'Borrow' } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ])
            .toArray();

        const debitReturn = await actualDebitColl
            .aggregate([
                { $match: { type: 'Return' } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ])
            .toArray();
        const totalDebit =
            (debitBorrow[0]?.total || 0) - (debitReturn[0]?.total || 0);
        console.log('Total Debit:', totalDebit.toLocaleString());

        // Final Calculation
        const finalAmount = cumEarnings - cumExpenses - cumShared + totalDebit;
        console.log('-----------------------------------------');
        console.log(
            'Start Balance (2025 Closing approx):',
            (cumEarnings - cumExpenses - cumShared - -87639).toLocaleString(),
        ); // Just estimating
        console.log('Calculated Final Amount:', finalAmount.toLocaleString());

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}

verifyFinalAmount();
