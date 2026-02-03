import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });
const uri = process.env.MONGO_URI;

/**
 * RESTORE LEGACY EARNINGS SCRIPT (Consolidated)
 *
 * Purpose: Restore the jan-aug 2025 earnings by creating ONE aggregated
 * document per month to avoid unique constraint violations (clientId + year + month).
 */

const RESTORE_DATA = [
    { month: 1, count: 13, total: 1989874.395 },
    { month: 2, count: 15, total: 3174042.5 },
    { month: 3, count: 18, total: 2707506.32 },
    { month: 4, count: 14, total: 3579803.101 },
    { month: 5, count: 17, total: 3006051.885 },
    { month: 6, count: 18, total: 2528551.92 },
    { month: 7, count: 15, total: 3727841.62 },
    { month: 8, count: 14, total: 2354306.24 },
];

async function restoreEarnings() {
    try {
        await mongoose.connect(uri!);
        const db = mongoose.connection.db;
        if (!db) throw new Error('DB not connected');

        console.log(
            'Restoring Legacy Earnings (Aggregated) for Jan-Aug 2025...',
        );

        const clientId = '6952ba2237bc6e4512a02602';
        const conversionRate = 120.998;

        let restoredCount = 0;

        for (const data of RESTORE_DATA) {
            const existing = await db.collection('earnings').findOne({
                year: 2025,
                month: data.month,
            });

            if (existing) {
                console.log(`Month ${data.month}: Already has docs. Skipping.`);
                continue;
            }

            const amountInBDT = data.total;
            const totalAmount = amountInBDT / conversionRate;

            const doc = {
                clientId: new mongoose.Types.ObjectId(clientId),
                year: 2025,
                month: data.month,
                amountInBDT: amountInBDT,
                totalAmount: totalAmount,
                netAmount: totalAmount,
                conversionRate: conversionRate,
                currency: 'USD',
                status: 'paid',
                isLegacy: true,
                isFixed: false,
                orderIds: [], // Empty
                legacyClientCode: 'WB_1001_31',
                createdAt: new Date(),
                updatedAt: new Date(),
                imageQty: 0,
                notes: `Restored legacy data (Aggregated ${data.count} docs)`,
            };

            await db.collection('earnings').insertOne(doc);
            console.log(
                `Month ${data.month}: Restored 1 Consolidated Doc (Total BDT: ${data.total})`,
            );
            restoredCount++;
        }

        console.log('------------------------------------------------');
        console.log(`Restore Complete. Restored ${restoredCount} documents.`);
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

restoreEarnings();
