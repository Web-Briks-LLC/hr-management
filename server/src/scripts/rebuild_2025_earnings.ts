import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Types } from 'mongoose';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || '';

const monthMap: { [key: string]: number } = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
};

async function rebuildAll() {
    console.log(
        'Starting COMPLETE Rebuild of Migrated Earnings Jan-Oct 2025...',
    );
    try {
        await mongoose.connect(MONGO_URI);
        const client = mongoose.connection.getClient();

        // Target
        const targetDb = mongoose.connection.db;
        if (!targetDb) throw new Error('Target DB not found');
        const targetColl = targetDb.collection('earnings');

        // 1. DELETE ALL 2025 migrated records (Jan-Oct)
        // Ideally we only delete 1-10 months, in case Nov/Dec has real data.
        console.log('Deleting all earnings for Jan-Oct 2025...');
        const deleteResult = await targetColl.deleteMany({
            year: 2025,
            month: { $in: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
        });
        console.log(`Deleted ${deleteResult.deletedCount} records.`);

        // 2. Fetch Source
        const sourceDb = client.db('hrManagement');
        const sourceColl = sourceDb.collection('earningsList');

        console.log('Fetching legacy records...');
        const legacyDocs = await sourceColl
            .find({
                date: { $regex: /2025/ },
            })
            .toArray();

        // Case insensitve map
        const mapLower: { [key: string]: number } = {};
        for (const [k, v] of Object.entries(monthMap)) {
            mapLower[k.toLowerCase()] = v;
        }

        const toInsert: any[] = [];

        for (const doc of legacyDocs) {
            const m = (doc.month as string).toLowerCase().trim();
            const monthNum = mapLower[m]; // Only matches Jan-Oct keys

            if (!monthNum) {
                // Could be Nov/Dec or invalid
                // If it is Nov/Dec we skip as per instructions "october porjonto"
                continue;
            }

            // Status handling: copy "Paid"/"Unpaid" -> "paid"/"unpaid"
            let status = 'paid';
            if (doc.status) {
                status = doc.status.toLowerCase();
            }

            const newDoc = {
                clientId: new Types.ObjectId(),
                month: monthNum,
                year: 2025,
                orderIds: [],
                imageQty: doc.imageQty || 0,
                totalAmount: doc.totalUsd || 0,
                currency: 'USD',
                fees: 0,
                tax: 0,
                conversionRate: doc.convertRate || 1,
                netAmount: doc.totalUsd || 0,
                amountInBDT: doc.convertedBdt || 0,
                status: status, // Correctly mapped status
                paidAt: status === 'paid' ? new Date() : undefined, // Check if paid
                isLegacy: true,
                legacyClientCode: doc.clientId,
                notes: `Migrated from legacy (Full Rebuild): ${doc._id}`,
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: new Types.ObjectId('000000000000000000000000'),
            };

            toInsert.push(newDoc);
        }

        console.log(`Prepared ${toInsert.length} documents for insertion.`);

        if (toInsert.length > 0) {
            const result = await targetColl.insertMany(toInsert);
            console.log(`Inserted ${result.insertedCount} documents.`);
        }

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}

rebuildAll();
