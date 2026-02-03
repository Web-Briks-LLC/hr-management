import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });
const uri = process.env.MONGO_URI;

/**
 * REBUILD 2025 EARNINGS SCRIPT (MARK AND SWEEP)
 *
 * Strategy:
 * 1. Fetch ALL orders for 2025 from 'orders' collection (Source of Truth).
 * 2. Group orders by ClientID + Month.
 * 3. Track touched/created Earning IDs.
 * 4. Update/Create Earnings based on Orders.
 * 5. DELETE all 2025 Earnings that were NOT touched (Phantom/Legacy check).
 */

async function rebuildEarnings() {
    try {
        await mongoose.connect(uri!);
        const db = mongoose.connection.db;
        if (!db) throw new Error('DB not connected');

        console.log('Fetching ALL Orders for 2025...');

        const startDate = new Date('2025-01-01T00:00:00.000Z');
        const endDate = new Date('2025-12-31T23:59:59.999Z');

        const orders = await db
            .collection('orders')
            .find({
                orderDate: { $gte: startDate, $lte: endDate },
            })
            .toArray();

        console.log(`Found ${orders.length} orders.`);

        // Group by Client + Month
        const groups = new Map<string, any>();

        orders.forEach((order) => {
            const d = new Date(order.orderDate);
            const month = d.getMonth() + 1; // 1-12
            const year = d.getFullYear(); // Should be 2025

            if (year !== 2025) return;

            const clientId = order.clientId?.toString();
            if (!clientId) return;

            const key = `${clientId}-${year}-${month}`;

            if (!groups.has(key)) {
                groups.set(key, {
                    clientId,
                    year,
                    month,
                    orders: [],
                    totalAmount: 0,
                });
            }

            const g = groups.get(key);
            g.orders.push(order._id);
            g.totalAmount += order.totalPrice || 0;
        });

        console.log(`Identified ${groups.size} Client-Month Earning Groups.`);

        let updatedCount = 0;
        let createdCount = 0;
        const touchedIds: mongoose.Types.ObjectId[] = [];

        for (const group of groups.values()) {
            const existing = await db.collection('earnings').findOne({
                clientId: new mongoose.Types.ObjectId(group.clientId),
                year: group.year,
                month: group.month,
            });

            // Round amount
            const totalAmount = Math.round(group.totalAmount * 100) / 100;

            // Conversion
            const conversionRate = existing?.conversionRate || 118;
            const amountInBDT =
                Math.round(totalAmount * conversionRate * 100) / 100;

            const fees = existing?.fees || 0;
            const tax = existing?.tax || 0;
            const netAmount =
                Math.round((totalAmount - fees - tax) * 100) / 100;

            const updateData = {
                orderIds: group.orders,
                totalAmount: totalAmount,
                netAmount: netAmount,
                amountInBDT: amountInBDT,
                conversionRate: conversionRate,
                imageQty: group.orders.length,
                isLegacy: false,
                isFixed: true,
                status: existing?.status || 'paid',
                currency: existing?.currency || 'USD',
                updatedAt: new Date(),
            };

            if (existing) {
                await db
                    .collection('earnings')
                    .updateOne({ _id: existing._id }, { $set: updateData });
                touchedIds.push(existing._id);
                updatedCount++;
            } else {
                const res = await db.collection('earnings').insertOne({
                    clientId: new mongoose.Types.ObjectId(group.clientId),
                    year: group.year,
                    month: group.month,
                    createdAt: new Date(),
                    ...updateData,
                });
                touchedIds.push(res.insertedId);
                createdCount++;
            }
        }

        // SWEEP: Delete earnings in 2025 that were NOT touched (Phantom Inflation)
        const phantomEarnings = await db
            .collection('earnings')
            .find({
                year: 2025,
                _id: { $nin: touchedIds },
            })
            .toArray();

        console.log(
            `Found ${phantomEarnings.length} Phantom/Legacy Earnings (No Orders). Deleting...`,
        );

        if (phantomEarnings.length > 0) {
            const deleteResult = await db.collection('earnings').deleteMany({
                year: 2025,
                _id: { $nin: touchedIds },
            });
            console.log(
                `Deleted ${deleteResult.deletedCount} phantom documents.`,
            );
        }

        console.log('------------------------------------------------');
        console.log(`Rebuild Complete.`);
        console.log(`Updated Documents: ${updatedCount}`);
        console.log(`Created Documents: ${createdCount}`);
        console.log(`Deleted Documents: ${phantomEarnings.length}`);
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

rebuildEarnings();
