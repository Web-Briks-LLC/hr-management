import mongoose from 'mongoose';
import 'dotenv/config';

async function migrate() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hr-management');
        console.log('Connected.');

        const db = mongoose.connection.db;
        const Collection = db.collection('earnings');

        // Find records where paidAmountBDT > 0 but amountInBDT is 0 or missing
        const cursor = Collection.find({
            paidAmountBDT: { $gt: 0 },
            $or: [
                { amountInBDT: 0 },
                { amountInBDT: { $exists: false } }
            ]
        });

        const records = await cursor.toArray();
        console.log(`Found ${records.length} records to update.`);

        let updatedCount = 0;
        for (const doc of records) {
            await Collection.updateOne(
                { _id: doc._id },
                { $set: { amountInBDT: doc.paidAmountBDT } }
            );
            updatedCount++;
        }

        console.log(`Successfully updated ${updatedCount} records.`);
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
