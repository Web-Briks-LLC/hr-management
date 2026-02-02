import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const uri = process.env.MONGO_URI;

async function checkDates() {
    try {
        await mongoose.connect(uri!);
        const db = mongoose.connection.db;
        const col = db.collection('earnings_backup');

        const minDate = await col
            .find({}, { sort: { orderDate: 1 }, limit: 1 })
            .toArray();
        const maxDate = await col
            .find({}, { sort: { orderDate: -1 }, limit: 1 })
            .toArray();

        console.log('Earnings Backup Date Range:');
        if (minDate.length > 0) console.log('Min Date:', minDate[0].orderDate);
        if (maxDate.length > 0) console.log('Max Date:', maxDate[0].orderDate);

        const count = await col.countDocuments();
        console.log('Total Docs:', count);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkDates();
