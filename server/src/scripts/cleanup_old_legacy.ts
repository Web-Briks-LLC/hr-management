import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || '';

async function cleanup() {
    try {
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;
        if (!db) throw new Error('DB error');
        const collection = db.collection('earnings');

        // Identify pre-existing legacy records for 2025 (NOT from our migration)
        const query = {
            isLegacy: true,
            year: 2025,
            notes: { $not: /Migrated from legacy/ },
        };

        const count = await collection.countDocuments(query);
        console.log(
            `Found ${count} pre-existing legacy records in 2025 to remove.`,
        );

        if (count > 0) {
            const result = await collection.deleteMany(query);
            console.log(`Deleted ${result.deletedCount} records.`);
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error(error);
    }
}

cleanup();
