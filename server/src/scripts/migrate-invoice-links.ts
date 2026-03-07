import mongoose from 'mongoose';
import 'dotenv/config';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hr-management';

async function migrate() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected.');

        const db = mongoose.connection.db;
        if (!db) throw new Error('Database connection failed');

        const invoicesColl = db.collection('invoicerecords');
        const ordersColl = db.collection('orders');
        const earningsColl = db.collection('earnings');

        // 1. Find invoices with orderIds
        const invoices = await invoicesColl.find({ orderIds: { $exists: true, $not: { $size: 0 } } }).toArray();
        console.log(`Found ${invoices.length} invoices with linked orders.`);

        let totalUpdatedOrders = 0;

        for (const invoice of invoices) {
            console.log(`Processing Invoice ${invoice.invoiceNumber}...`);
            
            const orderIds = invoice.orderIds.map((id: any) => 
                typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
            );

            const isPaid = invoice.paymentStatus === 'paid';
            
            const orderUpdate = await ordersColl.updateMany(
                { _id: { $in: orderIds } },
                { 
                    $set: { 
                        isPaid: isPaid,
                        invoiceNumber: invoice.invoiceNumber 
                    } 
                }
            );
            totalUpdatedOrders += orderUpdate.modifiedCount;

            // Sync Earning status if fully paid
            const earning = await earningsColl.findOne({
                clientId: invoice.clientId,
                month: invoice.month,
                year: invoice.year
            });

            if (earning && earning.status === 'paid') {
                const earningOrderIds = earning.orderIds.map((id: any) => 
                    typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
                );
                await ordersColl.updateMany(
                    { _id: { $in: earningOrderIds } },
                    { $set: { isPaid: true } }
                );
            }
        }

        // 2. Extra safety for all Paid Earnings
        const paidEarnings = await earningsColl.find({ status: 'paid' }).toArray();
        console.log(`Syncing ${paidEarnings.length} Paid Earnings records...`);
        for (const earning of paidEarnings) {
            if (earning.orderIds && earning.orderIds.length > 0) {
                const earningOrderIds = earning.orderIds.map((id: any) => 
                    typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
                );
                await ordersColl.updateMany(
                    { _id: { $in: earningOrderIds } },
                    { $set: { isPaid: true } }
                );
            }
        }

        console.log(`Migration complete. Total orders updated via Invoice/Earning linkage: ${totalUpdatedOrders}`);
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
