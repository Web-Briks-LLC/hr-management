import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });
const uri = process.env.MONGO_URI;

async function checkOrderDates() {
    try {
        await mongoose.connect(uri!);
        const db = mongoose.connection.db;
        if (!db) throw new Error('DB not connected');

        console.log('Checking Order Months for 2025...');

        const result = await db
            .collection('orders')
            .aggregate([
                {
                    $match: {
                        orderDate: {
                            $gte: new Date('2025-01-01'),
                            $lte: new Date('2025-12-31'),
                        },
                    },
                },
                {
                    $group: {
                        _id: { month: { $month: '$orderDate' } },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { '_id.month': 1 } },
            ])
            .toArray();

        result.forEach((r) => {
            console.log(`Month ${r._id.month}: ${r.count} orders`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}
checkOrderDates();
