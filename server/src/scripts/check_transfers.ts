import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });
const uri = process.env.MONGO_URI;

async function checkTransfers() {
    try {
        await mongoose.connect(uri!);
        const db = mongoose.connection.db;
        if (!db) throw new Error('DB not connected');

        console.log('Checking recent Profit Transfers...');
        const transfers = await db
            .collection('profittransfers')
            .find({})
            .sort({ createdAt: -1 })
            .limit(5)
            .toArray();

        console.log(`Found ${transfers.length} transfers.`);
        transfers.forEach((t) => {
            console.log(`- ID: ${t._id}`);
            console.log(`  Amount: ${t.amount}`);
            console.log(`  Date: ${t.transferDate}`);
            console.log(`  Year: ${t.year}`);
            console.log(`  Month: ${t.month}`);
            console.log(`  PeriodType: ${t.periodType}`);
            console.log(`  BusinessID: ${t.businessId}`);
            console.log('---');
        });
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}
checkTransfers();
