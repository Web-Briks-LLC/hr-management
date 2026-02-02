import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });
const uri = process.env.MONGO_URI;

async function checkJan() {
    try {
        await mongoose.connect(uri!);
        const db = mongoose.connection.db;

        console.log('Inspecting Jan 2025 Earnings...');
        const doc = await db.collection('earnings').findOne({
            year: 2025,
            month: 1,
        });

        if (doc) {
            console.log(JSON.stringify(doc, null, 2));
            console.log(`OrderIds Length: ${doc.orderIds?.length}`);
        } else {
            console.log('No earning found for Jan 2025');
        }
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}
checkJan();
