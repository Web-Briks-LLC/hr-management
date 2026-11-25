import fs from 'node:fs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import OrderModel from '../models/order.model.js';

dotenv.config();

/**
 * One-off backfill: orders that are already paid (isPaid) but not completed
 * move to "completed". Orders that are completed, delivered or cancelled are
 * never touched.
 *
 *   npx tsx src/scripts/backfill-paid-orders-complete.ts           # dry run (default)
 *   npx tsx src/scripts/backfill-paid-orders-complete.ts --apply   # writes, and saves a rollback file
 */
const APPLY = process.argv.includes('--apply');
const SKIP = ['completed', 'delivered', 'cancelled'];
const NOTE = 'Order marked completed automatically because payment was received (backfill)';

async function run() {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        console.error('MONGO_URI is not defined.');
        process.exit(1);
    }
    await mongoose.connect(uri);
    const filter = { isPaid: true, status: { $nin: SKIP } };
    const orders = await OrderModel.find(filter)
        .select('_id orderName status createdBy completedAt')
        .lean();

    const byStatus: Record<string, number> = {};
    for (const o of orders) byStatus[o.status] = (byStatus[o.status] || 0) + 1;
    console.log(`Paid orders that are not completed/delivered/cancelled: ${orders.length}`);
    console.log('By current status:', byStatus);

    if (!APPLY) {
        console.log('Dry run only. Nothing was changed. Re-run with --apply to write.');
    } else if (orders.length) {
        const file = `backfill-paid-orders-rollback-${Date.now()}.json`;
        fs.writeFileSync(
            file,
            JSON.stringify(
                orders.map((o) => ({ _id: o._id, previousStatus: o.status, previousCompletedAt: o.completedAt ?? null })),
                null,
                2,
            ),
        );
        console.log(`Rollback info saved to ${file}`);
        const now = new Date();
        const result = await OrderModel.bulkWrite(
            orders.map((o) => ({
                updateOne: {
                    // Re-check the status so a concurrent change is never overwritten.
                    filter: { _id: o._id, isPaid: true, status: { $nin: SKIP } },
                    update: {
                        $set: { status: 'completed', completedAt: o.completedAt ?? now },
                        $push: {
                            timeline: {
                                status: 'completed',
                                timestamp: now,
                                changedBy: o.createdBy,
                                note: NOTE,
                            },
                        },
                    },
                },
            })),
        );
        console.log(`Completed ${result.modifiedCount} orders.`);
    }
    await mongoose.disconnect();
}

run().catch(async (error) => {
    console.error(error);
    await mongoose.disconnect().catch(() => undefined);
    process.exit(1);
});
