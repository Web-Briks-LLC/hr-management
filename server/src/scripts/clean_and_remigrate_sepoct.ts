import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Types } from 'mongoose';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || '';

const monthMap: { [key: string]: number } = {
    september: 9,
    october: 10,
};

async function cleanAndMigrate() {
    console.log('Starting cleanup and re-migration for Sep/Oct 2025...');
    try {
        await mongoose.connect(MONGO_URI);
        const client = mongoose.connection.getClient();

        // Target
        const targetDb = mongoose.connection.db;
        if (!targetDb) throw new Error('Target DB not found');
        const targetColl = targetDb.collection('earnings');

        // 1. DELETE ALL Sep/Oct 2025 records
        console.log(
            'Deleting ALL earnings for Sep (9) and Oct (10) 2025 in target...',
        );
        const deleteResult = await targetColl.deleteMany({
            year: 2025,
            month: { $in: [9, 10] },
        });
        console.log(`Deleted ${deleteResult.deletedCount} records.`);

        // 2. Fetch from Source
        const sourceDb = client.db('hrManagement');
        const sourceColl = sourceDb.collection('earningsList');

        console.log('Fetching legacy records for Sep/Oct 2025...');
        // Match string names roughly
        const legacyDocs = await sourceColl
            .find({
                // Regex for case insensitive month names
                month: { $regex: /september|october/i },
                date: { $regex: /2025/ },
            })
            .toArray();

        console.log(`Found ${legacyDocs.length} source records.`);

        // 3. Transform and Insert
        const toInsert: any[] = [];
        let skipped = 0;

        for (const doc of legacyDocs) {
            const m = (doc.month as string).toLowerCase().trim();
            const monthNum = monthMap[m];

            if (!monthNum) {
                console.warn(
                    `Skipping doc ${doc._id} with unknown month '${m}'`,
                );
                skipped++;
                continue;
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
                status: 'paid',
                paidAt: new Date(), // Using now
                isLegacy: true,
                legacyClientCode: doc.clientId,
                notes: `Migrated from legacy (Sep/Oct fix): ${doc._id}`,
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: new Types.ObjectId('000000000000000000000000'),
            };

            toInsert.push(newDoc);
        }

        console.log(
            `Prepared ${toInsert.length} documents for insertion. Skipped: ${skipped}`,
        );

        if (toInsert.length > 0) {
            const result = await targetColl.insertMany(toInsert);
            console.log(`Inserted ${result.insertedCount} documents.`);
        }

        // 4. Verify Totals immediately
        const newStats = await targetColl
            .aggregate([
                { $match: { year: 2025, month: { $in: [9, 10] } } },
                {
                    $group: {
                        _id: '$month',
                        totalBDT: { $sum: '$amountInBDT' },
                        totalUSD: { $sum: '$totalAmount' },
                    },
                },
                { $sort: { _id: 1 } },
            ])
            .toArray();

        console.log('--- New Totals ---');
        console.log(newStats);

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}

cleanAndMigrate();
