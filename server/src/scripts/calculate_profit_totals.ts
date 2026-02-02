import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });
const uri = process.env.MONGO_URI;

async function calculateTotals() {
    try {
        await mongoose.connect(uri!);
        const db = mongoose.connection.db;

        console.log('Calculating Profit Share Totals...');

        // 1. Calculate Distributed Profit (Shareholders)
        const distributions = await db
            .collection('profitdistributions')
            .aggregate([
                {
                    $group: {
                        _id: null,
                        totalDistributed: { $sum: '$shareAmount' },
                        count: { $sum: 1 },
                    },
                },
            ])
            .toArray();
        const totalDistributed = distributions[0]?.totalDistributed || 0;
        const distCount = distributions[0]?.count || 0;

        // 2. Calculate Transferred Profit (External Business)
        const transfers = await db
            .collection('profittransfers')
            .aggregate([
                {
                    $group: {
                        _id: null,
                        totalTransferred: { $sum: '$amount' },
                        count: { $sum: 1 },
                    },
                },
            ])
            .toArray();
        const totalTransferred = transfers[0]?.totalTransferred || 0;
        const transCount = transfers[0]?.count || 0;

        const grandTotal = totalDistributed + totalTransferred;

        console.log('------------------------------------------------');
        console.log(
            `Shareholder Distributions: ৳${totalDistributed.toLocaleString()} (${distCount} records)`,
        );
        console.log(
            `External Transfers:        ৳${totalTransferred.toLocaleString()} (${transCount} records)`,
        );
        console.log('------------------------------------------------');
        console.log(
            `GRAND TOTAL:               ৳${grandTotal.toLocaleString()}`,
        );
        console.log('------------------------------------------------');
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

calculateTotals();
