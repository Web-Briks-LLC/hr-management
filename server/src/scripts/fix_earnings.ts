import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });
const uri = process.env.MONGO_URI;

async function fixEarnings() {
    try {
        await mongoose.connect(uri!);
        const db = mongoose.connection.db;
        if (!db) throw new Error('DB not connected');

        console.log('Fetching Earnings for 2025...');
        const earnings = await db
            .collection('earnings')
            .find({
                year: 2025,
            })
            .toArray();

        console.log(`Found ${earnings.length} earning documents to process.`);
        let updatedCount = 0;

        for (const earning of earnings) {
            // Skip if no orders
            if (!earning.orderIds || earning.orderIds.length === 0) {
                console.log(`Skipping Earning ${earning._id} (No orders)`);
                continue;
            }

            // Fetch referenced orders
            const orderObjectIds = earning.orderIds.map(
                (id: any) => new mongoose.Types.ObjectId(id),
            );
            const orders = await db
                .collection('orders')
                .find({
                    _id: { $in: orderObjectIds },
                })
                .toArray();

            // Calculate actual sum
            let actualTotal = 0;
            orders.forEach((o) => {
                actualTotal += o.totalPrice || 0;
            });

            // Round to 2 decimal places to avoid floating point issues
            actualTotal = Math.round(actualTotal * 100) / 100;

            const currentTotal = earning.totalAmount;

            // Check if update is needed
            if (Math.abs(currentTotal - actualTotal) > 0.1) {
                const conversionRate = earning.conversionRate || 1;
                const newAmountInBDT =
                    Math.round(actualTotal * conversionRate * 100) / 100;

                // Assuming Net Amount = Total - (Fees + Tax).
                // Using existing Fees/Tax from document.
                const fees = earning.fees || 0;
                const tax = earning.tax || 0;
                const newNetAmount =
                    Math.round((actualTotal - fees - tax) * 100) / 100;

                await db.collection('earnings').updateOne(
                    { _id: earning._id },
                    {
                        $set: {
                            totalAmount: actualTotal,
                            netAmount: newNetAmount,
                            amountInBDT: newAmountInBDT,
                            // Set a flag so we know this was fixed programmatically
                            isFixed: true,
                        },
                    },
                );

                console.log(
                    `Updated Earning ${earning._id}: Old ${currentTotal} -> New ${actualTotal}`,
                );
                updatedCount++;
            }
        }

        console.log('------------------------------------------------');
        console.log(`Process Complete.`);
        console.log(`Total Documents Processed: ${earnings.length}`);
        console.log(`Total Documents Updated: ${updatedCount}`);
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

fixEarnings();
