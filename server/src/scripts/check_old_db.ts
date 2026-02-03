import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });
const uri = process.env.MONGO_URI;

async function checkOldDB() {
    try {
        console.log('Connecting to hrManagement (Old DB)...');
        // Force connection to 'hrManagement' database
        await mongoose.connect(uri!, { dbName: 'hrManagement' });
        const db = mongoose.connection.db;
        if (!db) throw new Error('DB not connected');

        console.log('--- Collections in hrManagement ---');
        const collections = await db.listCollections().toArray();
        collections.forEach((c) => console.log(`- ${c.name}`));

        console.log('\n--- Inspecting localOrderList ---');
        const count = await db.collection('localOrderList').countDocuments();
        console.log(`Count: ${count}`);

        if (count > 0) {
            const doc = await db.collection('localOrderList').findOne({});
            console.log(JSON.stringify(doc, null, 2));
        }
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}
checkOldDB();
