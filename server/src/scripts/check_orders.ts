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

        console.log('--- Collections matching "order" ---');
        const collections = await db.listCollections().toArray();
        const orderCols = collections.filter((c) =>
            c.name.toLowerCase().includes('order'),
        );
        orderCols.forEach((c) => console.log(`- ${c.name}`));

        console.log('\n--- Inspecting "orders" collection ---');
        const orderDoc = await db.collection('orders').findOne({});
        console.log(JSON.stringify(orderDoc, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}
inspect();
