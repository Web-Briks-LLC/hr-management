import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });
const uri = process.env.MONGO_URI;

async function checkOrderTotal() {
    try {
        await mongoose.connect(uri!);
        const db = mongoose.connection.db;
        if (!db) throw new Error('DB not connected');

        console.log('Calculating Total Order Value for 2025...');

        const startDate = new Date('2025-01-01T00:00:00.000Z');
        const endDate = new Date('2025-12-31T23:59:59.999Z');

        const result = await db
            .collection('orders')
            .aggregate([
                {
                    $match: {
                        orderDate: { $gte: startDate, $lte: endDate },
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalPrice: { $sum: '$totalPrice' },
                        count: { $sum: 1 },
                        avgPrice: { $avg: '$totalPrice' },
                    },
                },
            ])
            .toArray();

        // 27M BDT is roughly $230,000 USD (at 118 rate)
        // If orders are in USD, totalPrice sum should be ~230k.
        // If orders are in BDT/mixed, we need to know currency.
        // Assuming totalPrice is in USD mostly for this system?

        const total = result[0]?.totalPrice || 0;
        const count = result[0]?.count || 0;

        console.log(`Total Orders: ${count}`);
        console.log(`Total Price (Sum): ${total.toLocaleString()}`);
        console.log(`Approx BDT (at x118): ${(total * 118).toLocaleString()}`);
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}
checkOrderTotal();
