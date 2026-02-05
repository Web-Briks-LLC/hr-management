import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || '';

async function investigate2026() {
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
        console.log('Using debit collection:', debitCollName);
        const actualDebitColl = db.collection(debitCollName);

        // 1. 2026 Earnings
        const earnings2026 = await earningsColl
            .aggregate([
                { $match: { year: 2026, status: 'paid' } },
                { $group: { _id: null, total: { $sum: '$amountInBDT' } } },
            ])
            .toArray();
        console.log('2026 Earnings (Paid):', earnings2026[0]?.total || 0);

        // 2. 2026 Expenses
        const start2026 = new Date('2026-01-01');
        const end2026 = new Date('2026-12-31');
        const expenses2026 = await expensesColl
            .aggregate([
                { $match: { date: { $gte: start2026, $lte: end2026 } } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ])
            .toArray();
        console.log('2026 Expenses:', expenses2026[0]?.total || 0);

        // 3. All Time Debit (Using correct Capitalized values)
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

        // Check distinctive types to be 100% sure we aren't missing 'borrow' vs 'Borrow'
        const distinctTypes = await actualDebitColl.distinct('type');
        console.log('Debit Types in DB:', distinctTypes);

        const borrow = debitBorrow[0]?.total || 0;
        const ret = debitReturn[0]?.total || 0;
        const totalDebit = borrow - ret;

        console.log(
            `Total Debit (Borrow ${borrow} - Return ${ret}):`,
            totalDebit,
        );

        // 4. Calculate Final Amount
        // Final = Earnings - Expenses - Shared(Assume 0) + Debit
        const earnings = earnings2026[0]?.total || 0;
        const expenses = expenses2026[0]?.total || 0;
        const estimatedFinal = earnings - expenses + totalDebit;
        console.log('Estimated Final Amount for 2026:', estimatedFinal);

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}

investigate2026();
