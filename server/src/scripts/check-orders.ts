import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error("❌ MONGO_URI is not defined.");
        process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log("🔌 Connected to database.");

    const order = await mongoose.connection.db!.collection('orders').findOne({});
    console.log("📄 Order Document:");
    console.log(JSON.stringify(order, null, 2));

    // Sum of paid orders
    const paidOrdersSum = await mongoose.connection.db!.collection('orders').aggregate([
        { $match: { isPaid: true } },
        { $group: { _id: null, total: { $sum: "$totalPrice" } } }
    ]).toArray();
    console.log(`💰 Paid Orders Sum: ${paidOrdersSum[0]?.total || 0} USD`);

    // Sum of all orders
    const allOrdersSum = await mongoose.connection.db!.collection('orders').aggregate([
        { $group: { _id: null, total: { $sum: "$totalPrice" } } }
    ]).toArray();
    console.log(`💰 All Orders Sum: ${allOrdersSum[0]?.total || 0} USD`);

    await mongoose.disconnect();
}

run().catch(console.error);
