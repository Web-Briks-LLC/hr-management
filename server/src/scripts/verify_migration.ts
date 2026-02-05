import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || '';

async function verify() {
    try {
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;
        if (!db) throw new Error('DB error');
        // Access 'earnings' in the default db (should be hr-management from URI)
        const collection = db.collection('earnings');

        const count = await collection.countDocuments({ isLegacy: true });
        console.log('Total legacy migrated records:', count);

        // Check for records without our note
        const randomDocs = await collection.countDocuments({
            isLegacy: true,
            notes: { $not: /Migrated from legacy/ },
        });
        console.log('Legacy records NOT from this migration:', randomDocs);

        // Check for duplicates by legacyClientCode
        // Note: legacyClientCode might be null if source lacked it? Source sample had it.
        const dupPipeline = [
            { $match: { isLegacy: true } },
            { $group: { _id: '$legacyClientCode', count: { $sum: 1 } } },
            { $match: { count: { $gt: 1 } } },
            { $count: 'duplicateLegacyCodes' },
        ];
        const dups = await collection.aggregate(dupPipeline).toArray();
        console.log('Duplicate legacy codes found:', dups);

        // Check distribution by month
        const pipeline = [
            { $match: { isLegacy: true } },
            {
                $group: {
                    _id: '$month',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$totalAmount' },
                },
            },
            { $sort: { _id: 1 } },
        ];

        const stats = await collection.aggregate(pipeline).toArray();
        console.log('Stats by month:', stats);

        await mongoose.disconnect();
    } catch (error) {
        console.error(error);
    }
}

verify();
