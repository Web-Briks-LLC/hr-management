import { MongoClient } from 'mongodb';

const MONGODB_URI =
    'mongodb+srv://hrManagement:Oo0kwMllNlxfoDQb@hr-management.ntt3g.mongodb.net/hr-management?retryWrites=true&w=majority&appName=hr-management';

async function syncOrderDates() {
    const client = new MongoClient(MONGODB_URI);

    try {
        console.log('Connecting to MongoDB...');
        await client.connect();
        console.log('Connected successfully!');

        const db = client.db('hr-management');
        const ordersCollection = db.collection('orders');

        // Get all orders
        const orders = await ordersCollection.find({}).toArray();
        console.log(`Found ${orders.length} orders`);

        let updatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const order of orders) {
            try {
                if (order.orderDate) {
                    const orderDate = new Date(order.orderDate);

                    if (isNaN(orderDate.getTime())) {
                        console.log(
                            `Skipping order ${order._id}: Invalid orderDate`
                        );
                        skippedCount++;
                        continue;
                    }

                    // Update createdAt to match orderDate
                    await ordersCollection.updateOne(
                        { _id: order._id },
                        { $set: { createdAt: orderDate } }
                    );

                    updatedCount++;
                    console.log(
                        `Updated order ${
                            order._id
                        }: createdAt set to ${orderDate.toISOString()}`
                    );
                } else {
                    console.log(
                        `Skipping order ${order._id}: No orderDate found`
                    );
                    skippedCount++;
                }
            } catch (err) {
                console.error(`Error updating order ${order._id}:`, err);
                errorCount++;
            }
        }

        console.log('\n--- Summary ---');
        console.log(`Total orders: ${orders.length}`);
        console.log(`Updated: ${updatedCount}`);
        console.log(`Skipped: ${skippedCount}`);
        console.log(`Errors: ${errorCount}`);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
        console.log('\nConnection closed');
    }
}

syncOrderDates();
