import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hr-management';

// Import models
import OrderModel from './src/models/order.model.js';
import { InvoiceRecord } from './src/models/invoice-record.model.js';
import EarningModel from './src/models/earning.model.js';
import ClientModel from './src/models/client.model.js';

async function migrate() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected.');

        const invoices = await InvoiceRecord.find({ orderIds: { $exists: true, $not: { $size: 0 } } });
        console.log(`Found ${invoices.length} invoices with linked orders.`);

        let updatedOrdersCount = 0;

        for (const invoice of invoices) {
            console.log(`Processing Invoice ${invoice.invoiceNumber}...`);
            
            // 1. Update Orders linked to this invoice
            const orderUpdate = await OrderModel.updateMany(
                { _id: { $in: invoice.orderIds } },
                { 
                    $set: { 
                        isPaid: invoice.paymentStatus === 'paid',
                        invoiceNumber: invoice.invoiceNumber 
                    } 
                }
            );
            updatedOrdersCount += orderUpdate.modifiedCount;

            // 2. Fix Earnings if they are fully paid
            // We can match earning by clientId, month, year
            const earning = await EarningModel.findOne({
                clientId: invoice.clientId,
                month: invoice.month,
                year: invoice.year
            });

            if (earning) {
                if (earning.status === 'paid') {
                    // Ensure all orders in this earning are marked as paid
                    await OrderModel.updateMany(
                        { _id: { $in: earning.orderIds } },
                        { $set: { isPaid: true } }
                    );
                }
            }
        }

        console.log(`Migration complete. Updated ${updatedOrdersCount} orders.`);
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
