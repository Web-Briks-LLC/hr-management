import mongoose from 'mongoose';
import dotenv from 'dotenv';
import OrderModel from '../models/order.model.js';
import EarningModel from '../models/earning.model.js';
import ClientModel from '../models/client.model.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function migrateEarnings() {
    try {
        console.log('Connecting to MongoDB...');
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is not defined in .env');
        }
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        // Get raw collection to access legacy fields
        const earningCollection =
            mongoose.connection.db?.collection('earnings');
        if (!earningCollection)
            throw new Error('Earnings collection not found');

        // Find legacy earnings (those with orderIds array)
        const legacyEarnings = await earningCollection
            .find({
                orderIds: { $exists: true, $ne: [] },
            })
            .toArray();

        console.log(`Found ${legacyEarnings.length} legacy earning groups.`);

        let migratedCount = 0;
        let errorsCount = 0;

        for (const legacy of legacyEarnings) {
            const {
                _id,
                clientId,
                orderIds,
                // Extract potentially available fields safely
                status: legacyStatus,
                isPaid,
                paymentDate,
                paidAt: legacyPaidAt,
                checkNo,
                transactionId,
            } = legacy;

            // Determine status and payment details
            // Prioritize explicit status, then boolean flags
            const isPaidStatus = legacyStatus === 'paid' || isPaid === true;
            const status: 'paid' | 'unpaid' = isPaidStatus ? 'paid' : 'unpaid';

            // Resolve payment date
            const paidAt =
                legacyPaidAt ||
                paymentDate ||
                (isPaidStatus ? new Date() : undefined);

            // Consolidate payment notes for new record
            const paymentNoteParts = [];
            if (checkNo) paymentNoteParts.push(`Check: ${checkNo}`);
            if (transactionId) paymentNoteParts.push(`Trx: ${transactionId}`);
            if (legacy.notes) paymentNoteParts.push(legacy.notes);

            const notes =
                paymentNoteParts.length > 0
                    ? paymentNoteParts.join(' | ')
                    : undefined;

            // Assuming 'createdBy' is available or use a fallback
            const createdBy = legacy.createdBy;

            if (Array.isArray(orderIds)) {
                for (const orderId of orderIds) {
                    try {
                        // Check if order exists
                        const order = await OrderModel.findById(orderId).lean();
                        if (!order) {
                            console.warn(
                                `Order ${orderId} not found for legacy earning ${_id}. Skipping.`
                            );
                            continue;
                        }

                        // Check if earning already exists for this order (1:1)
                        const existing = await EarningModel.findOne({
                            orderId,
                        });
                        if (existing) {
                            // Already migrated or created new
                            continue;
                        }

                        // Fetch client to get currency
                        const client = await ClientModel.findById(
                            clientId
                        ).lean();
                        const currency = (client as any)?.currency || 'USD';

                        // Calculate amounts
                        // If legacy group was paid, we assume full payment for order amount
                        // We might not have fee/tax breakdown per order from legacy group easily
                        // So we set defaults

                        const orderAmount = order.totalPrice || 0;
                        const earningData = {
                            orderId: order._id,
                            clientId,
                            orderName: order.orderName || 'Unknown Order',
                            orderDate: order.orderDate || new Date(),
                            orderAmount,
                            currency,
                            fees: 0,
                            tax: 0,
                            conversionRate: 1,
                            netAmount: orderAmount,
                            amountInBDT: 0,
                            status: status as 'paid' | 'unpaid',
                            paidAt:
                                status === 'paid'
                                    ? paidAt || new Date()
                                    : undefined,
                            notes: notes
                                ? `Migrated: ${notes}`
                                : 'Migrated from legacy system',
                            createdBy: createdBy || order.createdBy, // Fallback to order creator
                        };

                        await EarningModel.create(earningData);
                        migratedCount++;
                    } catch (err) {
                        console.error(
                            `Failed to migrate order ${orderId} from legacy earning ${_id}:`,
                            err
                        );
                        errorsCount++;
                    }
                }
            }

            // Delete legacy document to clean up
            await earningCollection.deleteOne({ _id });
        }

        console.log(`Migration complete.`);
        console.log(`Migrated ${migratedCount} individual earnings.`);
        console.log(`Encountered ${errorsCount} errors.`);
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
}

migrateEarnings();
