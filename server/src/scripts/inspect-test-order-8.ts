import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const mongoUri = process.env.MONGO_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/hr-management';

async function run() {
    try {
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db!;
        
        // Find Test Order 8
        const order = await db.collection('orders').findOne({
            orderName: { $regex: 'Test Order 8', $options: 'i' }
        });

        console.log('=== ORDER DOCUMENT ===');
        console.log(JSON.stringify(order, null, 2));

        if (!order) {
            console.log('Order not found!');
            // List all test orders
            const allOrders = await db.collection('orders').find({}).project({ orderName: 1, status: 1, imageQuantity: 1 }).toArray();
            console.log('All orders in DB:', allOrders);
            process.exit(0);
        }

        const logs = await db.collection('shiftproductions').find({
            orderId: order._id
        }).toArray();

        console.log('\n=== SHIFT PRODUCTION LOGS FOR THIS ORDER ===');
        console.log(JSON.stringify(logs, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
