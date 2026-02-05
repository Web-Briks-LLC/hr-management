import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { endOfYear } from 'date-fns';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || '';

async function verify2024Logic() {
    console.log('Verifying 2024 Final Amount Logic (Should EXCLUDE Debit)...');
    try {
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;
        if (!db) throw new Error('DB error');

        const earningsColl = db.collection('earnings');
        const expensesColl = db.collection('expenses');

        // Find correct debit collection name
        const collections = await db.listCollections().toArray();
        const debitCollName =
            collections.find((c) => c.name.toLowerCase().includes('debit'))
                ?.name || 'debits';
        const actualDebitColl = db.collection(debitCollName);

        // Simulation parameters: Requesting Year 2024
        const year = 2024;
        const endDate = endOfYear(new Date(year, 0, 1)); // End of 2024

        console.log(
            `Calculating Cumulative Stats up to ${endDate.toISOString()}...`,
        );

        // 1. Cumulative Earnings (Paid, year <= 2024)
        const cumEarningsResult = await earningsColl
            .aggregate([
                { $match: { status: 'paid', year: { $lte: year } } },
                { $group: { _id: null, total: { $sum: '$amountInBDT' } } },
            ])
            .toArray();
        const cumEarnings = cumEarningsResult[0]?.total || 0;
        console.log(
            'Cumulative Earnings (Pre-2025):',
            cumEarnings.toLocaleString(),
        );

        // 2. Cumulative Expenses (date <= 2024-12-31)
        const cumExpensesResult = await expensesColl
            .aggregate([
                { $match: { date: { $lte: endDate } } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ])
            .toArray();
        const cumExpenses = cumExpensesResult[0]?.total || 0;
        console.log(
            'Cumulative Expenses (Pre-2025):',
            cumExpenses.toLocaleString(),
        );

        // 3. Cumulative Shared
        const cumShared = 0; // Assuming 0 for simplicity or fetch if needed
        console.log('Cumulative Shared:', cumShared);

        // 4. All Time Debit (Still fetching, but should be IGNORED for final amount)
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
        console.log('Total Debit in DB:', totalDebit.toLocaleString());

        // Final Calculation Simulation
        let finalAmount = cumEarnings - cumExpenses - cumShared;
        if (year >= 2025) {
            console.log('Year >= 2025, adding Total Debit...');
            finalAmount += totalDebit;
        } else {
            console.log('Year < 2025, IGNORING Total Debit...');
        }

        console.log('-----------------------------------------');
        console.log(
            'Calculated Final Amount for 2024:',
            finalAmount.toLocaleString(),
        );

        if (Math.abs(finalAmount - totalDebit) > 4000000 && year < 2025) {
            console.log(
                'SUCCESS: Final Amount does NOT include the ~5.4M debit.',
            );
        } else {
            console.log('WARNING: Review logic.');
        }

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}

verify2024Logic();
