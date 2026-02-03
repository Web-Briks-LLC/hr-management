import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const uri = process.env.MONGO_URI;

async function inspect() {
    try {
        await mongoose.connect(uri!);
        const db = mongoose.connection.db;
        if (!db) throw new Error('DB not connected');
        const col = db.collection('earnings');

        const legacyCount = await col.countDocuments({ isLegacy: true });
        console.log(`Earnings with isLegacy: true -> ${legacyCount}`);

        const nonLegacyCount = await col.countDocuments({ isLegacy: false });
        console.log(`Earnings with isLegacy: false -> ${nonLegacyCount}`);

        const totalCount = await col.countDocuments({});
        console.log(`Total Earnings -> ${totalCount}`);

        if (legacyCount > 0) {
            const doc = await col.findOne({ isLegacy: true });
            console.log('Sample Legacy Doc:', JSON.stringify(doc, null, 2));
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

inspect();
