import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const uri = process.env.MONGO_URI;

async function inspect() {
    try {
        await mongoose.connect(uri!);

        const collections = [
            'earnings_backup',
            'earningsList',
            'earnings',
            'clients',
        ];

        for (const colName of collections) {
            console.log(`\n--- Inspecting ${colName} ---`);
            const db = mongoose.connection.db;
            if (!db) throw new Error('DB not connected');
            const col = db.collection(colName);
            const count = await col.countDocuments();
            console.log(`Count: ${count}`);

            if (count > 0) {
                const doc = await col.findOne({});
                console.log(JSON.stringify(doc, null, 2));
            }
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

inspect();
