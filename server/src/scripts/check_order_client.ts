import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });
const uri = process.env.MONGO_URI;

async function checkOrderClient() {
    try {
        await mongoose.connect(uri!);
        const db = mongoose.connection.db;

        console.log('Checking Order Client ID...');
        const targetClientId = '6952ba2237bc6e4512a02602'; // From check_jan_earning.ts

        // Find an order for this client
        const order = await db.collection('orders').findOne({
            clientId: new mongoose.Types.ObjectId(targetClientId),
        });

        if (order) {
            console.log('Found order with matching ObjectId ClientId:');
            console.log(`Order ID: ${order._id}`);
            console.log(`Client ID: ${order.clientId}`);
        } else {
            console.log('No order found with this ObjectId ClientId.');

            // Try finding by string match if possible (unlikely in mongo for objectid field)
            // Or just list first 5 orders and their client IDs
            const orders = await db
                .collection('orders')
                .find({})
                .limit(5)
                .toArray();
            console.log('Sample Order Client IDs:');
            orders.forEach((o) => console.log(`- ${o.clientId}`));
        }
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}
checkOrderClient();
