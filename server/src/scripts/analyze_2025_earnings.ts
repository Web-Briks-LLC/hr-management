import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });
const uri = process.env.MONGO_URI;

async function analyzeEarnings() {
    try {
        await mongoose.connect(uri!);
        const db = mongoose.connection.db;

        console.log('Analyzing 2025 Earnings...');

        const breakdown = await db
            .collection('earnings')
            .aggregate([
                { $match: { year: 2025 } },
                {
                    $group: {
                        _id: { month: '$month', isLegacy: '$isLegacy' },
                        totalBDT: { $sum: '$amountInBDT' },
                        count: { $sum: 1 },
                        avgBDT: { $avg: '$amountInBDT' },
                    },
                },
                { $sort: { '_id.month': 1 } },
            ])
            .toArray();

        console.log('Month | Legacy | Count | Total BDT       | Avg BDT');
        console.log('----------------------------------------------------');

        let grandTotal = 0;

        breakdown.forEach((b) => {
            const m = b._id.month.toString().padStart(2, '0');
            const leg = b._id.isLegacy ? 'YES ' : 'NO  ';
            const cnt = b.count.toString().padStart(4, ' ');
            const tot = b.totalBDT.toLocaleString().padStart(15, ' ');
            const avg = Math.round(b.avgBDT).toLocaleString().padStart(10, ' ');

            console.log(`${m}    | ${leg}   | ${cnt} | ${tot} | ${avg}`);
            grandTotal += b.totalBDT;
        });

        console.log('----------------------------------------------------');
        console.log(`GRAND TOTAL 2025: BDT ${grandTotal.toLocaleString()}`);
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}
analyzeEarnings();
