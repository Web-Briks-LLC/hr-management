import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Types } from 'mongoose';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || '';

const monthMap: { [key: string]: number } = {
    January: 1,
    February: 2,
    March: 3,
    April: 4,
    May: 5,
    June: 6,
    July: 7,
    August: 8,
    September: 9,
    October: 10,
    November: 11,
    December: 12,
};

async function migrate() {
    console.log('Starting migration...');
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB.');

        const client = mongoose.connection.getClient();

        // Source
        const sourceDb = client.db('hrManagement');
        const sourceColl = sourceDb.collection('earningsList');

        // Target - using default connection DB
        const targetDb = mongoose.connection.db;
        if (!targetDb) throw new Error('Target DB not found');
        const targetColl = targetDb.collection('earnings');

        // CLEANUP: Remove previously migrated records
        console.log('Cleaning up previous run...');
        // Match documents created by this migration script
        const deleteResult = await targetColl.deleteMany({
            notes: { $regex: /^Migrated from legacy:/ },
        });
        console.log(
            `Deleted ${deleteResult.deletedCount} previous migration records.`,
        );

        // Fetch all source candidates
        const allLegacy = await sourceColl.find({}).toArray();
        console.log(`Found ${allLegacy.length} total legacy documents.`);

        const toInsert: any[] = [];

        // Build lower case map for case-insensitive matching
        const mapLower: { [key: string]: number } = {};
        for (const [k, v] of Object.entries(monthMap)) {
            mapLower[k.toLowerCase()] = v;
        }

        for (const doc of allLegacy) {
            const dateStr = doc.date as string;
            if (!dateStr || !dateStr.includes('2025')) {
                continue;
            }

            // Normalize month name
            let monthName = (doc.month as string).trim();
            const monthLower = monthName.toLowerCase();
            const monthNum = mapLower[monthLower];

            if (!monthNum) {
                console.warn(`Unknown month: ${monthName} in doc ${doc._id}`);
                continue;
            }

            // Target range: Jan (1) to Oct (10)
            if (monthNum > 10) {
                // Skip Nov (11), Dec (12)
                continue;
            }

            // Transform
            const newDoc = {
                clientId: new Types.ObjectId(), // Random ID
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
                paidAt: new Date(),
                isLegacy: true,
                legacyClientCode: doc.clientId,
                notes: `Migrated from legacy: ${doc._id}`,
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
        } else {
            console.log('Nothing to insert.');
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Migration failed:', error);
    }
}

migrate();
